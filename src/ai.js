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

// ── COUNTRY PRICE CONTEXT ─────────────────────────────────────────────────────
const COUNTRY_PRICE_CONTEXT = {
  'Lebanon': `Lebanon (USD 2025): Expensive due to imports & inflation.
PROTEINS: chicken breast $6-8/kg, ground beef $8-10/kg, fish $8-15/kg, eggs $3-4/dozen.
DAIRY: akkawi $6-8/kg, halloumi $5-7/kg, labneh $3-4/kg, butter $3-4/250g, milk $2-3/L.
PRODUCE: tomatoes $1.5-2.5/kg, cucumbers $1-1.5/kg, onions $1-1.5/kg, lemons $2-3/kg.
GRAINS: rice $2-3/kg, lentils $2-2.5/kg, pasta $2-3/500g, pita $1-1.5/pack.
PANTRY: olive oil $8-12/L, tahini $4-6/jar, chickpeas $2-3/can.
Typical dish total: $8-20. Never underestimate Lebanon prices.`,
  'United States': `USA (USD 2025): chicken $7-9/kg, beef $8-10/kg, salmon $15-20/kg, eggs $4-6/dozen. Cheddar $8-10/kg, milk $1.5-2/L. Tomatoes $3-4/kg, avocado $1.5-2 each. Rice $2-3/kg, pasta $2-3/500g, bread $3-4/loaf. Olive oil $8-12/500ml. Typical dish: $10-25.`,
  'United Kingdom': `UK (GBP 2025): chicken £6-8/kg, beef £7-9/kg, salmon £12-15/kg, eggs £2-3/6-pack. Cheddar £7-9/kg, milk £1.2-1.5/L. Tomatoes £2-3/kg. Rice £1.5-2/kg, pasta £1.5-2/500g, bread £1.5-2/loaf. Olive oil £5-7/500ml. Typical dish: £8-20.`,
  'France': `France (EUR 2025): poulet €5-7/kg, boeuf €8-10/kg, saumon €15-18/kg, oeufs €3-4/12. Fromage €6-10/kg, beurre €3-4/250g, lait €1-1.5/L. Tomates €2-3/kg. Riz €2-3/kg, pâtes €1.5-2/500g, pain €1.5-2.5/baguette. Typical dish: €8-20.`,
  'Germany': `Germany (EUR 2025): Hähnchen €5-7/kg, Hackfleisch €7-9/kg, Lachs €14-18/kg, Eier €3-4/10. Käse €7-10/kg, Butter €2.5-3.5/250g, Milch €1-1.5/L. Tomaten €2-3/kg. Reis €2-3/kg, Nudeln €1.5-2/500g, Brot €2-3. Typical dish: €8-18.`,
  'Italy': `Italy (EUR 2025): pollo €5-7/kg, manzo €9-12/kg, uova €3-4/6. Mozzarella €3-5/250g, parmigiano €15-20/kg, latte €1.2-1.8/L. Pomodori €2-3/kg. Riso €2-3/kg, pasta €1.5-2.5/500g. Olio d'oliva €8-12/L. Typical dish: €8-20.`,
  'Spain': `Spain (EUR 2025): pollo €4-6/kg, ternera €8-11/kg, huevos €2.5-3.5/12. Manchego €12-16/kg, leche €1-1.5/L. Tomates €2-3/kg. Arroz €1.5-2.5/kg, pasta €1.5-2/500g. Aceite de oliva €6-10/L. Typical dish: €7-18.`,
  'UAE': `UAE (AED 2025): chicken AED 25-35/kg, beef AED 35-45/kg, fish AED 40-70/kg, eggs AED 12-15/12. Cheddar AED 30-40/kg, milk AED 6-8/L. Tomatoes AED 5-8/kg. Rice AED 8-12/kg, pasta AED 8-12/500g. Olive oil AED 30-50/L. Typical dish: AED 40-120.`,
  'Saudi Arabia': `Saudi Arabia (SAR 2025): chicken SAR 20-28/kg, beef SAR 35-45/kg, fish SAR 35-60/kg, eggs SAR 10-14/12. Cheese SAR 25-35/kg, milk SAR 5-7/L. Tomatoes SAR 4-7/kg. Rice SAR 6-10/kg. Olive oil SAR 25-40/L. Typical dish: SAR 35-100.`,
  'Jordan': `Jordan (JOD 2025): chicken JOD 3-4.5/kg, beef JOD 5-7/kg, eggs JOD 1.5-2/12. White cheese JOD 4-6/kg, labneh JOD 2-3/kg, milk JOD 0.8-1.2/L. Tomatoes JOD 0.5-1/kg. Rice JOD 1-1.8/kg, lentils JOD 1-1.5/kg. Olive oil JOD 4-7/L. Typical dish: JOD 4-15.`,
  'Egypt': `Egypt (EGP 2025): chicken EGP 120-160/kg, beef EGP 200-280/kg, eggs EGP 80-100/12. White cheese EGP 80-120/kg, milk EGP 20-30/L. Tomatoes EGP 15-30/kg. Rice EGP 30-50/kg, lentils EGP 30-50/kg. Oil EGP 50-80/L. Typical dish: EGP 80-300.`,
  'Turkey': `Turkey (TRY 2025): tavuk TRY 120-160/kg, kıyma TRY 200-280/kg, yumurta TRY 50-70/12. Peynir TRY 150-220/kg, süt TRY 25-35/L. Domates TRY 20-40/kg. Pirinç TRY 60-90/kg, makarna TRY 40-60/500g. Zeytinyağı TRY 150-250/L. Typical dish: TRY 150-500.`,
  'India': `India (INR 2025): chicken INR 200-280/kg, mutton INR 600-800/kg, eggs INR 80-100/12. Paneer INR 300-400/kg, ghee INR 500-700/500g, milk INR 50-70/L. Tomatoes INR 40-80/kg. Basmati INR 80-150/kg, dal INR 100-160/kg. Typical dish: INR 150-600.`,
  'Japan': `Japan (JPY 2025): chicken JPY 500-700/kg, beef JPY 1500-3000/kg, salmon JPY 800-1200/kg, eggs JPY 200-300/10. Cheese JPY 800-1200/200g, milk JPY 200-250/L. Tomatoes JPY 300-500/kg. Rice JPY 400-600/kg. Soy sauce JPY 200-400/bottle. Typical dish: JPY 800-2500.`,
  'China': `China (CNY 2025): chicken CNY 20-30/kg, pork CNY 25-35/kg, fish CNY 20-40/kg, eggs CNY 12-18/12. Milk CNY 8-15/L. Tomatoes CNY 5-10/kg, bok choy CNY 3-6/kg. Rice CNY 6-12/kg, noodles CNY 5-10/500g. Soy sauce CNY 8-15/bottle. Typical dish: CNY 30-80.`,
  'Australia': `Australia (AUD 2025): chicken AUD 8-12/kg, beef AUD 10-14/kg, salmon AUD 20-28/kg, eggs AUD 5-7/12. Cheddar AUD 10-14/kg, milk AUD 2-3/L. Tomatoes AUD 4-6/kg. Rice AUD 2-4/kg, pasta AUD 2-4/500g, bread AUD 3-5. Olive oil AUD 8-14/500ml. Typical dish: AUD 15-35.`,
  'Canada': `Canada (CAD 2025): chicken CAD 9-13/kg, beef CAD 10-15/kg, salmon CAD 18-25/kg, eggs CAD 5-8/12. Cheddar CAD 10-15/kg, milk CAD 3-4/2L. Tomatoes CAD 4-6/kg. Rice CAD 3-5/kg, pasta CAD 2-4/500g. Olive oil CAD 10-16/500ml. Typical dish: CAD 15-35.`,
  'Morocco': `Morocco (MAD 2025): poulet MAD 30-40/kg, agneau MAD 80-100/kg, oeufs MAD 15-20/12. Fromage MAD 60-90/kg, lait MAD 8-12/L. Tomates MAD 5-10/kg. Couscous MAD 8-14/kg, riz MAD 10-16/kg, lentilles MAD 8-14/kg. Huile d'olive MAD 40-70/L. Typical dish: MAD 30-100.`,
  'Brazil': `Brazil (BRL 2025): frango BRL 12-18/kg, carne BRL 30-50/kg, ovos BRL 12-18/12. Queijo BRL 30-50/kg, leite BRL 5-8/L. Tomate BRL 6-12/kg. Arroz BRL 5-9/kg, feijão BRL 6-10/kg, macarrão BRL 5-9/500g. Óleo BRL 8-15/L. Typical dish: BRL 25-80.`,
  'Mexico': `Mexico (MXN 2025): pollo MXN 70-100/kg, carne MXN 120-160/kg, huevos MXN 50-70/12. Queso fresco MXN 80-120/kg, leche MXN 20-30/L. Tomate MXN 20-40/kg, aguacate MXN 20-40 each. Arroz MXN 25-40/kg, tortillas MXN 20-35/pack. Typical dish: MXN 80-250.`,
  'South Korea': `South Korea (KRW 2025): chicken KRW 8000-12000/kg, beef KRW 30000-50000/kg, eggs KRW 3000-5000/10. Milk KRW 2500-3500/L. Mushrooms KRW 5000-10000/pack, tofu KRW 2000-3500/block. Rice KRW 3000-5000/kg, gochujang KRW 4000-8000/jar. Typical dish: KRW 8000-25000.`,
  'Thailand': `Thailand (THB 2025): chicken THB 70-100/kg, pork THB 90-120/kg, shrimp THB 150-250/kg, eggs THB 40-60/12. Coconut milk THB 25-40/can. Thai basil THB 20-40/bunch, lime THB 5-10 each. Jasmine rice THB 30-50/kg. Fish sauce THB 30-50/bottle. Typical dish: THB 100-400.`,
  'Pakistan': `Pakistan (PKR 2025): chicken PKR 600-900/kg, beef PKR 1000-1500/kg, eggs PKR 250-380/12. Ghee PKR 800-1200/kg, paneer PKR 400-700/kg, milk PKR 120-180/L. Tomatoes PKR 80-150/kg. Basmati PKR 200-350/kg, dal PKR 200-350/kg. Typical dish: PKR 500-2000.`,
  'Malaysia': `Malaysia (MYR 2025): chicken MYR 8-12/kg, beef MYR 28-38/kg, fish MYR 15-30/kg, eggs MYR 5-8/10. Milk MYR 6-10/L. Tomatoes MYR 4-7/kg, lemongrass MYR 2-4/bunch. Rice MYR 3-6/kg, noodles MYR 3-6/500g. Coconut milk MYR 3-6/can. Typical dish: MYR 20-60.`,
  'Singapore': `Singapore (SGD 2025): chicken SGD 8-12/kg, beef SGD 20-30/kg, fish SGD 15-25/kg, eggs SGD 3-5/10. Milk SGD 3-5/L. Bok choy SGD 2-4/bunch, tofu SGD 2-4/block. Jasmine rice SGD 3-6/kg. Fish sauce SGD 3-5/bottle. Typical dish: SGD 15-40.`,
  'Nigeria': `Nigeria (NGN 2025): chicken NGN 4000-6000/kg, beef NGN 5000-8000/kg, fish NGN 3000-6000/kg, eggs NGN 1500-2200/12. Milk NGN 600-1000/L. Tomatoes NGN 500-1000/kg, yam NGN 1000-2000/kg. Rice NGN 1500-2500/kg, beans NGN 1200-2000/kg. Palm oil NGN 2000-3500/L. Typical dish: NGN 3000-10000.`,
  'Kenya': `Kenya (KES 2025): chicken KES 350-500/kg, beef KES 450-650/kg, eggs KES 150-220/12. Milk KES 50-75/L. Tomatoes KES 80-140/kg, sukuma wiki KES 30-60/bunch. Ugali flour KES 80-130/kg, rice KES 130-200/kg. Cooking oil KES 200-350/L. Typical dish: KES 400-1200.`,
  'Sweden': `Sweden (SEK 2025): kyckling SEK 60-85/kg, nötkött SEK 120-180/kg, lax SEK 150-220/kg, ägg SEK 30-45/12. Ost SEK 80-120/kg, mjölk SEK 12-18/L. Tomater SEK 25-40/kg. Pasta SEK 12-20/500g, ris SEK 15-25/kg. Rapsolja SEK 25-40/L. Typical dish: SEK 80-220.`,
  'Poland': `Poland (PLN 2025): kurczak PLN 12-18/kg, wieprzowina PLN 15-22/kg, jajka PLN 8-12/10. Ser PLN 20-35/kg, masło PLN 8-12/250g, mleko PLN 3-5/L. Pomidory PLN 5-10/kg, ziemniaki PLN 2-4/kg. Chleb PLN 4-7, makaron PLN 3-5/500g. Typical dish: PLN 20-60.`,
  'Netherlands': `Netherlands (EUR 2025): kip €5-8/kg, rundergehakt €8-11/kg, zalm €14-18/kg, eieren €2.5-3.5/6. Kaas €7-12/kg, melk €1-1.5/L. Tomaten €2-3/kg, aardappelen €1-2/kg. Brood €2-3.5, pasta €1.5-2.5/500g, rijst €1.5-2.5/kg. Typical dish: €8-20.`,
  'Greece': `Greece (EUR 2025): κοτόπουλο €5-7/kg, αρνί €10-14/kg, αυγά €3-4/12. Φέτα €8-12/kg, γιαούρτι €2-3/500g, γάλα €1.2-1.8/L. Ντομάτες €2-3/kg, ελιές €4-7/kg. Ψωμί €1.5-2.5, ρύζι €2-3/kg. Ελαιόλαδο €6-10/L. Typical dish: €8-20.`,
  'Israel': `Israel (ILS 2025): עוף ILS 30-45/kg, דגים ILS 50-90/kg, ביצים ILS 15-22/12. גבינה ILS 40-60/kg, חלב ILS 6-9/L, לבנה ILS 12-18/500g. עגבניות ILS 8-14/kg, אבוקדו ILS 8-15/kg. לחם ILS 8-13, פסטה ILS 8-13/500g. שמן זית ILS 25-40/500ml. Typical dish: ILS 40-120.`,
  'South Africa': `South Africa (ZAR 2025): chicken ZAR 50-75/kg, beef ZAR 80-120/kg, fish ZAR 80-150/kg, eggs ZAR 30-45/12. Cheese ZAR 80-130/kg, milk ZAR 18-25/L. Tomatoes ZAR 15-25/kg, potatoes ZAR 10-18/kg. Bread ZAR 15-25, rice ZAR 18-28/kg. Typical dish: ZAR 80-220.`,
  'Argentina': `Argentina (ARS 2025): pollo ARS 3000-4500/kg, carne ARS 5000-7000/kg, huevos ARS 1500-2200/12. Queso ARS 5000-8000/kg, leche ARS 700-1100/L. Tomates ARS 1000-1800/kg. Pan ARS 1000-1800/kg, fideos ARS 800-1400/500g, arroz ARS 900-1500/kg. Typical dish: ARS 3000-10000.`,
  'Colombia': `Colombia (COP 2025): pollo COP 12000-18000/kg, carne COP 22000-32000/kg, huevos COP 7000-11000/12. Queso COP 15000-25000/kg, leche COP 3000-5000/L. Tomate COP 3000-6000/kg, papa COP 2000-4000/kg. Arroz COP 3000-5000/kg. Aceite COP 8000-14000/L. Typical dish: COP 15000-50000.`,
  'Latvia': `Latvia (EUR 2025): chicken €4-6/kg, pork €5-8/kg, fish €6-12/kg, eggs €2-3/10. Cheese €6-9/kg, butter €2-3/250g, milk €1-1.5/L. Tomatoes €2-3/kg, potatoes €0.8-1.5/kg, beets €1-1.5/kg. Rye bread €1.5-2.5, pasta €1.2-2/500g, rice €1.5-2.5/kg. Typical dish: €6-16.`,
  'Portugal': `Portugal (EUR 2025): frango €4-6/kg, bacalhau €10-18/kg, ovos €2-3/6. Queijo €6-10/kg, manteiga €2.5-4/250g, leite €0.9-1.3/L. Tomates €1.5-2.5/kg, batatas €1-1.8/kg. Pão €1.5-2.5, massa €1.2-2/500g, arroz €1.5-2.5/kg. Azeite €5-9/500ml. Typical dish: €7-18.`,
  'Switzerland': `Switzerland (CHF 2025): Poulet CHF 12-18/kg, Rindfleisch CHF 30-45/kg, Lachs CHF 25-35/kg, Eier CHF 4-6/6. Käse CHF 15-25/kg, Butter CHF 3-5/250g, Milch CHF 1.5-2/L. Tomaten CHF 3-5/kg. Brot CHF 3-5, Pasta CHF 2-4/500g, Reis CHF 2-4/kg. Typical dish: CHF 20-50.`,
  'Norway': `Norway (NOK 2025): kylling NOK 80-110/kg, laks NOK 120-180/kg, kjøttdeig NOK 120-160/kg, egg NOK 40-55/12. Ost NOK 100-160/kg, melk NOK 18-25/L. Tomater NOK 30-50/kg, poteter NOK 15-25/kg. Brød NOK 30-50, pasta NOK 15-25/500g. Typical dish: NOK 100-280.`,
}

