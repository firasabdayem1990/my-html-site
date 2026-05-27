// src/ai.js — All AI calls go through your backend (key never exposed)
import { supabase } from './supabase.js'

const callAPI = async (endpoint, body) => {
  let token = null
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession()
    token = session?.access_token || null
  }

  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`/api/${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || err.error || `HTTP ${res.status}`)
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

const COUNTRY_PRICE_CONTEXT = {
  'Lebanon': 'Lebanon: groceries are expensive due to import dependency & inflation. Chicken ~$3/kg, vegetables ~$1-2/kg, lentils ~$1.5/kg, bread ~$0.5/loaf. Budget carefully.',
  'United States': 'USA: chicken breast ~$7/kg, vegetables ~$2-4/kg, pasta ~$2/500g, eggs ~$4/dozen, rice ~$3/kg.',
  'United Kingdom': 'UK: chicken ~£5/kg, vegetables ~£1-3/kg, pasta ~£1.5/500g, eggs ~£2.5/6-pack, rice ~£2/kg.',
  'France': 'France: poulet ~€4/kg, légumes ~€1.5-3/kg, pâtes ~€1.2/500g, oeufs ~€2.5/6, riz ~€2/kg.',
  'Germany': 'Germany: Hähnchen ~€5/kg, Gemüse ~€1.5-3/kg, Nudeln ~€1.5/500g, Eier ~€2/6-pack, Reis ~€2/kg.',
  'Italy': 'Italy: pollo ~€4/kg, verdure ~€1.5-3/kg, pasta ~€1.2/500g, uova ~€2.5/6, riso ~€2/kg.',
  'UAE': 'UAE: chicken ~AED 20/kg, vegetables ~AED 5-10/kg, rice ~AED 10/kg, eggs ~AED 8/12-pack, bread ~AED 3/loaf.',
  'Saudi Arabia': 'Saudi Arabia: chicken ~SAR 15/kg, vegetables ~SAR 5-10/kg, rice ~SAR 8/kg, eggs ~SAR 6/12-pack.',
  'Jordan': 'Jordan: chicken ~JOD 4/kg, vegetables ~JOD 0.5-1.5/kg, rice ~JOD 1.5/kg, eggs ~JOD 1.2/12-pack.',
  'Egypt': 'Egypt: chicken ~EGP 100/kg, vegetables ~EGP 10-30/kg, rice ~EGP 25/kg, eggs ~EGP 50/12-pack.',
  'Turkey': 'Turkey: tavuk ~TRY 80/kg, sebze ~TRY 15-40/kg, pirinç ~TRY 50/kg, yumurta ~TRY 30/12-pack.',
  'India': 'India: chicken ~INR 250/kg, vegetables ~INR 30-80/kg, rice ~INR 60/kg, eggs ~INR 90/12-pack, lentils ~INR 120/kg.',
  'Japan': 'Japan: chicken ~JPY 600/kg, vegetables ~JPY 200-400/kg, rice ~JPY 400/kg, eggs ~JPY 250/10-pack.',
  'China': 'China: chicken ~CNY 25/kg, vegetables ~CNY 5-15/kg, rice ~CNY 10/kg, eggs ~CNY 15/12-pack.',
  'South Korea': 'South Korea: chicken ~KRW 8000/kg, vegetables ~KRW 2000-5000/kg, rice ~KRW 5000/kg.',
  'Thailand': 'Thailand: chicken ~THB 80/kg, vegetables ~THB 30-60/kg, rice ~THB 40/kg, eggs ~THB 50/12-pack.',
  'Mexico': 'Mexico: pollo ~MXN 80/kg, verduras ~MXN 20-50/kg, arroz ~MXN 30/kg, huevos ~MXN 45/12-pack.',
  'Brazil': 'Brazil: frango ~BRL 15/kg, legumes ~BRL 5-15/kg, arroz ~BRL 8/kg, ovos ~BRL 12/12-pack.',
  'Australia': 'Australia: chicken ~AUD 8/kg, vegetables ~AUD 3-6/kg, pasta ~AUD 2/500g, eggs ~AUD 5/12-pack.',
  'Canada': 'Canada: chicken ~CAD 10/kg, vegetables ~CAD 3-6/kg, pasta ~CAD 2.5/500g, eggs ~CAD 5/12-pack.',
  'Morocco': 'Morocco: poulet ~MAD 30/kg, légumes ~MAD 5-15/kg, riz ~MAD 15/kg, oeufs ~MAD 12/12-pack.',
  'Latvia': 'Latvia: chicken ~€4/kg, vegetables ~€1.5-3/kg, pasta ~€1.3/500g, eggs ~€2/10-pack, rye bread ~€1.5/loaf.',
  'Poland': 'Poland: kurczak ~PLN 15/kg, warzywa ~PLN 3-8/kg, makaron ~PLN 3.5/500g, jajka ~PLN 8/10-pack.',
  'Sweden': 'Sweden: kyckling ~SEK 60/kg, grönsaker ~SEK 15-35/kg, pasta ~SEK 12/500g, ägg ~SEK 30/12-pack.',
  'Norway': 'Norway: kylling ~NOK 80/kg, grønnsaker ~NOK 20-50/kg, pasta ~NOK 18/500g, egg ~NOK 40/12-pack.',
  'Switzerland': 'Switzerland: Poulet ~CHF 12/kg, Gemüse ~CHF 3-8/kg, Pasta ~CHF 2.5/500g, Eier ~CHF 4/6-pack.',
}

const getPriceContext = (country) => {
  return COUNTRY_PRICE_CONTEXT[country] || `${country}: use realistic local supermarket prices for this country. Research typical costs for staple ingredients in ${country}.`
}

export async function generateMealPlan({ budget, adults, kids, people, currency, country, diet, health, restrictions, pantry, cuisines, calTarget }) {
  const restrictionLine = restrictions
    ? `CRITICAL: STRICT allergies/restrictions — NEVER include: ${restrictions}. Non-negotiable.`
    : 'No restrictions.'

  const calLine = calTarget > 0
    ? `CALORIE TARGET per adult: ~${calTarget} kcal/day. Breakdown: Breakfast ~${Math.round(calTarget * 0.25)} kcal, Lunch ~${Math.round(calTarget * 0.35)} kcal, Dinner ~${Math.round(calTarget * 0.35)} kcal. Add "calories" field (integer kcal/serving for ONE adult) to each meal. Be precise — vary meals between ${Math.round(calTarget*0.85)} and ${Math.round(calTarget*1.05)} daily total.`
    : 'No calorie target. Add a realistic "calories" field (integer kcal/serving for one adult) to each meal anyway.'

  const cuisineInstruction = cuisines.length
    ? `Cuisines: ${cuisines.join(', ')}. Rotate authentically across the week. Include cuisine name per meal.`
    : 'Use varied global cuisines, rotating daily.'

  const pantryStr = pantry.length
    ? pantry.map(p => `${p.name} (expires: ${p.exp})`).join(', ')
    : 'none'

  const effectivePortions = adults + (kids * 0.5)
  const kidsLine = kids > 0
    ? `Household: ${adults} adults + ${kids} children. Kids get HALF adult portions (smaller servings, milder seasoning, no spicy food for kids). Adjust all ingredient quantities accordingly. Effective portions = ${effectivePortions}.`
    : `Household: ${adults} adults. Total: ${people} people.`

  const priceContext = getPriceContext(country)
  const totalMeals = 7 * 3
  const maxCostPerMealPerPortion = (budget * 0.92) / (totalMeals * effectivePortions)

  const prompt = `Generate a 7-day meal plan and shopping list as JSON only. No markdown, no backticks, no extra text.

