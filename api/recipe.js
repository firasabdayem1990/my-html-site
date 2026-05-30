import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY })
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const PLAN_LIMITS = {
  free: { recipes: 20 },
  basic: { recipes: 400 },
  admin: { recipes: 999999 }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Get user from auth token
  let userId = null
  let userPlan = 'free'
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user) {
      userId = user.id
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, is_admin')
        .eq('id', userId)
        .maybeSingle()
      if (profile?.is_admin) userPlan = 'admin'
      else if (profile?.plan === 'basic') userPlan = 'basic'
    }
  }

  if (!userId) {
    return res.status(401).json({ error: { message: 'Please sign in to search recipes.' } })
  }

  const { messages } = req.body
  const userMessage = messages?.[0]?.content || ''

  // Extract dish name and country for cache key
  const dishMatch = userMessage.match(/recipe for: "([^"]+)"/)
  const countryMatch = userMessage.match(/Country: ([^.]+)\./)
  const dishName = dishMatch?.[1]?.toLowerCase().trim() || ''
  const country = countryMatch?.[1]?.trim() || 'Lebanon'

  // ── STEP 1: Check shared cache ──
  if (dishName) {
    const { data: cached } = await supabase
      .from('shared_recipe_cache')
      .select('recipe_data, search_count')
      .eq('dish_name', dishName)
      .eq('country', country)
      .maybeSingle()

    if (cached) {
      console.log(`Cache hit: ${dishName} in ${country}`)
      await supabase.from('shared_recipe_cache')
        .update({ search_count: (cached.search_count || 1) + 1 })
        .eq('dish_name', dishName)
        .eq('country', country)
      return res.json({
        content: [{ type: 'text', text: JSON.stringify(cached.recipe_data) }],
        fromCache: true
      })
    }
  }

  // ── STEP 2: Check quota ──
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  const limit = PLAN_LIMITS[userPlan]?.recipes || 20

  const { data: usage } = await supabase
    .from('usage')
    .select('recipes')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle()

  const currentRecipes = usage?.recipes || 0

  if (userPlan !== 'admin' && currentRecipes >= limit) {
    return res.status(429).json({
      error: {
        message: userPlan === 'free'
          ? `Free plan limit reached (${limit} recipes/month). Upgrade to Basic ($6.99/mo) for 400 recipes!`
          : `Monthly limit reached (${limit} recipes). Resets next month.`
      }
    })
  }

  // ── STEP 3: Call AI ──
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: req.body.max_tokens || 3000,
      messages: req.body.messages
    })

    // ── STEP 4: Save to shared cache ──
    if (dishName && response.content?.[0]?.text) {
      try {
        const clean = response.content[0].text
          .replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
        const fb = clean.indexOf('{'), lb = clean.lastIndexOf('}')
        const recipeData = JSON.parse(clean.substring(fb, lb+1))
        await supabase.from('shared_recipe_cache').upsert({
          dish_name: dishName,
          country,
          recipe_data: recipeData,
          search_count: 1
        }, { onConflict: 'dish_name,country' })
      } catch(e) {
        console.log('Cache save failed:', e.message)
      }
    }

    // ── STEP 5: Update usage ──
    await supabase.from('usage').upsert({
      user_id: userId,
      month,
      recipes: currentRecipes + 1
    }, { onConflict: 'user_id,month' })

    return res.json(response)
  } catch(err) {
    return res.status(500).json({ error: { message: err.message } })
  }
}