const getPriceContext = (country) =>
  COUNTRY_PRICE_CONTEXT[country] ||
  `${country}: Use realistic local supermarket prices for ${country}. Be accurate — research current costs. Never guess too low.`

// ── MEAL PLAN ─────────────────────────────────────────────────────────────────
export async function generateMealPlan({ budget, people, currency, country, diet, health, restrictions, pantry, cuisines, calTarget }) {
  const restrictionLine = restrictions
    ? `CRITICAL: STRICT allergies/restrictions — NEVER include: ${restrictions}. Non-negotiable.`
    : 'No restrictions.'
  const calLine = calTarget > 0
    ? `CALORIE TARGET: ~${calTarget} cal/day. Breakfast ~${Math.round(calTarget*0.25)} kcal, Lunch ~${Math.round(calTarget*0.35)} kcal, Dinner ~${Math.round(calTarget*0.35)} kcal. Add "calories" field to each meal.`
    : 'No calorie target. Still add a realistic "calories" field to each meal.'
  const cuisineInstruction = cuisines.length
    ? `Cuisines: ${cuisines.join(', ')}. Rotate authentically. Include cuisine name per meal.`
    : 'Use varied global cuisines.'
  const pantryStr = pantry.length ? pantry.map(p=>`${p.name} (expires: ${p.exp})`).join(', ') : 'none'
  const priceContext = getPriceContext(country)

  const prompt = `Generate a 7-day meal plan and shopping list as JSON only. No markdown, no backticks.\n\n`
    + `HARD BUDGET LIMIT: Total of ALL estimatedCost values MUST be under ${currency}${budget}.\n`
    + `Use REAL local prices for ${country}: ${priceContext}\n\n`
    + `${restrictionLine}\n\n${calLine}\n\n`
    + `Profile: ${people} people, country: ${country}, diet: ${diet}, health: ${health.join(', ')||'none'}, pantry: ${pantryStr}. ${cuisineInstruction}\n\n`
    + `Meal names under 8 words. Descriptions under 10 words. Max 8 items per shopping category.\n\n`
    + `Return this JSON with all 7 days:\n`
    + `{"summary":{"totalEstimatedCost":0,"savingsPercent":0,"ingredientsReused":0,"wasteReductionTip":""},"cuisinesUsed":[],"weekPlan":[`
    + `{"day":"Monday","cuisine":"","breakfast":{"name":"","desc":"","cuisine":"","calories":0},"lunch":{"name":"","desc":"","cuisine":"","calories":0},"dinner":{"name":"","desc":"","cuisine":"","calories":0}}`
    + ` /* repeat for Tuesday through Sunday */`
    + `],"shoppingList":[{"category":"Produce","items":[{"name":"","qty":"","estimatedCost":0,"multiUse":true}]},{"category":"Proteins","items":[]},{"category":"Dairy & Eggs","items":[]},{"category":"Grains & Legumes","items":[]},{"category":"Pantry Staples","items":[]},{"category":"Other","items":[]}]}`

  const raw = await callAPI('generate', {
    model: 'claude-sonnet-4-5',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }]
  })
  return parseJSON(raw)
}

