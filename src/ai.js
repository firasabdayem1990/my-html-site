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

  let res
  try {
    res = await fetch(`/api/${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
  } catch (netErr) {
    throw new Error('Network error — please check your internet connection and try again.')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err.error?.message || err.error || ''
    if (res.status === 429) throw new Error(msg || 'Monthly limit reached. Please try again next month.')
    else if (res.status === 401) throw new Error('Session expired — please sign out and sign in again.')
    else if (res.status === 500) throw new Error('Server error — please try again in a few seconds.')
    else if (res.status === 503) throw new Error('AI service temporarily unavailable — please try again.')
    throw new Error(msg || `Something went wrong (${res.status}). Please try again.`)
  }

  const data = await res.json()
  if (!data.content || !data.content.length) throw new Error('AI returned empty response — please try again.')
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
  try { return JSON.parse(str) }
  catch(e) { throw new Error('AI response was not in the expected format — please try generating again.') }
}

const COUNTRY_PRICE_CONTEXT = {
  'Lebanon': `Lebanon (USD 2025): Expensive due to imports & inflation.
PROTEINS: chicken breast $6-8/kg, thighs $4-5/kg, ground beef $8-10/kg, fish $8-15/kg, eggs $3-4/dozen.
DAIRY: akkawi $6-8/kg, halloumi $5-7/kg, labneh $3-4/kg, butter $3-4/250g, milk $2-3/L.
PRODUCE: tomatoes $1.5-2.5/kg, cucumbers $1-1.5/kg, onions $1-1.5/kg, lemons $2-3/kg, spinach $2-3/bunch.
GRAINS: rice $2-3/kg, lentils $2-2.5/kg, pasta $2-3/500g, pita $1-1.5/pack.
PANTRY: olive oil $8-12/L, tahini $4-6/jar, chickpeas $2-3/can.
SPECIALTY: kataifi $4-6/pack, orange blossom water $3-4/bottle, pistachios $8-12/100g, pine nuts $8-12/100g.
Typical dish total: $8-20. Never underestimate Lebanon prices.`,

  'United States': `USA (USD 2025):
PROTEINS: chicken breast $7-9/kg, ground beef $8-10/kg, salmon $15-20/kg, eggs $4-6/dozen.
DAIRY: cheddar $8-10/kg, butter $5-6/500g, milk $1.5-2/L, greek yogurt $5-6/500g.
PRODUCE: tomatoes $3-4/kg, broccoli $2-3/head, spinach $3-4/bag, avocado $1.5-2 each, lemons $0.5-1 each.
GRAINS: rice $2-3/kg, pasta $2-3/500g, bread $3-4/loaf, oats $3-4/kg.
PANTRY: olive oil $8-12/500ml, canned tomatoes $1.5-2/can, chicken broth $2-3/carton.
Typical dish total: $10-25.`,

  'United Kingdom': `UK (GBP 2025):
PROTEINS: chicken breast £6-8/kg, ground beef £7-9/kg, salmon £12-15/kg, eggs £2-3/6-pack.
DAIRY: cheddar £7-9/kg, butter £2-3/250g, milk £1.2-1.5/L, yogurt £1.5-2/500g.
PRODUCE: tomatoes £2-3/kg, onions £1-1.5/kg, peppers £1.5-2 each, spinach £1.5-2/bag.
GRAINS: rice £1.5-2/kg, pasta £1.5-2/500g, bread £1.5-2/loaf.
PANTRY: olive oil £5-7/500ml, canned tomatoes £0.8-1.2/can.
Typical dish total: £8-20.`,

  'France': `France (EUR 2025):
PROTEINS: poulet €5-7/kg, boeuf haché €8-10/kg, saumon €15-18/kg, oeufs €3-4/12-pack.
DAIRY: fromage €6-10/kg, beurre €3-4/250g, lait €1-1.5/L, yaourt €2-3/500g.
PRODUCE: tomates €2-3/kg, courgettes €2-3/kg, épinards €2-3/sachet, citrons €2-3/kg.
GRAINS: riz €2-3/kg, pâtes €1.5-2/500g, pain €1.5-2.5/baguette.
PANTRY: huile d'olive €6-10/L, conserves tomates €1-1.5/boîte.
Typical dish total: €8-20.`,

  'Germany': `Germany (EUR 2025):
PROTEINS: Hähnchen €5-7/kg, Hackfleisch €7-9/kg, Lachs €14-18/kg, Eier €3-4/10-pack.
DAIRY: Käse €7-10/kg, Butter €2.5-3.5/250g, Milch €1-1.5/L, Joghurt €1.5-2.5/500g.
PRODUCE: Tomaten €2-3/kg, Kartoffeln €1-2/kg, Paprika €2-3/kg, Spinat €2-3/Beutel.
GRAINS: Reis €2-3/kg, Nudeln €1.5-2/500g, Brot €2-3/Laib.
PANTRY: Olivenöl €6-9/500ml, Dosentomaten €1-1.5/Dose.
Typical dish total: €8-18.`,

  'Italy': `Italy (EUR 2025):
PROTEINS: pollo €5-7/kg, manzo €9-12/kg, pesce €12-18/kg, uova €3-4/6-pack.
DAIRY: mozzarella €3-5/250g, parmigiano €15-20/kg, burro €3-4/250g, latte €1.2-1.8/L.
PRODUCE: pomodori €2-3/kg, zucchine €2-3/kg, melanzane €2-3/kg, basilico €1-2/mazzo.
GRAINS: riso €2-3/kg, pasta €1.5-2.5/500g, pane €2-3/filone.
PANTRY: olio d'oliva €8-12/L, pelati €1.5-2/lattina.
Typical dish total: €8-20.`,

  'Spain': `Spain (EUR 2025):
PROTEINS: pollo €4-6/kg, ternera €8-11/kg, mariscos €12-20/kg, huevos €2.5-3.5/12-pack.
DAIRY: manchego €12-16/kg, mantequilla €3-4/250g, leche €1-1.5/L.
PRODUCE: tomates €2-3/kg, pimientos €2-3/kg, cebollas €1-1.5/kg, limones €2-3/kg.
GRAINS: arroz €1.5-2.5/kg, pasta €1.5-2/500g, pan €1.5-2.5/barra.
PANTRY: aceite de oliva €6-10/L, tomate triturado €1-1.5/lata.
Typical dish total: €7-18.`,

  'UAE': `UAE (AED 2025):
PROTEINS: chicken breast AED 25-35/kg, ground beef AED 35-45/kg, fish AED 40-70/kg, eggs AED 12-15/12-pack.
DAIRY: cheddar AED 30-40/kg, butter AED 15-20/250g, milk AED 6-8/L, labneh AED 10-15/kg.
PRODUCE: tomatoes AED 5-8/kg, cucumbers AED 4-6/kg, onions AED 4-6/kg, lemons AED 8-12/kg.
GRAINS: rice AED 8-12/kg, pasta AED 8-12/500g, bread AED 3-5/pack.
PANTRY: olive oil AED 30-50/L, canned tomatoes AED 5-8/can.
Typical dish total: AED 40-120.`,

  'Saudi Arabia': `Saudi Arabia (SAR 2025):
PROTEINS: chicken SAR 20-28/kg, ground beef SAR 35-45/kg, fish SAR 35-60/kg, eggs SAR 10-14/12-pack.
DAIRY: cheese SAR 25-35/kg, butter SAR 12-18/250g, milk SAR 5-7/L.
PRODUCE: tomatoes SAR 4-7/kg, cucumbers SAR 3-5/kg, onions SAR 3-5/kg.
GRAINS: rice SAR 6-10/kg, pasta SAR 6-10/500g, bread SAR 2-4/pack.
PANTRY: olive oil SAR 25-40/L, canned tomatoes SAR 4-7/can.
Typical dish total: SAR 35-100.`,

  'Jordan': `Jordan (JOD 2025):
PROTEINS: chicken JOD 3-4.5/kg, ground beef JOD 5-7/kg, fish JOD 5-10/kg, eggs JOD 1.5-2/12-pack.
DAIRY: white cheese JOD 4-6/kg, labneh JOD 2-3/kg, butter JOD 2-3/250g, milk JOD 0.8-1.2/L.
PRODUCE: tomatoes JOD 0.5-1/kg, cucumbers JOD 0.4-0.8/kg, onions JOD 0.4-0.7/kg, lemons JOD 1-2/kg.
GRAINS: rice JOD 1-1.8/kg, lentils JOD 1-1.5/kg, pasta JOD 0.8-1.5/500g, bread JOD 0.3-0.5/pack.
PANTRY: olive oil JOD 4-7/L, tahini JOD 2-4/jar, chickpeas JOD 0.8-1.5/can.
Typical dish total: JOD 4-15.`,

  'Egypt': `Egypt (EGP 2025):
PROTEINS: chicken EGP 120-160/kg, ground beef EGP 200-280/kg, fish EGP 80-200/kg, eggs EGP 80-100/12-pack.
DAIRY: white cheese EGP 80-120/kg, butter EGP 60-90/250g, milk EGP 20-30/L.
PRODUCE: tomatoes EGP 15-30/kg, cucumbers EGP 10-20/kg, onions EGP 10-20/kg, potatoes EGP 15-25/kg.
GRAINS: rice EGP 30-50/kg, lentils EGP 30-50/kg, pasta EGP 25-40/500g, bread EGP 2-5/loaf.
PANTRY: oil EGP 50-80/L, canned tomatoes EGP 20-35/can.
Typical dish total: EGP 80-300.`,

  'Turkey': `Turkey (TRY 2025):
PROTEINS: tavuk TRY 120-160/kg, kıyma TRY 200-280/kg, balık TRY 150-300/kg, yumurta TRY 50-70/12-pack.
DAIRY: peynir TRY 150-220/kg, tereyağı TRY 80-120/250g, süt TRY 25-35/L, yoğurt TRY 30-50/kg.
PRODUCE: domates TRY 20-40/kg, salatalık TRY 15-30/kg, soğan TRY 15-25/kg, biber TRY 25-40/kg.
GRAINS: pirinç TRY 60-90/kg, makarna TRY 40-60/500g, ekmek TRY 10-20/somun.
PANTRY: zeytinyağı TRY 150-250/L, konserve domates TRY 25-40/kutu.
Typical dish total: TRY 150-500.`,

  'India': `India (INR 2025):
PROTEINS: chicken INR 200-280/kg, mutton INR 600-800/kg, fish INR 300-600/kg, eggs INR 80-100/12-pack.
DAIRY: paneer INR 300-400/kg, ghee INR 500-700/500g, milk INR 50-70/L, yogurt INR 60-90/500g.
PRODUCE: tomatoes INR 40-80/kg, onions INR 30-60/kg, potatoes INR 25-50/kg, spinach INR 30-60/bunch.
GRAINS: basmati rice INR 80-150/kg, dal INR 100-160/kg, atta flour INR 40-60/kg, roti INR 5-10 each.
PANTRY: mustard oil INR 150-200/L, ghee INR 500-700/500g, spices INR 20-50/pack.
Typical dish total: INR 150-600.`,

  'Japan': `Japan (JPY 2025):
PROTEINS: chicken JPY 500-700/kg, beef JPY 1500-3000/kg, salmon JPY 800-1200/kg, eggs JPY 200-300/10-pack.
DAIRY: cheese JPY 800-1200/200g, butter JPY 400-600/200g, milk JPY 200-250/L, yogurt JPY 150-250/400g.
PRODUCE: tomatoes JPY 300-500/kg, cabbage JPY 150-250/head, onions JPY 200-300/kg, tofu JPY 80-150/block.
GRAINS: rice JPY 400-600/kg, soba/udon JPY 200-400/pack, bread JPY 200-350/loaf.
PANTRY: soy sauce JPY 200-400/bottle, mirin JPY 300-500/bottle, dashi JPY 200-400/pack.
Typical dish total: JPY 800-2500.`,

  'China': `China (CNY 2025):
PROTEINS: chicken CNY 20-30/kg, pork CNY 25-35/kg, fish CNY 20-40/kg, eggs CNY 12-18/12-pack.
DAIRY: milk CNY 8-15/L, yogurt CNY 6-12/200g, cheese CNY 30-60/200g.
PRODUCE: tomatoes CNY 5-10/kg, bok choy CNY 3-6/kg, mushrooms CNY 15-30/kg, ginger CNY 10-20/kg.
GRAINS: rice CNY 6-12/kg, noodles CNY 5-10/500g, steamed buns CNY 2-4 each.
PANTRY: soy sauce CNY 8-15/bottle, sesame oil CNY 15-25/bottle, oyster sauce CNY 8-15/bottle.
Typical dish total: CNY 30-80.`,

  'South Korea': `South Korea (KRW 2025):
PROTEINS: chicken KRW 8000-12000/kg, beef KRW 30000-50000/kg, fish KRW 10000-20000/kg, eggs KRW 3000-5000/10-pack.
DAIRY: milk KRW 2500-3500/L, yogurt KRW 2000-3500/500g, cheese KRW 8000-15000/200g.
PRODUCE: kimchi vegetables KRW 3000-6000/kg, mushrooms KRW 5000-10000/pack, tofu KRW 2000-3500/block.
GRAINS: rice KRW 3000-5000/kg, ramyeon KRW 1000-2000/pack, gochujang KRW 4000-8000/jar.
Typical dish total: KRW 8000-25000.`,

  'Thailand': `Thailand (THB 2025):
PROTEINS: chicken THB 70-100/kg, pork THB 90-120/kg, shrimp THB 150-250/kg, eggs THB 40-60/12-pack.
DAIRY: milk THB 50-80/L, coconut milk THB 25-40/can.
PRODUCE: tomatoes THB 30-50/kg, Thai basil THB 20-40/bunch, lemongrass THB 20-40/bunch, lime THB 5-10 each.
GRAINS: jasmine rice THB 30-50/kg, rice noodles THB 25-40/500g, pad thai noodles THB 30-50/pack.
PANTRY: fish sauce THB 30-50/bottle, oyster sauce THB 40-60/bottle, coconut milk THB 25-40/can.
Typical dish total: THB 100-400.`,

  'Mexico': `Mexico (MXN 2025):
PROTEINS: pollo MXN 70-100/kg, carne molida MXN 120-160/kg, camarón MXN 200-350/kg, huevos MXN 50-70/12-pack.
DAIRY: queso fresco MXN 80-120/kg, crema MXN 40-60/500g, mantequilla MXN 50-80/250g, leche MXN 20-30/L.
PRODUCE: tomate MXN 20-40/kg, chile MXN 30-50/kg, cebolla MXN 15-25/kg, aguacate MXN 20-40 each.
GRAINS: arroz MXN 25-40/kg, tortillas MXN 20-35/pack, frijoles MXN 30-50/kg.
PANTRY: aceite MXN 50-80/L, salsa MXN 30-50/jar.
Typical dish total: MXN 80-250.`,

  'Brazil': `Brazil (BRL 2025):
PROTEINS: frango BRL 12-18/kg, carne BRL 30-50/kg, peixe BRL 25-45/kg, ovos BRL 12-18/12-pack.
DAIRY: queijo BRL 30-50/kg, manteiga BRL 15-25/200g, leite BRL 5-8/L, requeijão BRL 8-12/200g.
PRODUCE: tomate BRL 6-12/kg, cebola BRL 4-7/kg, alho BRL 15-25/kg, limão BRL 5-10/kg.
GRAINS: arroz BRL 5-9/kg, feijão BRL 6-10/kg, macarrão BRL 5-9/500g, pão BRL 8-15/kg.
PANTRY: óleo BRL 8-15/L, azeite BRL 20-35/500ml, molho de tomate BRL 4-7/can.
Typical dish total: BRL 25-80.`,

  'Australia': `Australia (AUD 2025):
PROTEINS: chicken AUD 8-12/kg, beef mince AUD 10-14/kg, salmon AUD 20-28/kg, eggs AUD 5-7/12-pack.
DAIRY: cheddar AUD 10-14/kg, butter AUD 4-6/250g, milk AUD 2-3/L, Greek yogurt AUD 5-8/500g.
PRODUCE: tomatoes AUD 4-6/kg, broccoli AUD 3-5/head, spinach AUD 3-5/bag, avocado AUD 2-4 each.
GRAINS: rice AUD 2-4/kg, pasta AUD 2-4/500g, bread AUD 3-5/loaf, oats AUD 3-5/kg.
PANTRY: olive oil AUD 8-14/500ml, canned tomatoes AUD 1.5-2.5/can.
Typical dish total: AUD 15-35.`,

  'Canada': `Canada (CAD 2025):
PROTEINS: chicken CAD 9-13/kg, ground beef CAD 10-15/kg, salmon CAD 18-25/kg, eggs CAD 5-8/12-pack.
DAIRY: cheddar CAD 10-15/kg, butter CAD 5-7/454g, milk CAD 3-4/2L, yogurt CAD 5-8/750g.
PRODUCE: tomatoes CAD 4-6/kg, broccoli CAD 3-5/head, spinach CAD 3-5/bag, peppers CAD 2-4 each.
GRAINS: rice CAD 3-5/kg, pasta CAD 2-4/500g, bread CAD 4-6/loaf.
PANTRY: olive oil CAD 10-16/500ml, canned tomatoes CAD 2-3/can.
Typical dish total: CAD 15-35.`,

  'Morocco': `Morocco (MAD 2025):
PROTEINS: poulet MAD 30-40/kg, agneau MAD 80-100/kg, poisson MAD 30-60/kg, oeufs MAD 15-20/12-pack.
DAIRY: fromage MAD 60-90/kg, beurre MAD 25-35/250g, lait MAD 8-12/L.
PRODUCE: tomates MAD 5-10/kg, courgettes MAD 5-10/kg, oignons MAD 4-8/kg, citrons MAD 8-15/kg.
GRAINS: couscous MAD 8-14/kg, riz MAD 10-16/kg, pain MAD 2-4/loaf, lentilles MAD 8-14/kg.
PANTRY: huile d'argan MAD 80-150/L, huile d'olive MAD 40-70/L, épices MAD 5-15/pack.
Typical dish total: MAD 30-100.`,

  'Latvia': `Latvia (EUR 2025):
PROTEINS: chicken €4-6/kg, pork €5-8/kg, fish €6-12/kg, eggs €2-3/10-pack.
DAIRY: cheese €6-9/kg, butter €2-3/250g, milk €1-1.5/L, sour cream €1.5-2.5/500g.
PRODUCE: tomatoes €2-3/kg, potatoes €0.8-1.5/kg, cabbage €0.8-1.5/head, beets €1-1.5/kg, carrots €1-1.5/kg.
GRAINS: rye bread €1.5-2.5/loaf, pasta €1.2-2/500g, rice €1.5-2.5/kg, barley €1-1.8/kg.
PANTRY: sunflower oil €2-4/L, sauerkraut €1.5-2.5/jar, pickles €1.5-2.5/jar.
Typical dish total: €6-16.`,

  'Poland': `Poland (PLN 2025):
PROTEINS: kurczak PLN 12-18/kg, wieprzowina PLN 15-22/kg, ryba PLN 20-35/kg, jajka PLN 8-12/10-pack.
DAIRY: ser PLN 20-35/kg, masło PLN 8-12/250g, mleko PLN 3-5/L, śmietana PLN 4-7/500g.
PRODUCE: pomidory PLN 5-10/kg, ziemniaki PLN 2-4/kg, kapusta PLN 2-4/head, cebula PLN 2-4/kg.
GRAINS: chleb PLN 4-7/loaf, makaron PLN 3-5/500g, ryż PLN 4-7/kg, kasza PLN 3-6/kg.
PANTRY: olej PLN 8-14/L, koncentrat pomidorowy PLN 2-4/tube.
Typical dish total: PLN 20-60.`,

  'Sweden': `Sweden (SEK 2025):
PROTEINS: kyckling SEK 60-85/kg, nötkött SEK 120-180/kg, lax SEK 150-220/kg, ägg SEK 30-45/12-pack.
DAIRY: ost SEK 80-120/kg, smör SEK 25-40/250g, mjölk SEK 12-18/L, filmjölk SEK 15-22/L.
PRODUCE: tomater SEK 25-40/kg, potatis SEK 10-18/kg, lök SEK 10-18/kg, paprika SEK 15-25/kg.
GRAINS: knäckebröd SEK 25-40/pack, pasta SEK 12-20/500g, ris SEK 15-25/kg.
PANTRY: rapsolja SEK 25-40/L, creme fraiche SEK 15-25/200ml.
Typical dish total: SEK 80-220.`,

  'Norway': `Norway (NOK 2025):
PROTEINS: kylling NOK 80-110/kg, laks NOK 120-180/kg, kjøttdeig NOK 120-160/kg, egg NOK 40-55/12-pack.
DAIRY: ost NOK 100-160/kg, smør NOK 35-50/250g, melk NOK 18-25/L.
PRODUCE: tomater NOK 30-50/kg, poteter NOK 15-25/kg, løk NOK 15-22/kg.
GRAINS: brød NOK 30-50/loaf, pasta NOK 15-25/500g, ris NOK 20-35/kg.
PANTRY: rapsolja NOK 35-55/L.
Typical dish total: NOK 100-280.`,

  'Switzerland': `Switzerland (CHF 2025):
PROTEINS: Poulet CHF 12-18/kg, Rindfleisch CHF 30-45/kg, Lachs CHF 25-35/kg, Eier CHF 4-6/6-pack.
DAIRY: Käse CHF 15-25/kg, Butter CHF 3-5/250g, Milch CHF 1.5-2/L.
PRODUCE: Tomaten CHF 3-5/kg, Kartoffeln CHF 2-3/kg, Zwiebeln CHF 2-3/kg.
GRAINS: Brot CHF 3-5/loaf, Pasta CHF 2-4/500g, Reis CHF 2-4/kg.
PANTRY: Olivenöl CHF 8-14/500ml.
Typical dish total: CHF 20-50.`,

  'Netherlands': `Netherlands (EUR 2025):
PROTEINS: kip €5-8/kg, rundergehakt €8-11/kg, zalm €14-18/kg, eieren €2.5-3.5/6-pack.
DAIRY: kaas €7-12/kg, boter €2.5-4/250g, melk €1-1.5/L, yoghurt €1.5-2.5/500g.
PRODUCE: tomaten €2-3/kg, aardappelen €1-2/kg, uien €1-1.5/kg, paprika €1.5-2.5/kg.
GRAINS: brood €2-3.5/loaf, pasta €1.5-2.5/500g, rijst €1.5-2.5/kg.
PANTRY: olijfolie €5-9/500ml, blikje tomaten €0.8-1.5/can.
Typical dish total: €8-20.`,

  'Belgium': `Belgium (EUR 2025):
PROTEINS: kip €5-7/kg, gehakt €7-10/kg, vis €10-16/kg, eieren €2.5-3.5/6-pack.
DAIRY: kaas €7-12/kg, boter €2.5-4/250g, melk €1-1.5/L.
PRODUCE: tomaten €2-3/kg, aardappelen €1-2/kg, witloof €3-5/kg, prei €2-3/kg.
GRAINS: brood €2-3.5/loaf, pasta €1.5-2/500g, rijst €1.5-2.5/kg.
PANTRY: olijfolie €5-9/500ml, bier €1-2/bottle (for cooking!).
Typical dish total: €8-20.`,

  'Portugal': `Portugal (EUR 2025):
PROTEINS: frango €4-6/kg, bacalhau €10-18/kg, carne picada €7-10/kg, ovos €2-3/6-pack.
DAIRY: queijo €6-10/kg, manteiga €2.5-4/250g, leite €0.9-1.3/L.
PRODUCE: tomates €1.5-2.5/kg, batatas €1-1.8/kg, cebolas €1-1.5/kg, pimentos €2-3/kg.
GRAINS: pão €1.5-2.5/loaf, massa €1.2-2/500g, arroz €1.5-2.5/kg.
PANTRY: azeite €5-9/500ml, tomate pelado €1-1.5/can.
Typical dish total: €7-18.`,

  'Greece': `Greece (EUR 2025):
PROTEINS: κοτόπουλο €5-7/kg, αρνί €10-14/kg, ψάρι €10-18/kg, αυγά €3-4/12-pack.
DAIRY: φέτα €8-12/kg, γιαούρτι €2-3/500g, βούτυρο €3-4/250g, γάλα €1.2-1.8/L.
PRODUCE: ντομάτες €2-3/kg, ελιές €4-7/kg, αγγούρι €1-2/kg, μελιτζάνα €2-3/kg.
GRAINS: ψωμί €1.5-2.5/loaf, ρύζι €2-3/kg, ζυμαρικά €1.5-2.5/500g.
PANTRY: ελαιόλαδο €6-10/L, τυρί κρέμα €3-5/200g.
Typical dish total: €8-20.`,

  'Czech Republic': `Czech Republic (CZK 2025):
PROTEINS: kuře CZK 90-130/kg, vepřové CZK 110-160/kg, ryba CZK 150-250/kg, vejce CZK 50-75/10-pack.
DAIRY: sýr CZK 150-250/kg, máslo CZK 55-80/250g, mléko CZK 22-32/L.
PRODUCE: rajčata CZK 40-70/kg, brambory CZK 20-35/kg, cibule CZK 20-35/kg.
GRAINS: chléb CZK 40-65/loaf, těstoviny CZK 25-45/500g, rýže CZK 35-60/kg.
PANTRY: olej CZK 55-90/L.
Typical dish total: CZK 150-400.`,

  'Hungary': `Hungary (HUF 2025):
PROTEINS: csirke HUF 1500-2200/kg, darált hús HUF 2000-2800/kg, hal HUF 2500-4000/kg, tojás HUF 600-900/10-pack.
DAIRY: sajt HUF 2500-4000/kg, vaj HUF 800-1200/250g, tej HUF 350-500/L, tejföl HUF 400-600/500g.
PRODUCE: paradicsom HUF 600-1000/kg, burgonya HUF 300-500/kg, paprika HUF 500-900/kg.
GRAINS: kenyér HUF 500-800/loaf, tészta HUF 400-700/500g, rizs HUF 500-800/kg.
PANTRY: napraforgóolaj HUF 800-1400/L, paprika HUF 400-700/bag.
Typical dish total: HUF 2000-6000.`,

  'Romania': `Romania (RON 2025):
PROTEINS: pui RON 15-22/kg, carne tocată RON 22-32/kg, pește RON 20-40/kg, ouă RON 8-12/10-pack.
DAIRY: brânză RON 20-35/kg, unt RON 10-16/250g, lapte RON 5-8/L, smântână RON 6-10/500g.
PRODUCE: roșii RON 5-9/kg, cartofi RON 3-5/kg, ceapă RON 3-5/kg, ardei RON 5-9/kg.
GRAINS: pâine RON 5-9/loaf, paste RON 5-9/500g, orez RON 6-10/kg.
PANTRY: ulei RON 10-18/L.
Typical dish total: RON 30-90.`,

  'Israel': `Israel (ILS 2025):
PROTEINS: עוף ILS 30-45/kg, בשר טחון ILS 50-70/kg, דגים ILS 50-90/kg, ביצים ILS 15-22/12-pack.
DAIRY: גבינה ILS 40-60/kg, חמאה ILS 15-22/200g, חלב ILS 6-9/L, לבנה ILS 12-18/500g.
PRODUCE: עגבניות ILS 8-14/kg, מלפפון ILS 5-10/kg, בצל ILS 5-8/kg, אבוקדו ILS 8-15/kg.
GRAINS: לחם ILS 8-13/loaf, פסטה ILS 8-13/500g, אורז ILS 8-14/kg, חומוס ILS 8-14/can.
PANTRY: שמן זית ILS 25-40/500ml, טחינה ILS 15-25/jar.
Typical dish total: ILS 40-120.`,

  'South Africa': `South Africa (ZAR 2025):
PROTEINS: chicken ZAR 50-75/kg, beef mince ZAR 80-120/kg, fish ZAR 80-150/kg, eggs ZAR 30-45/12-pack.
DAIRY: cheese ZAR 80-130/kg, butter ZAR 35-55/250g, milk ZAR 18-25/L, yogurt ZAR 20-35/500g.
PRODUCE: tomatoes ZAR 15-25/kg, potatoes ZAR 10-18/kg, onions ZAR 10-16/kg, spinach ZAR 10-18/bunch.
GRAINS: bread ZAR 15-25/loaf, pasta ZAR 15-25/500g, rice ZAR 18-28/kg, pap ZAR 10-18/kg.
PANTRY: sunflower oil ZAR 25-40/L, canned tomatoes ZAR 10-16/can.
Typical dish total: ZAR 80-220.`,

  'Nigeria': `Nigeria (NGN 2025):
PROTEINS: chicken NGN 4000-6000/kg, beef NGN 5000-8000/kg, fish NGN 3000-6000/kg, eggs NGN 1500-2200/12-pack.
DAIRY: milk NGN 600-1000/L, butter NGN 1500-2500/250g, cheese NGN 3000-5000/200g.
PRODUCE: tomatoes NGN 500-1000/kg, yam NGN 1000-2000/kg, plantain NGN 500-1000/bunch, peppers NGN 500-1000/kg.
GRAINS: rice NGN 1500-2500/kg, beans NGN 1200-2000/kg, garri NGN 800-1400/kg, bread NGN 800-1400/loaf.
PANTRY: palm oil NGN 2000-3500/L, groundnut oil NGN 2500-4000/L, crayfish NGN 3000-5000/kg.
Typical dish total: NGN 3000-10000.`,

  'Kenya': `Kenya (KES 2025):
PROTEINS: chicken KES 350-500/kg, beef KES 450-650/kg, fish KES 400-700/kg, eggs KES 150-220/12-pack.
DAIRY: milk KES 50-75/L, butter KES 200-320/250g, cheese KES 500-800/kg.
PRODUCE: tomatoes KES 80-140/kg, potatoes KES 60-100/kg, onions KES 60-100/kg, sukuma wiki KES 30-60/bunch.
GRAINS: ugali flour KES 80-130/kg, rice KES 130-200/kg, pasta KES 120-200/500g, bread KES 60-100/loaf.
PANTRY: cooking oil KES 200-350/L.
Typical dish total: KES 400-1200.`,

  'Malaysia': `Malaysia (MYR 2025):
PROTEINS: chicken MYR 8-12/kg, beef MYR 28-38/kg, fish MYR 15-30/kg, eggs MYR 5-8/10-pack.
DAIRY: milk MYR 6-10/L, butter MYR 8-14/250g, cheese MYR 15-25/200g.
PRODUCE: tomatoes MYR 4-7/kg, kangkung MYR 2-4/bunch, lemongrass MYR 2-4/bunch, tofu MYR 3-5/block.
GRAINS: rice MYR 3-6/kg, noodles MYR 3-6/500g, bread MYR 3-5/loaf.
PANTRY: cooking oil MYR 8-14/L, soy sauce MYR 4-8/bottle, coconut milk MYR 3-6/can.
Typical dish total: MYR 20-60.`,

  'Singapore': `Singapore (SGD 2025):
PROTEINS: chicken SGD 8-12/kg, beef SGD 20-30/kg, fish SGD 15-25/kg, eggs SGD 3-5/10-pack.
DAIRY: milk SGD 3-5/L, butter SGD 5-8/250g, cheese SGD 8-15/200g.
PRODUCE: tomatoes SGD 3-5/kg, bok choy SGD 2-4/bunch, tofu SGD 2-4/block, bean sprouts SGD 1-2/pack.
GRAINS: jasmine rice SGD 3-6/kg, noodles SGD 2-4/500g, bread SGD 3-5/loaf.
PANTRY: cooking oil SGD 5-9/L, oyster sauce SGD 3-6/bottle, fish sauce SGD 3-5/bottle.
Typical dish total: SGD 15-40.`,

  'Pakistan': `Pakistan (PKR 2025):
PROTEINS: chicken PKR 600-900/kg, beef PKR 1000-1500/kg, fish PKR 800-1400/kg, eggs PKR 250-380/12-pack.
DAIRY: dahi PKR 150-250/L, ghee PKR 800-1200/kg, paneer PKR 400-700/kg, milk PKR 120-180/L.
PRODUCE: tamatar PKR 80-150/kg, pyaz PKR 60-120/kg, aloo PKR 60-100/kg, palak PKR 60-100/bunch.
GRAINS: basmati rice PKR 200-350/kg, atta PKR 100-180/kg, dal PKR 200-350/kg, roti PKR 15-25 each.
PANTRY: cooking oil PKR 400-650/L, spices PKR 50-150/pack.
Typical dish total: PKR 500-2000.`,

  'Bangladesh': `Bangladesh (BDT 2025):
PROTEINS: chicken BDT 200-300/kg, beef BDT 700-1000/kg, fish BDT 300-600/kg, eggs BDT 120-180/12-pack.
DAIRY: milk BDT 70-110/L, ghee BDT 800-1200/kg, dahi BDT 80-130/kg.
PRODUCE: tomatoes BDT 40-80/kg, potatoes BDT 30-60/kg, onions BDT 50-90/kg, lentils BDT 100-160/kg.
GRAINS: rice BDT 60-100/kg, atta BDT 50-85/kg, bread BDT 30-55/loaf.
PANTRY: mustard oil BDT 200-350/L, spices BDT 30-80/pack.
Typical dish total: BDT 200-700.`,

  'Sri Lanka': `Sri Lanka (LKR 2025):
PROTEINS: chicken LKR 1200-1800/kg, beef LKR 1500-2200/kg, fish LKR 800-1600/kg, eggs LKR 350-520/12-pack.
DAIRY: milk LKR 250-380/L, butter LKR 500-800/250g, cheese LKR 1500-2500/kg.
PRODUCE: tomatoes LKR 200-400/kg, potatoes LKR 200-350/kg, onions LKR 200-380/kg, curry leaves LKR 50-100/bunch.
GRAINS: rice LKR 150-250/kg, bread LKR 150-250/loaf, string hoppers LKR 100-180/pack.
PANTRY: coconut oil LKR 600-1000/L, coconut milk LKR 200-350/can, spices LKR 100-250/pack.
Typical dish total: LKR 500-2000.`,

  'Argentina': `Argentina (ARS 2025):
PROTEINS: pollo ARS 3000-4500/kg, carne picada ARS 5000-7000/kg, pescado ARS 5000-8000/kg, huevos ARS 1500-2200/12-pack.
DAIRY: queso ARS 5000-8000/kg, manteca ARS 1500-2500/250g, leche ARS 700-1100/L.
PRODUCE: tomates ARS 1000-1800/kg, papas ARS 600-1000/kg, cebollas ARS 600-1000/kg.
GRAINS: pan ARS 1000-1800/kg, fideos ARS 800-1400/500g, arroz ARS 900-1500/kg.
PANTRY: aceite ARS 2000-3500/L.
Typical dish total: ARS 3000-10000.`,

  'Colombia': `Colombia (COP 2025):
PROTEINS: pollo COP 12000-18000/kg, carne COP 22000-32000/kg, pescado COP 18000-30000/kg, huevos COP 7000-11000/12-pack.
DAIRY: queso COP 15000-25000/kg, mantequilla COP 7000-11000/250g, leche COP 3000-5000/L.
PRODUCE: tomate COP 3000-6000/kg, papa COP 2000-4000/kg, cebolla COP 2000-4000/kg, aguacate COP 3000-6000/kg.
GRAINS: arroz COP 3000-5000/kg, pasta COP 3000-5500/500g, pan COP 5000-9000/kg.
PANTRY: aceite COP 8000-14000/L.
Typical dish total: COP 15000-50000.`,

  'Iran': `Iran (IRR 2025 / USD equivalent):
PROTEINS: chicken ~$3-5/kg, beef ~$6-9/kg, fish ~$5-10/kg, eggs ~$2-3/12-pack.
DAIRY: feta-style cheese ~$4-7/kg, butter ~$3-5/250g, milk ~$1-2/L, yogurt ~$1.5-3/kg.
PRODUCE: tomatoes ~$1-2/kg, cucumbers ~$0.8-1.5/kg, onions ~$0.5-1/kg, pomegranate ~$2-4/kg.
GRAINS: basmati rice ~$2-4/kg, bread ~$0.3-0.8/loaf, lentils ~$1.5-3/kg.
PANTRY: saffron ~$5-15/gram, dried limes ~$3-6/pack, barberries ~$4-8/100g.
Typical dish total: $6-20.`,
}

const getPriceContext = (country) => {
  return COUNTRY_PRICE_CONTEXT[country] ||
    `${country}: Use realistic local supermarket prices. Research current costs for staple ingredients in ${country}. Be accurate — never guess too low. Consider local cost of living.`
}

export async function generateMealPlan({ budget, adults, kids, people, currency, country, diet, health, restrictions, pantry, cuisines, cuisinePercs, calTarget, likedMeals, dislikedMeals }) {
  const restrictionLine = restrictions
    ? `CRITICAL: STRICT allergies/restrictions — NEVER include: ${restrictions}. Non-negotiable.`
    : 'No restrictions.'

  const calLine = calTarget > 0
    ? `CALORIE TARGET per adult: ~${calTarget} kcal/day. Breakdown: Breakfast ~${Math.round(calTarget * 0.25)} kcal, Lunch ~${Math.round(calTarget * 0.35)} kcal, Dinner ~${Math.round(calTarget * 0.35)} kcal. Add "calories" field (integer kcal/serving for ONE adult) to each meal.`
    : 'No calorie target. Add realistic "calories" field (integer kcal/serving for one adult) to each meal.'

  const cuisineInstruction = cuisinePercs && cuisinePercs.length
    ? `CUISINE ALLOCATION for the week (strictly follow):
${cuisinePercs.map(c => {
  const days = Math.round((c.pct / 100) * 21)
  return `- ${c.name}: ${c.pct}% (~${days} meals out of 21)`
}).join('\n')}
Distribute proportionally. Each meal must include "cuisine" field.`
    : cuisines.length
    ? `Cuisines: ${cuisines.join(', ')}. Rotate authentically. Include cuisine name per meal.`
    : 'Use varied global cuisines, rotating daily.'

  const pantryStr = (() => {
    const today = new Date()
    const sortedPantry = [...(pantry||[])].sort((a, b) => {
      const da = new Date(a.exp), db = new Date(b.exp)
      const validA = !isNaN(da), validB = !isNaN(db)
      if (validA && validB) return da - db
      if (validA) return -1
      if (validB) return 1
      return 0
    })
    if (!sortedPantry.length) return 'none'
    return sortedPantry.map(p => {
      const d = new Date(p.exp)
      if (!isNaN(d)) {
        const daysLeft = Math.ceil((d - today) / (1000*60*60*24))
        if (daysLeft < 0) return `${p.name} (EXPIRED)`
        if (daysLeft === 0) return `${p.name} (expires TODAY - use immediately)`
        if (daysLeft <= 2) return `${p.name} (expires in ${daysLeft} day${daysLeft>1?'s':''} - URGENT)`
        if (daysLeft <= 5) return `${p.name} (expires in ${daysLeft} days - use soon)`
        return `${p.name} (expires: ${p.exp})`
      }
      return `${p.name} (no expiry)`
    }).join(', ')
  })()

  const expiringItems = (pantry||[]).filter(p => {
    const d = new Date(p.exp)
    if (isNaN(d)) return false
    const daysLeft = Math.ceil((d - new Date()) / (1000*60*60*24))
    return daysLeft >= 0 && daysLeft <= 5
  })

  const expiringStr = expiringItems.length
    ? `EXPIRING SOON (use in first 2-3 days): ${expiringItems.map(p => p.name).join(', ')}`
    : ''

  const effectivePortions = adults + (kids * 0.5)
  const kidsLine = kids > 0
    ? `Household: ${adults} adults + ${kids} children. Kids get HALF portions (milder seasoning, no spicy). Effective portions = ${effectivePortions}.`
    : `Household: ${adults} adults. Total: ${people} people.`

  const priceContext = getPriceContext(country)
  const totalMeals = 7 * 3
  const maxCostPerMealPerPortion = (budget * 0.92) / (totalMeals * effectivePortions)

  const pregnantLine = (health||[]).includes('pregnant-friendly')
    ? `PREGNANT-FRIENDLY: No raw fish/sushi, no deli meats, no soft cheeses, no high-mercury fish. Include folate-rich foods, iron, calcium, omega-3 (cooked salmon ok).`
    : ''

  const prompt = `Generate a 7-day meal plan and shopping list as JSON only. No markdown, no backticks, no extra text.

BUDGET RULES — NON-NEGOTIABLE:
- Total budget: ${currency}${budget} for the entire week
- HARD LIMIT: Total shopping cost MUST be UNDER ${currency}${budget * 0.95}
- Use REAL local prices for ${country}: ${priceContext}
- Max cost per meal per portion: ~${currency}${maxCostPerMealPerPortion.toFixed(2)}
- Reuse ingredients across meals to reduce cost and waste

${restrictionLine}
${pregnantLine}
${dislikedMeals?.length ? `NEVER include: ${dislikedMeals.join(', ')}` : ''}
${likedMeals?.length ? `User loves these — include similar: ${likedMeals.slice(0,5).join(', ')}` : ''}

PANTRY PRIORITY:
${expiringStr ? `🚨 ${expiringStr} — BUILD MEALS AROUND THESE FIRST in Monday/Tuesday.` : ''}
- Use pantry items in as many meals as possible
- NEVER buy something user already has in pantry
- Pantry items already owned: ${pantryStr}

${calLine}
${kidsLine}
Country: ${country}. Diet: ${diet}. Health: ${health.join(', ') || 'none'}.
${cuisineInstruction}

QUANTITIES: Be precise about weekly quantities (e.g. "2kg rice bag", "12-pack eggs", "500ml olive oil bottle").
PANTRY ITEMS: Set "fromPantry": true and "estimatedCost": 0 for items matching user's pantry.

Return ONLY this JSON:
{"summary":{"totalEstimatedCost":0,"savingsPercent":0,"ingredientsReused":0,"wasteReductionTip":""},"cuisinesUsed":[],"weekPlan":[{"day":"Monday","cuisine":"","breakfast":{"name":"","desc":"","cuisine":"","calories":0},"lunch":{"name":"","desc":"","cuisine":"","calories":0},"dinner":{"name":"","desc":"","cuisine":"","calories":0}}],"shoppingList":[{"category":"Produce","items":[{"name":"","qty":"","estimatedCost":0,"multiUse":true,"fromPantry":false}]},{"category":"Proteins","items":[]},{"category":"Dairy & Eggs","items":[]},{"category":"Grains & Legumes","items":[]},{"category":"Pantry Staples","items":[]},{"category":"Other","items":[]}]}`

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
    ? ` Note: ${kids} children — adjust spice levels, kids get half portions.`
    : ''
  const priceContext = getPriceContext(country)

  const prompt = `Write a detailed authentic recipe for: "${name}"${cuisine ? ` (${cuisine})` : ''}${desc ? ` — ${desc}` : ''}.`
    + ` Serves ${adults || people} adults${(kids||0)>0 ? ` + ${kids} children` : ''} (${effectivePortions} effective portions).`
    + ` Diet: ${diet}. Restrictions: ${restrictions || 'none'}. Country: ${country}. Currency: ${currency}.${kidsNote}`
    + ` Prices: ${priceContext}`
    + ` Return JSON only, no markdown: {"prepTime":"","cookTime":"","difficulty":"","calories":0,"pricePerServing":0,"ingredients":[{"cookQty":"","shopQty":"","name":"","note":""}],"steps":[""],"tip":"","history":""}.`
    + ` calories = precise integer kcal for ONE adult serving.`
    + ` pricePerServing = realistic TOTAL cost in ${currency} to buy ALL ingredients from scratch in ${country}. Add up each ingredient carefully. Never underestimate.`
    + ` history = 2 concise sentences about origin and cultural story. Be brief and interesting.`
    + ` cookQty = exact cooking amount: "2 tbsp", "1/2 tsp", "3 cloves", "1/4 cup".`
    + ` shopQty = realistic store unit: "1 bottle", "1 bulb", "1 bag (500g)", "1 can (400g)". Never use fractions for shopQty.`

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
    + ` Return JSON only: {"dishName":"","cuisine":"","prepTime":"","cookTime":"","difficulty":"","servings":${people},"pricePerServing":0,"calories":0,"ingredients":[{"cookQty":"","shopQty":"","name":"","note":""}],"steps":[""],"tip":"","history":"","funFact":""}.`
    + ` calories = precise integer kcal/serving for ONE adult.`
    + ` pricePerServing = realistic TOTAL cost in ${currency} to buy ALL ingredients from scratch in ${country}. Add up each ingredient carefully using real supermarket prices. Never underestimate.`
    + ` history = 2 concise sentences about origin and cultural story.`
    + ` cookQty = exact cooking amount. shopQty = realistic store purchase unit (no fractions for fresh produce).`

  const raw = await callAPI('recipe', {
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }]
  })
  return parseJSON(raw)
}
