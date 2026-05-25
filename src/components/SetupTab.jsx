import { useState } from 'react'
import { generateMealPlan } from '../ai.js'

const ALL_CUISINES = [
  {n:'Lebanese',f:'🇱🇧'},{n:'Mediterranean',f:'🌊'},{n:'Italian',f:'🇮🇹'},
  {n:'French',f:'🇫🇷'},{n:'Mexican',f:'🇲🇽'},{n:'Indian',f:'🇮🇳'},
  {n:'Japanese',f:'🇯🇵'},{n:'Chinese',f:'🇨🇳'},{n:'Thai',f:'🇹🇭'},
  {n:'Greek',f:'🇬🇷'},{n:'Turkish',f:'🇹🇷'},{n:'Moroccan',f:'🇲🇦'},
  {n:'Syrian',f:'🇸🇾'},{n:'Egyptian',f:'🇪🇬'},{n:'American',f:'🇺🇸'},
  {n:'Korean',f:'🇰🇷'},{n:'Spanish',f:'🇪🇸'},{n:'Persian',f:'🇮🇷'},
  {n:'Ethiopian',f:'🇪🇹'},{n:'Brazilian',f:'🇧🇷'},{n:'Vietnamese',f:'🇻🇳'},
  {n:'Indonesian',f:'🇮🇩'},{n:'Filipino',f:'🇵🇭'},{n:'Pakistani',f:'🇵🇰'},
  {n:'Jordanian',f:'🇯🇴'},{n:'Palestinian',f:'🇵🇸'},{n:'Iraqi',f:'🇮🇶'},
  {n:'Saudi',f:'🇸🇦'},{n:'Emirati',f:'🇦🇪'},{n:'Tunisian',f:'🇹🇳'},
  {n:'Armenian',f:'🇦🇲'},{n:'Georgian',f:'🇬🇪'},{n:'Peruvian',f:'🇵🇪'},
  {n:'Nigerian',f:'🇳🇬'},{n:'Caribbean',f:'🏝️'},{n:'Uzbek',f:'🇺🇿'},
]

const COUNTRIES = [
  'Lebanon','United States','United Kingdom','France','Germany','Italy',
  'Spain','UAE','Saudi Arabia','Jordan','Egypt','Turkey','India','Japan',
  'China','South Korea','Thailand','Mexico','Brazil','Australia','Canada',
  'Nigeria','Morocco','South Africa','Other'
]

const COUNTRY_FLAGS = {
  'Lebanon':'🇱🇧','United States':'🇺🇸','United Kingdom':'🇬🇧','France':'🇫🇷',
  'Germany':'🇩🇪','Italy':'🇮🇹','Spain':'🇪🇸','UAE':'🇦🇪','Saudi Arabia':'🇸🇦',
  'Jordan':'🇯🇴','Egypt':'🇪🇬','Turkey':'🇹🇷','India':'🇮🇳','Japan':'🇯🇵',
  'China':'🇨🇳','South Korea':'🇰🇷','Thailand':'🇹🇭','Mexico':'🇲🇽',
  'Brazil':'🇧🇷','Australia':'🇦🇺','Canada':'🇨🇦','Nigeria':'🇳🇬',
  'Morocco':'🇲🇦','South Africa':'🇿🇦','Other':'🌍'
}

const CURRENCIES = [
  {symbol:'$',name:'USD — US Dollar'},
  {symbol:'€',name:'EUR — Euro'},
  {symbol:'£',name:'GBP — British Pound'},
  {symbol:'L.L',name:'LBP — Lebanese Pound'},
  {symbol:'AED',name:'AED — UAE Dirham'},
  {symbol:'SAR',name:'SAR — Saudi Riyal'},
  {symbol:'JOD',name:'JOD — Jordanian Dinar'},
  {symbol:'EGP',name:'EGP — Egyptian Pound'},
  {symbol:'TRY',name:'TRY — Turkish Lira'},
  {symbol:'INR',name:'INR — Indian Rupee'},
  {symbol:'JPY',name:'JPY — Japanese Yen'},
  {symbol:'CNY',name:'CNY — Chinese Yuan'},
  {symbol:'KRW',name:'KRW — Korean Won'},
  {symbol:'THB',name:'THB — Thai Baht'},
  {symbol:'MXN',name:'MXN — Mexican Peso'},
  {symbol:'BRL',name:'BRL — Brazilian Real'},
  {symbol:'AUD',name:'AUD — Australian Dollar'},
  {symbol:'CAD',name:'CAD — Canadian Dollar'},
  {symbol:'MAD',name:'MAD — Moroccan Dirham'},
  {symbol:'NGN',name:'NGN — Nigerian Naira'},
  {symbol:'ZAR',name:'ZAR — South African Rand'},
  {symbol:'CHF',name:'CHF — Swiss Franc'},
  {symbol:'SEK',name:'SEK — Swedish Krona'},
  {symbol:'NOK',name:'NOK — Norwegian Krone'},
  {symbol:'Other',name:'Other — Custom symbol'},
]

