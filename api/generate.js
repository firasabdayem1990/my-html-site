// api/generate.js — Vercel serverless function
// Anthropic key hidden server-side + per-user usage limits

import { createClient } from '@supabase/supabase-js';

const FREE_LIMIT = 10; // generations per month per user

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.ANTHROPIC_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_KEY not configured' });
  }

  // ── USAGE LIMITS ──
  // Get user token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader?.replace('Bearer ', '');

  if (token && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    try {
      // Use service key to bypass RLS
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );

      // Get user from token
      const { data: { user }, error: authErr } = await sb.auth.getUser(token);

      if (user && !authErr) {
        const month = new Date().toISOString().slice(0, 7); // '2026-05'

        // Get current usage
        const { data: usage } = await sb
          .from('usage')
          .select('generations')
          .eq('user_id', user.id)
          .eq('month', month)
          .maybeSingle();

        const count = usage?.generations || 0;

        // Check limit
        if (count >= FREE_LIMIT) {
          return res.status(429).json({
            error: `Monthly limit reached (${FREE_LIMIT} generations/month). You've used ${count}/${FREE_LIMIT} this month.`
          });
        }

        // Increment usage
        await sb.from('usage').upsert({
          user_id: user.id,
          month,
          generations: count + 1
        }, { onConflict: 'user_id,month' });
      }
    } catch (e) {
      console.warn('Usage tracking failed:', e.message);
      // Don't block the request if usage tracking fails
    }
  }

  // ── CALL ANTHROPIC ──
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