// ── FETCH RECIPE (from meal plan) ─────────────────────────────────────────────
export async function fetchRecipe({ name, cuisine, desc, people, diet, restrictions, country, currency }) {
  const priceContext = getPriceContext(country)

  const prompt = `Write the REAL AUTHENTIC detailed recipe for: "${name}"${cuisine ? ` (${cuisine})` : ''}${desc ? ` — ${desc}` : ''}.`
    + ` Serves ${people}. Diet: ${diet}. Restrictions: ${restrictions||'none'}. Country: ${country}. Currency: ${currency}.`
    + ` Use REAL local prices for ${country}: ${priceContext}`
    + ` Return JSON only, no markdown: {"prepTime":"","cookTime":"","difficulty":"","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"pricePerServing":0,"ingredients":[{"qty":"","name":"","note":""}],"steps":[""],"tip":"","history":""}.`
    + ` calories, protein, carbs, fat, fiber = integers per ONE adult serving (protein/carbs/fat/fiber in grams).`
    + ` pricePerServing = realistic TOTAL cost in ${currency} to buy ALL ingredients from scratch in ${country}. Never underestimate.`
    + ` history = 2 concise sentences about the dish's origin and cultural story.`
    + ` ingredients: use authentic traditional ingredients only. qty = exact amount needed.`

  const raw = await callAPI('recipe', {
    model: 'claude-sonnet-4-5',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }]
  })
  return parseJSON(raw)
}