export default function SetupTab({ state, onPlanGenerated }) {
  const { prefs, updatePrefs, updatePlan, pantry } = state
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [cuisineSearch, setCuisineSearch] = useState('')
  const [calResult, setCalResult] = useState(null)

  const toggleCuisine = (name) => {
    const cuisines = prefs.cuisines || []
    if (cuisines.includes(name)) {
      updatePrefs({ cuisines: cuisines.filter(c => c !== name) })
    } else if (cuisines.length < 5) {
      updatePrefs({ cuisines: [...cuisines, name] })
    }
  }

  const calcCalories = () => {
    const age = parseInt(prefs.calAge) || 0
    const weight = parseFloat(prefs.calWeight) || 0
    const height = parseFloat(prefs.calHeight) || 0
    const activity = parseFloat(prefs.calActivity) || 1.55
    const goal = prefs.calGoal || 'maintain'
    if (!age || !weight || !height) { alert('Please fill in age, weight and height.'); return }
    let bmr = prefs.calGender === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161
    let tdee = Math.round(bmr * activity)
    if (goal === 'lose') tdee = Math.round(tdee * 0.8)
    else if (goal === 'gain') tdee = Math.round(tdee * 1.1)
    updatePrefs({ calTarget: tdee })
    setCalResult(tdee)
  }

  const handleGenerate = async () => {
    setGenerating(true); setError('')
    try {
      const plan = await generateMealPlan({
        budget: parseFloat(prefs.budget) || 80,
        people: parseInt(prefs.people) || 2,
        currency: prefs.currency || '$',
        country: prefs.country || 'Lebanon',
        diet: prefs.diet || 'omnivore',
        health: prefs.health || [],
        restrictions: prefs.restrictions || '',
        pantry: pantry || [],
        cuisines: prefs.cuisines || [],
        calTarget: prefs.calTarget || 0
      })
      plan._cur = prefs.currency || '$'
      plan._cuisines = prefs.cuisines || []
      plan._country = prefs.country || 'Lebanon'
      updatePlan(plan)
      onPlanGenerated()
    } catch (e) {
      setError(e.message)
    }
    setGenerating(false)
  }

  const filtered = ALL_CUISINES.filter(c =>
    c.n.toLowerCase().includes(cuisineSearch.toLowerCase())
  )

  return (
    <section className="sec on">
      <div className="pad">
        {/* HERO */}
        <div className="hero">
          <div className="h-eye">AI-powered · Secure</div>
          <div className="h-title">Plan <em>smarter.</em><br/>Spend less.</div>
          <div className="h-sub">Personalized meal plans built around your budget, diet, cuisine preferences, and what's in your fridge.</div>
        </div>

        {/* AI BADGE */}
        <div style={{background:'var(--gl)',border:'1px solid rgba(31,78,26,.15)',borderRadius:'var(--r)',padding:'10px 14px',display:'flex',alignItems:'center',gap:8,marginBottom:18}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--g)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15,flexShrink:0}}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          <span style={{fontSize:12,color:'var(--g)'}}>AI powered — no API key needed. Just generate your plan.</span>
        </div>

        {/* CALORIE CALCULATOR */}
        <div className="cal-box">
          <div className="cal-box-title">🔥 Your daily calorie target</div>
          <div className="cal-box-sub">Fill in your details to stay fit</div>
          <div className="cal-gender">
            <button className={`cal-gender-btn${prefs.calGender==='male'?' on':''}`} onClick={() => updatePrefs({calGender:'male'})}>♂ Male</button>
            <button className={`cal-gender-btn${prefs.calGender==='female'?' on':''}`} onClick={() => updatePrefs({calGender:'female'})}>♀ Female</button>
          </div>
          <div className="cal-grid">
            <div className="cal-field"><label>Age</label><input type="number" value={prefs.calAge||''} onChange={e=>updatePrefs({calAge:e.target.value})} placeholder="25"/></div>
            <div className="cal-field"><label>Weight (kg)</label><input type="number" value={prefs.calWeight||''} onChange={e=>updatePrefs({calWeight:e.target.value})} placeholder="70"/></div>
            <div className="cal-field"><label>Height (cm)</label><input type="number" value={prefs.calHeight||''} onChange={e=>updatePrefs({calHeight:e.target.value})} placeholder="170"/></div>
            <div className="cal-field"><label>Goal</label>
              <select value={prefs.calGoal||'maintain'} onChange={e=>updatePrefs({calGoal:e.target.value})}>
                <option value="lose">Lose weight</option>
                <option value="maintain">Stay fit</option>
                <option value="gain">Build muscle</option>
              </select>
            </div>
          </div>
          <div className="cal-field" style={{marginBottom:12}}>
            <label>Activity level</label>
            <select value={prefs.calActivity||'1.55'} onChange={e=>updatePrefs({calActivity:e.target.value})}>
              <option value="1.2">Sedentary (desk job)</option>
              <option value="1.375">Light (1-3 days/week)</option>
              <option value="1.55">Moderate (3-5 days/week)</option>
              <option value="1.725">Active (6-7 days/week)</option>
              <option value="1.9">Very active (athlete)</option>
            </select>
          </div>
          <button className="cal-calc-btn" onClick={calcCalories}>Calculate my calories</button>
          {(calResult || prefs.calTarget > 0) && (
            <div className="cal-result show">
              <div className="cal-kcal">{(calResult || prefs.calTarget).toLocaleString()}</div>
              <div className="cal-kcal-lbl">calories per day</div>
              <div className="cal-breakdown">
                <div className="cal-slot"><div className="cal-slot-val">{Math.round((calResult||prefs.calTarget)*0.25)}</div><div className="cal-slot-lbl">Breakfast</div></div>
                <div className="cal-slot"><div className="cal-slot-val">{Math.round((calResult||prefs.calTarget)*0.35)}</div><div className="cal-slot-lbl">Lunch</div></div>
                <div className="cal-slot"><div className="cal-slot-val">{Math.round((calResult||prefs.calTarget)*0.35)}</div><div className="cal-slot-lbl">Dinner</div></div>
              </div>
            </div>
          )}
        </div>

        {/* BUDGET */}
        <div className="flbl">💰 Budget & household</div>
        <div className="g2">
          <div><div className="field-lbl">Weekly budget</div>
            <div className="irow"><span className="ipre">{prefs.currency||'$'}</span>
              <input type="number" value={prefs.budget||''} placeholder="80" onChange={e=>updatePrefs({budget:e.target.value})} min="5" style={{width:'100%'}}/>
            </div>
          </div>
          <div><div className="field-lbl">People to feed</div>
            <input type="number" value={prefs.people||''} placeholder="2" onChange={e=>updatePrefs({people:e.target.value})} min="1" max="20"/>
          </div>
        </div>
        <div className="g2" style={{marginTop:10}}>
          <div><div className="field-lbl">Currency</div>
            <select
              value={CURRENCIES.find(c=>c.symbol===(prefs.currency||'$'))?.symbol||'Other'}
              onChange={e=>{
                if(e.target.value!=='Other') updatePrefs({currency:e.target.value})
                else updatePrefs({currency:''})
              }}
              style={{width:'100%',padding:'10px 13px',background:'var(--bg)',border:'1px solid var(--bdr2)',borderRadius:'var(--r)',fontFamily:'var(--sans)',fontSize:13,color:'var(--t)',outline:'none'}}
            >
              {CURRENCIES.map(c=><option key={c.symbol} value={c.symbol}>{c.name}</option>)}
            </select>
            {(!CURRENCIES.find(c=>c.symbol===(prefs.currency||'$')) || prefs.currency==='') && (
              <input type="text" value={prefs.currency||''} placeholder="Type symbol e.g. ₹" onChange={e=>updatePrefs({currency:e.target.value})} maxLength="6" style={{marginTop:6}}/>
            )}
          </div>
          <div><div className="field-lbl">Your country</div>
            <select value={prefs.country||'Lebanon'} onChange={e=>updatePrefs({country:e.target.value})} style={{width:'100%',padding:'10px 13px',background:'var(--bg)',border:'1px solid var(--bdr2)',borderRadius:'var(--r)',fontFamily:'var(--sans)',fontSize:13,color:'var(--t)',outline:'none'}}>
              {COUNTRIES.map(c=><option key={c} value={c}>{COUNTRY_FLAGS[c]||'🌍'} {c}</option>)}
            </select>
          </div>
        </div>

        {/* CUISINES */}
        <div className="flbl">🌍 Cuisine style <span>(up to 5)</span></div>
        <div className="cuisine-selected">
          {(prefs.cuisines||[]).map(c=>{
            const ci = ALL_CUISINES.find(x=>x.n===c)
            return <span key={c} className="sel-tag">
              <span className="flag">{ci?.f||'🌍'}</span>{c}
              <button className="rm" onClick={()=>toggleCuisine(c)}>×</button>
            </span>
          })}
        </div>
        <div className="cuisine-featured">
          {[{n:'Lebanese',f:'🇱🇧'},{n:'Italian',f:'🇮🇹'},{n:'Indian',f:'🇮🇳'},{n:'Japanese',f:'🇯🇵'},{n:'Mexican',f:'🇲🇽'}].map(c=>(
            <button key={c.n} className={`cchip${(prefs.cuisines||[]).includes(c.n)?' on':''}`} onClick={()=>toggleCuisine(c.n)}>
              <span className="flag">{c.f}</span><span className="cname">{c.n}</span>
            </button>
          ))}
        </div>
        <div className="cuisine-search-wrap" style={{position:'relative'}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14,position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--t3)',pointerEvents:'none'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search cuisines…" value={cuisineSearch} onChange={e=>setCuisineSearch(e.target.value)} style={{paddingLeft:34}}/>
        </div>
        {cuisineSearch && (
          <div className="cuisine-dropdown open">
            {filtered.map(c=>(
              <div key={c.n} className={`cdrop-item${(prefs.cuisines||[]).includes(c.n)?' picked':''}`} onClick={()=>{toggleCuisine(c.n);setCuisineSearch('')}}>
                <span className="flag">{c.f}</span><div className="cinfo"><div>{c.n}</div></div>
              </div>
            ))}
          </div>
        )}

        {/* DIET */}
        <div className="flbl">🍗 Dietary preference</div>
        <div className="chips">
          {['omnivore','vegetarian','vegan','pescatarian','high-protein'].map(d=>(
            <button key={d} className={`chip${prefs.diet===d?' on':''}`} onClick={()=>updatePrefs({diet:d})}>
              {d==='omnivore'?'🍗':d==='vegetarian'?'🥬':d==='vegan'?'🌱':d==='pescatarian'?'🐟':'💪'} {d.charAt(0).toUpperCase()+d.slice(1)}
            </button>
          ))}
        </div>

        {/* HEALTH */}
        <div className="flbl">❤️ Health mode <span>(optional)</span></div>
        <div className="chips">
          {['heart-healthy','low-sugar','high-energy','low-calorie'].map(h=>(
            <button key={h} className={`chip${(prefs.health||[]).includes(h)?' on hon':''}`}
              onClick={()=>{
                const health = prefs.health||[]
                updatePrefs({health: health.includes(h)?health.filter(x=>x!==h):[...health,h]})
              }}>
              {h==='heart-healthy'?'❤️':h==='low-sugar'?'🍬':h==='high-energy'?'⚡':'🧘'} {h.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ')}
            </button>
          ))}
        </div>

        {/* RESTRICTIONS */}
        <div className="flbl">🚫 Allergies / restrictions <span>(optional)</span></div>
        <textarea rows="2" placeholder="e.g. no nuts, gluten-free, halal…" value={prefs.restrictions||''} onChange={e=>updatePrefs({restrictions:e.target.value})}/>

        {error && <div className="err-box" style={{marginTop:14}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>{error}</span></div>}

        <button className="cta" onClick={handleGenerate} disabled={generating}>
          {generating ? <><div className="spin" style={{width:16,height:16,borderWidth:2}}></div>&nbsp;Generating…</> : <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            Generate my plan
          </>}
        </button>
      </div>
    </section>
  )
}
