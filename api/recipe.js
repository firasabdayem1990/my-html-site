// api/recipe.js — recipe fetcher with cache + plan limits
import { createClient } from '@supabase/supabase-js'

const PLAN_LIMITS = {
  free: 20,
  basic: 400,
  admin: 999999
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!process.env.ANTHROPIC_KEY) return res.status(500).json({ error: 'ANTHROPIC_KEY not configured' })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY
  const month = new Date().toISOString().slice(0, 7)
  const token = req.headers['authorization']?.replace('Bearer ', '')

  let userId = null
  let userPlan = 'free'

  if (token && supabaseUrl && supabaseKey) {
    try {
      const sb = createClient(supabaseUrl, supabaseKey)
      const { data: { user } } = await sb.auth.getUser(token)
      if (user) {
        userId = user.id
        const { data: profile } = await sb.from('profiles')
          .select('plan, is_admin').eq('id', user.id).maybeSingle()
        if (profile?.is_admin) userPlan = 'admin'
        else if (profile?.plan === 'basic') userPlan = 'basic'
      }
    } catch(e) { console.warn('Auth failed:', e.message) }
  }

  if (!userId) {
    return res.status(401).json({ error: { message: 'Please sign in to search recipes.' } })
  }

  const sb = createClient(supabaseUrl, supabaseKey)

  // Extract dish/country for cache key
  const msg = req.body.messages?.[0]?.content || ''
  const dishName = (msg.match(/recipe for: "([^"]+)"/)?.[1] || '').toLowerCase().trim()
  const country = msg.match(/Country: ([^.]+)\./)?.[1]?.trim() || 'Lebanon'

  // ── STEP 1: Check shared cache ──
  if (dishName && supabaseUrl && supabaseKey) {
    try {
      const { data: cached } = await sb.from('shared_recipe_cache')
        .select('recipe_data').eq('dish_name', dishName).eq('country', country).maybeSingle()
      if (cached) {
        console.log(`Cache hit: ${dishName} in ${country}`)
        return res.status(200).json({ content: [{ type: 'text', text: JSON.stringify(cached.recipe_data) }] })
      }
    } catch(e) { console.warn('Cache check failed:', e.message) }
  }

  // ── STEP 2: Check quota ──
  const limit = PLAN_LIMITS[userPlan] || 20
  if (userPlan !== 'admin') {
    try {
      const { data: usage } = await sb.from('usage')
        .select('recipes').eq('user_id', userId).eq('month', month).maybeSingle()
      const current = usage?.recipes || 0
      if (current >= limit) {
        return res.status(429).json({
          error: userPlan === 'free'
            ? `Free plan limit reached (${limit} recipes/month). Upgrade to Basic ($6.99/mo) for 400!`
            : `Monthly limit reached (${limit} recipes). Resets next month.`
        })
      }
    } catch(e) { console.warn('Quota check failed:', e.message) }
  }

  // ── STEP 3: Call Anthropic ──
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    })
    const data = await response.json()
    if (!response.ok) return res.status(response.status).json(data)

    // ── STEP 4: Save to shared cache ──
    if (dishName && supabaseUrl && supabaseKey && data.content?.[0]?.text) {
      try {
        const text = data.content[0].text.replace(/^```json\s*/i,'').replace(/\s*```$/,'').trim()
        const fb = text.indexOf('{'), lb = text.lastIndexOf('}')
        const recipeData = JSON.parse(text.substring(fb, lb+1))
        await sb.from('shared_recipe_cache').upsert(
          { dish_name: dishName, country, recipe_data: recipeData, search_count: 1 },
          { onConflict: 'dish_name,country' }
        )
      } catch(e) { console.warn('Cache save failed:', e.message) }
    }

    // ── STEP 5: Update usage ──
    try {
      const { data: usage } = await sb.from('usage')
        .select('recipes').eq('user_id', userId).eq('month', month).maybeSingle()
      await sb.from('usage').upsert(
        { user_id: userId, month, recipes: (usage?.recipes || 0) + 1 },
        { onConflict: 'user_id,month' }
      )
    } catch(e) { console.warn('Usage update failed:', e.message) }

    return res.status(200).json(data)
  } catch(err) {
    return res.status(500).json({ error: err.message })
  }
}