// ── SEARCH RECIPE ─────────────────────────────────────────────────────────────
export async function searchRecipe({ query, people, diet, restrictions, country, currency }) {
  const priceContext = getPriceContext(country)

  const prompt = `Give me the REAL AUTHENTIC recipe for EXACTLY: "${query}". Return ONLY this specific dish — do NOT substitute, replace, or suggest alternatives. If the user searches "cheesecake" return cheesecake, not a similar dish. Always return the exact dish requested.`
    + ` Serves ${people}. Diet: ${diet}. Restrictions: ${restrictions||'none'}. Country: ${country}. Currency: ${currency}.`
    + ` Use REAL local prices for ${country}: ${priceContext}`
    + ` Return JSON only: {"dishName":"","cuisine":"","prepTime":"","cookTime":"","difficulty":"","servings":${people},"pricePerServing":0,"calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"ingredients":[{"qty":"","name":"","note":""}],"steps":[""],"tip":"","history":"","funFact":""}.`
    + ` calories, protein, carbs, fat, fiber = integers per ONE adult serving (protein/carbs/fat/fiber in grams).`
    + ` pricePerServing = realistic TOTAL cost in ${currency} to buy ALL ingredients from scratch in ${country}. Add up carefully — never underestimate.`
    + ` history = 2 concise sentences about the dish origin and cultural story.`
    + ` ingredients: use authentic traditional ingredients. qty = exact amount needed.`

  const raw = await callAPI('recipe', {
    model: 'claude-sonnet-4-5',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }]
  })
  return parseJSON(raw)
}
