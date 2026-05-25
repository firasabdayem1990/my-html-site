// src/ai.js — All AI calls go through your backend (key never exposed)

const callAPI = async (endpoint, body) => {
  const res = await fetch(`/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `HTTP ${res.status}`)
  }
  const data = await res.json()
  return data.content.map(b => b.text || '').join('')
}

const parseJSON = (raw) => {
  let str = raw.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```$/, '')
    .trim()
  const fb = str.indexOf('{'), lb = str.lastIndexOf('}')
  if (fb !== -1 && lb !== -1) str = str.substring(fb, lb + 1)
  return JSON.parse(str)
}

// ── GENERATE MEAL PLAN ──
export async function generateMealPlan({ budget, people, currency, country, diet, health, restrictions, pantry, cuisines, calTarget }) {
  const restrictionLine = restrictions
    ? `CRITICAL: STRICT allergies/restrictions — NEVER include: ${restrictions}. Non-negotiable.`
    : 'No restrictions.'

  const calLine = calTarget > 0
    ? `CALORIE TARGET: ~${calTarget} cal/day. Breakfast ~${Math.round(calTarget * 0.25)} kcal, Lunch ~${Math.round(calTarget * 0.35)} kcal, Dinner ~${Math.round(calTarget * 0.35)} kcal. Add "calories" field (integer kcal/serving) to each meal.`
    : 'No calorie target. Still add a realistic "calories" field to each meal.'

  const cuisineInstruction = cuisines.length
    ? `Cuisines: ${cuisines.join(', ')}. Rotate authentically. Include cuisine name per meal.`
    : 'Use varied global cuisines.'

  const pantryStr = pantry.length
    ? pantry.map(p => `${p.name} (expires: ${p.exp})`).join(', ')
    : 'none'

  const prompt = `Generate a 7-day meal plan and shopping list as JSON only. No markdown, no backticks.\n\n`
    + `HARD BUDGET LIMIT: Total of ALL estimatedCost values MUST be under ${currency}${budget}. Choose affordable ingredients.\n\n`
    + `${restrictionLine}\n\n${calLine}\n\n`
    + `Profile: ${people} people, country: ${country}, diet: ${diet}, health: ${health.join(', ') || 'none'}, pantry to use first: ${pantryStr}. ${cuisineInstruction}\n\n`
    + `Keep meal names under 8 words. Descriptions under 10 words. Max 8 items per shopping category.\n\n`
    + `Return exactly this JSON structure with all 7 days:\n`
    + `{"summary":{"totalEstimatedCost":0,"savingsPercent":0,"ingredientsReused":0,"wasteReductionTip":"one sentence"},"cuisinesUsed":["c1"],"weekPlan":[`
    + `{"day":"Monday","cuisine":"X","breakfast":{"name":"","desc":"","cuisine":"","calories":0},"lunch":{"name":"","desc":"","cuisine":"","calories":0},"dinner":{"name":"","desc":"","cuisine":"","calories":0}}`
    + ` /* repeat for all 7 days */`
    + `],"shoppingList":[{"category":"Produce","items":[{"name":"","qty":"","estimatedCost":0,"multiUse":true}]},{"category":"Proteins","items":[]},{"category":"Dairy & Eggs","items":[]},{"category":"Grains & Legumes","items":[]},{"category":"Pantry Staples","items":[]},{"category":"Other","items":[]}]}`

  const raw = await callAPI('generate', {
    model: 'claude-sonnet-4-5',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }]
  })

  return parseJSON(raw)
}

// ── FETCH RECIPE ──
export async function fetchRecipe({ name, cuisine, desc, people, diet, restrictions, country, currency }) {
  const prompt = `Write a detailed authentic recipe for: "${name}"${cuisine ? ` (${cuisine})` : ''}${desc ? ` — ${desc}` : ''}.`
    + ` Serves ${people}. Diet: ${diet}. Restrictions: ${restrictions || 'none'}. Country: ${country}. Currency: ${currency}.`
    + ` Return JSON only, no markdown: {"prepTime":"","cookTime":"","difficulty":"","calories":0,"pricePerServing":0,"ingredients":[{"qty":"","name":"","note":""}],"steps":[""],"tip":""}.`
    + ` pricePerServing = realistic cost in ${currency} to make ONE serving at home in ${country} using local prices. calories = integer kcal/serving.`

  const raw = await callAPI('recipe', {
    model: 'claude-sonnet-4-5',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }]
  })

  return parseJSON(raw)
}

// ── SEARCH RECIPE ──
export async function searchRecipe({ query, people, diet, restrictions, country, currency }) {
  const prompt = `Recipe request: "${query}". Serves ${people}. Diet: ${diet}. Restrictions: ${restrictions || 'none'}. Country: ${country}. Currency: ${currency}.`
    + ` Return JSON only, no markdown: {"dishName":"","cuisine":"","prepTime":"","cookTime":"","difficulty":"","servings":${people},"pricePerServing":0,"calories":0,"ingredients":[{"qty":"","name":"","note":""}],"steps":[""],"tip":"","funFact":""}.`
    + ` pricePerServing = realistic cost in ${currency} to make ONE serving at home in ${country}. calories = integer kcal/serving.`

  const raw = await callAPI('recipe', {
    model: 'claude-sonnet-4-5',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }]
  })

  return parseJSON(raw)
}
