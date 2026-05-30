// api/generate.js — meal plan generator with plan limits
import { createClient } from '@supabase/supabase-js'

const PLAN_LIMITS = {
  free: 1,
  basic: 30,
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
    return res.status(401).json({ error: { message: 'Please sign in to generate meal plans.' } })
  }

  const sb = createClient(supabaseUrl, supabaseKey)
  const limit = PLAN_LIMITS[userPlan] || 1

  // Check quota
  if (userPlan !== 'admin') {
    try {
      const { data: usage } = await sb.from('usage')
        .select('generations').eq('user_id', userId).eq('month', month).maybeSingle()
      const current = usage?.generations || 0
      if (current >= limit) {
        return res.status(429).json({
          error: { message: userPlan === 'free'
            ? `Free plan limit reached (${limit} meal plan/month). Upgrade to Basic ($6.99/mo) for 30 plans!`
            : `Monthly limit reached (${limit} plans). Resets next month.` }
        })
      }
    } catch(e) { console.warn('Quota check failed:', e.message) }
  }

  // Call Anthropic
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

    // Update usage
    try {
      const { data: usage } = await sb.from('usage')
        .select('generations').eq('user_id', userId).eq('month', month).maybeSingle()
      await sb.from('usage').upsert(
        { user_id: userId, month, generations: (usage?.generations || 0) + 1 },
        { onConflict: 'user_id,month' }
      )
    } catch(e) { console.warn('Usage update failed:', e.message) }

    return res.status(200).json(data)
  } catch(err) {
    return res.status(500).json({ error: { message: err.message } })
  }
}
