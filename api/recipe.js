// api/recipe.js — recipe fetcher with usage tracking

import { createClient } from '@supabase/supabase-js';

const FREE_RECIPE_LIMIT = 50; // recipe fetches per month

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.ANTHROPIC_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_KEY not configured' });
  }

  // Track recipe usage (lighter limit)
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (token && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    try {
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      const { data: { user } } = await sb.auth.getUser(token);
      if (user) {
        const month = new Date().toISOString().slice(0, 7);
        const { data: usage } = await sb.from('usage').select('recipes').eq('user_id', user.id).eq('month', month).maybeSingle();
        const count = usage?.recipes || 0;
        if (count >= FREE_RECIPE_LIMIT) {
          return res.status(429).json({ error: `Recipe limit reached (${FREE_RECIPE_LIMIT}/month).` });
        }
        await sb.from('usage').upsert({ user_id: user.id, month, recipes: count + 1 }, { onConflict: 'user_id,month' });
      }
    } catch (e) { console.warn('Usage tracking failed:', e.message); }
  }

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