BUDGET RULES — NON-NEGOTIABLE:
- Total budget: ${currency}${budget} for the entire week
- HARD LIMIT: Total of ALL shoppingList estimatedCost values MUST be UNDER ${currency}${budget * 0.95} (leave 5% buffer)
- Use REAL local supermarket prices for ${country}: ${priceContext}
- Max cost per meal per effective portion: ~${currency}${maxCostPerMealPerPortion.toFixed(2)}
- Prioritize affordable staples: lentils, rice, eggs, seasonal vegetables, chicken thighs over breasts
- Reuse ingredients across multiple meals to reduce waste and cost
- VERIFY: sum all estimatedCost values before finalizing — if total exceeds ${currency}${budget}, reduce quantities or swap expensive ingredients

${restrictionLine}

${calLine}

${kidsLine}

Country: ${country}. Diet: ${diet}. Health modes: ${health.join(', ') || 'none'}.
Pantry items already owned (do not buy these): ${pantryStr}.
${cuisineInstruction}

Rules:
- Meal names under 8 words. Descriptions under 10 words.
- Max 8 items per shopping category
- Kids meals: no chili, no very spicy dishes, adjust seasoning
- Each shopping item must have a realistic price in ${currency} for ${country}

Return ONLY this JSON structure with all 7 days filled:
{"summary":{"totalEstimatedCost":0,"savingsPercent":0,"ingredientsReused":0,"wasteReductionTip":""},"cuisinesUsed":[],"weekPlan":[{"day":"Monday","cuisine":"","breakfast":{"name":"","desc":"","cuisine":"","calories":0},"lunch":{"name":"","desc":"","cuisine":"","calories":0},"dinner":{"name":"","desc":"","cuisine":"","calories":0}} /* repeat Tuesday-Sunday */],"shoppingList":[{"category":"Produce","items":[{"name":"","qty":"","estimatedCost":0,"multiUse":true}]},{"category":"Proteins","items":[]},{"category":"Dairy & Eggs","items":[]},{"category":"Grains & Legumes","items":[]},{"category":"Pantry Staples","items":[]},{"category":"Other","items":[]}]}`

  const raw = await callAPI('generate', {
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }]
  })
  return parseJSON(raw)
}

export async function fetchRecipe({ name, cuisine, desc, people, adults, kids, diet, restrictions, country, currency }) {
  const effectivePortions = (adults || people) + ((kids || 0) * 0.5)
  const kidsNote = (kids || 0) > 0
    ? ` Note: ${kids} children present — adjust spice levels and portion sizes accordingly (kids get half portions).`
    : ''
  const priceContext = getPriceContext(country)

  const prompt = `Write a detailed authentic recipe for: "${name}"${cuisine ? ` (${cuisine})` : ''}${desc ? ` — ${desc}` : ''}.`
    + ` Serves ${adults || people} adults${(kids||0)>0 ? ` + ${kids} children` : ''} (${effectivePortions} effective portions).`
    + ` Diet: ${diet}. Restrictions: ${restrictions || 'none'}. Country: ${country}. Currency: ${currency}.${kidsNote}`
    + ` Prices: ${priceContext}`
    + ` Return JSON only, no markdown: {"prepTime":"","cookTime":"","difficulty":"","calories":0,"pricePerServing":0,"ingredients":[{"qty":"","name":"","note":""}],"steps":[""],"tip":"","history":""}.`
    + ` calories = precise integer kcal for ONE adult serving (use real nutrition data).`
    + ` pricePerServing = realistic cost in ${currency} for ALL ingredients to make this dish in ${country} (total shopping cost).`
    + ` history = 2-3 engaging sentences about the origin and cultural story of this dish. Make it fascinating and educational.`

  const raw = await callAPI('recipe', {
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }]
  })
  return parseJSON(raw)
}

export async function searchRecipe({ query, people, adults, kids, diet, restrictions, country, currency }) {
  const effectivePortions = (adults || people) + ((kids || 0) * 0.5)
  const priceContext = getPriceContext(country)

  const prompt = `Recipe: "${query}". Serves ${adults || people} adults${(kids||0)>0 ? ` + ${kids} children` : ''} (${effectivePortions} effective portions). Diet: ${diet}. Restrictions: ${restrictions || 'none'}. Country: ${country}. Currency: ${currency}.`
    + ` Prices: ${priceContext}`
    + ` Return JSON only: {"dishName":"","cuisine":"","prepTime":"","cookTime":"","difficulty":"","servings":${people},"pricePerServing":0,"calories":0,"ingredients":[{"qty":"","name":"","note":""}],"steps":[""],"tip":"","history":"","funFact":""}.`
    + ` calories = precise integer kcal/serving for ONE adult (use real nutrition data).`
    + ` pricePerServing = realistic TOTAL cost in ${currency} to buy ALL ingredients to make this dish from scratch in ${country}.`
    + ` history = 2-3 engaging sentences about the origin and cultural story of this dish. Make it fascinating and educational.`

  const raw = await callAPI('recipe', {
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }]
  })
  return parseJSON(raw)
}
