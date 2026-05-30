import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY })
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const PLAN_LIMITS = {
  free: { plans: 1 },
  basic: { plans: 30 },
  admin: { plans: 999999 }
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
    return res.status(401).json({ error: { message: 'Please sign in to generate meal plans.' } })
  }

  // ── Check quota ──
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  const limit = PLAN_LIMITS[userPlan]?.plans || 1

  const { data: usage } = await supabase
    .from('usage')
    .select('generations')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle()

  const current = usage?.generations || 0

  if (userPlan !== 'admin' && current >= limit) {
    return res.status(429).json({
      error: {
        message: userPlan === 'free'
          ? `Free plan limit reached (${limit} meal plan/month). Upgrade to Basic ($6.99/mo) for 30 plans/month!`
          : `Monthly limit reached (${limit} plans). Resets next month.`
      }
    })
  }

  // ── Call AI ──
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: req.body.max_tokens || 16000,
      messages: req.body.messages
    })

    // ── Update usage ──
    await supabase.from('usage').upsert({
      user_id: userId,
      month,
      generations: current + 1
    }, { onConflict: 'user_id,month' })

    return res.json(response)
  } catch(err) {
    return res.status(500).json({ error: { message: err.message } })
  }
}
