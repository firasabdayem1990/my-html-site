import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY })
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  const PLAN_LIMITS = { free: 20, basic: 400, admin: 999999 }

  // Get user
  let userId = null
  let userPlan = 'free'
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (token) {
    try {
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) {
        userId = user.id
        const { data: profile } = await supabase
          .from('profiles').select('plan, is_admin').eq('id', userId).maybeSingle()
        if (profile?.is_admin) userPlan = 'admin'
        else if (profile?.plan === 'basic') userPlan = 'basic'
      }
    } catch(e) {}
  }

  if (!userId) return res.status(401).json({ error: { message: 'Please sign in to search recipes.' } })

  // Extract dish/country for cache
  const msg = req.body.messages?.[0]?.content || ''
  const dishName = (msg.match(/recipe for: "([^"]+)"/)?.[1] || '').toLowerCase().trim()
  const country = msg.match(/Country: ([^.]+)\./)?.[1]?.trim() || 'Lebanon'

  // Check shared cache
  if (dishName) {
    try {
      const { data: cached } = await supabase
        .from('shared_recipe_cache')
        .select('recipe_data')
        .eq('dish_name', dishName)
        .eq('country', country)
        .maybeSingle()
      if (cached) {
        await supabase.from('shared_recipe_cache')
          .update({ search_count: supabase.rpc('increment', { x: 1 }) })
          .eq('dish_name', dishName).eq('country', country).catch(() => {})
        return res.json({ content: [{ type: 'text', text: JSON.stringify(cached.recipe_data) }] })
      }
    } catch(e) {}
  }

  // Check quota
  const month = new Date().toISOString().slice(0, 7)
  const limit = PLAN_LIMITS[userPlan] || 20
  try {
    const { data: usage } = await supabase.from('usage')
      .select('recipes').eq('user_id', userId).eq('month', month).maybeSingle()
    const current = usage?.recipes || 0
    if (userPlan !== 'admin' && current >= limit) {
      return res.status(429).json({
        error: { message: userPlan === 'free'
          ? `Free plan: ${limit} recipes/month used. Upgrade to Basic ($6.99/mo) for 400!`
          : `Monthly limit of ${limit} recipes reached. Resets next month.` }
      })
    }
  } catch(e) {}

  // Call AI
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: req.body.max_tokens || 3000,
      messages: req.body.messages
    })

    // Save to cache
    if (dishName && response.content?.[0]?.text) {
      try {
        const text = response.content[0].text.replace(/^```json\s*/i,'').replace(/\s*```$/,'').trim()
        const fb = text.indexOf('{'), lb = text.lastIndexOf('}')
        const data = JSON.parse(text.substring(fb, lb+1))
        await supabase.from('shared_recipe_cache').upsert(
          { dish_name: dishName, country, recipe_data: data, search_count: 1 },
          { onConflict: 'dish_name,country' }
        )
      } catch(e) {}
    }

    // Update usage
    try {
      const { data: usage } = await supabase.from('usage')
        .select('recipes').eq('user_id', userId).eq('month', month).maybeSingle()
      await supabase.from('usage').upsert(
        { user_id: userId, month, recipes: (usage?.recipes || 0) + 1 },
        { onConflict: 'user_id,month' }
      )
    } catch(e) {}

    return res.json(response)
  } catch(err) {
    return res.status(500).json({ error: { message: err.message } })
  }
}
