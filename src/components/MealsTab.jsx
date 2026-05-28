import { loadAllPlans, saveMealPreference, loadWeeklySpend, saveWeeklySpend } from '../supabase.js'
import { useState, useEffect } from 'react'

const FlagImg = ({code, size=14}) => (
  <img src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
    width={size} height={size*0.75}
    style={{borderRadius:2,objectFit:'cover',flexShrink:0,verticalAlign:'middle'}}
    onError={e=>{e.target.style.display='none'}}
    alt=""/>
)

const CUISINE_CODES = {
  'Lebanese':'lb','Mediterranean':null,'Italian':'it','French':'fr',
  'Mexican':'mx','Indian':'in','Japanese':'jp','Chinese':'cn','Thai':'th',
  'Greek':'gr','Turkish':'tr','Moroccan':'ma','Syrian':'sy','Egyptian':'eg',
  'American':'us','Korean':'kr','Spanish':'es','Persian':'ir','Ethiopian':'et',
  'Brazilian':'br','Vietnamese':'vn','Indonesian':'id','Filipino':'ph',
  'Pakistani':'pk','Jordanian':'jo','Palestinian':'ps','Iraqi':'iq',
  'Saudi':'sa','Emirati':'ae','Tunisian':'tn','Armenian':'am','Georgian':'ge',
  'Peruvian':'pe','Nigerian':'ng','Caribbean':null,'Uzbek':'uz',
  'Latvian':'lv','Lithuanian':'lt','Estonian':'ee','Polish':'pl','Russian':'ru',
  'Ukrainian':'ua','Czech':'cz','Hungarian':'hu','Romanian':'ro','Bulgarian':'bg',
  'Serbian':'rs','Croatian':'hr','Portuguese':'pt','Dutch':'nl','Belgian':'be',
  'Swedish':'se','Norwegian':'no','Danish':'dk','Finnish':'fi','Austrian':'at',
  'Swiss':'ch','German':'de','Argentinian':'ar','Colombian':'co','Venezuelan':'ve',
  'Chilean':'cl','Ecuadorian':'ec','Ghanaian':'gh','Kenyan':'ke','Tanzanian':'tz',
  'Sudanese':'sd','Libyan':'ly','Algerian':'dz','Yemeni':'ye','Omani':'om',
  'Kuwaiti':'kw','Bahraini':'bh','Qatari':'qa','Bangladeshi':'bd',
  'Sri Lankan':'lk','Nepali':'np','Malaysian':'my','Singaporean':'sg',
  'Israeli':'il','Australian':'au','South African':'za','New Zealand':'nz'
}

const CUISINE_FLAGS = {
  'Lebanese':'🇱🇧','Mediterranean':'🌊','Italian':'🇮🇹','French':'🇫🇷',
  'Mexican':'🇲🇽','Indian':'🇮🇳','Japanese':'🇯🇵','Chinese':'🇨🇳',
  'Thai':'🇹🇭','Greek':'🇬🇷','Turkish':'🇹🇷','Moroccan':'🇲🇦',
  'Syrian':'🇸🇾','Egyptian':'🇪🇬','American':'🇺🇸','Korean':'🇰🇷',
  'Spanish':'🇪🇸','Persian':'🇮🇷','Ethiopian':'🇪🇹','Brazilian':'🇧🇷',
  'Vietnamese':'🇻🇳','Indonesian':'🇮🇩','Filipino':'🇵🇭','Pakistani':'🇵🇰',
  'Jordanian':'🇯🇴','Palestinian':'🇵🇸','Iraqi':'🇮🇶','Saudi':'🇸🇦',
  'Emirati':'🇦🇪','Tunisian':'🇹🇳','Armenian':'🇦🇲','Georgian':'🇬🇪',
  'Peruvian':'🇵🇪','Nigerian':'🇳🇬','Caribbean':'🏝️'
}
const flag = (c) => CUISINE_FLAGS[c] || '🌍'

const PC = { breakfast:'pb', lunch:'pl', dinner:'pd' }
const PL = { breakfast:'Breakfast', lunch:'Lunch', dinner:'Dinner' }

export default function MealsTab({ state, onViewRecipe, onRegenerate }) {
  const { plan, prefs, isDemo, clearPlan, updatePlan } = state
  const [savedPlans, setSavedPlans] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [cookedMeals, setCookedMeals] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('sb_cooked_meals')||'[]')) } catch(e) { return new Set() }
  })
  const [swapping, setSwapping] = useState(null)
  const [mealRatings, setMealRatings] = useState({})
  const [weeklySpend, setWeeklySpend] = useState([])
  const [showSummary, setShowSummary] = useState(false)
  const [leftovers, setLeftovers] = useState([])

  useEffect(() => {
    if (!state.user) return
    loadAllPlans(state.user.id).then(plans => setSavedPlans(plans)).catch(()=>{})
    loadWeeklySpend(state.user.id).then(spend => setWeeklySpend(spend)).catch(()=>{})
  }, [state.user])

  // Auto-save weekly spend when plan changes
  useEffect(() => {
    if (!plan || !state.user) return
    const weekKey = new Date().toISOString().slice(0,7) + '-W' + Math.ceil((new Date().getDate() + new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay()) / 7)
    const totalCost = plan.summary?.totalEstimatedCost || 0
    const budget = parseFloat(prefs.budget) || 80
    saveWeeklySpend(state.user.id, weekKey, totalCost, budget, cookedMeals.size).catch(()=>{})
  }, [cookedMeals.size])

  // Generate leftover suggestions when meals are cooked
  useEffect(() => {
    if (cookedMeals.size === 0) return
    const cooked = []
    ;(plan?.weekPlan||[]).forEach(day => {
      ['breakfast','lunch','dinner'].forEach(slot => {
        if (cookedMeals.has(`${day.day}_${slot}`) && day[slot]?.name) {
          cooked.push(day[slot].name)
        }
      })
    })
    if (cooked.length > 0) {
      setLeftovers(cooked.slice(-3)) // Last 3 cooked meals
    }
  }, [cookedMeals.size])
  if (!plan) return (
    <section className="sec on">
      <div className="pad">
        <div className="empty-v">
          <div className="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
          <div className="empty-t">No plan yet</div>
          <div className="empty-s">Go to Setup and tap "Generate my plan".</div>
        </div>
      </div>
    </section>
  )

  const s = plan.summary || {}
  const cur = plan._cur || '$'
  const adults = parseInt(prefs.adults) || 2
  const kids = parseInt(prefs.kids) || 0
  const people = adults + kids
  const effectivePortions = adults + kids * 0.5
  const totalCost = typeof s.totalEstimatedCost === 'number' ? s.totalEstimatedCost : 0
  const costPerMeal = totalCost > 0 ? totalCost / (7 * 3 * effectivePortions) : 0
  const sav = typeof s.savingsPercent === 'number' ? Math.round(s.savingsPercent) + '%' : '—'
  const cuisines = plan._cuisines || plan.cuisinesUsed || []

  const rateMeal = async (mealName, cuisine, rating) => {
    setMealRatings(p => ({...p, [mealName]: rating}))
    if (state.user) {
      await saveMealPreference(state.user.id, mealName, rating, cuisine).catch(()=>{})
    }
  }

  const toggleCooked = (key, mealName, day, slot) => {
    const isCooked = cookedMeals.has(key)
    if (!isCooked) {
      // Marking as cooked — check if any pantry items were used
      const pantry = state.pantry || []
      if (pantry.length > 0 && mealName) {
        const mealWords = mealName.toLowerCase().split(/\s+/)
        const usedPantryItems = pantry.filter(p => {
          const pName = p.name.toLowerCase()
          return mealWords.some(w => w.length > 3 && (pName.includes(w) || w.includes(pName)))
        })
        if (usedPantryItems.length > 0) {
          const itemNames = usedPantryItems.map(p => p.name).join(', ')
          if (confirm(`Did you use these pantry items for "${mealName}"?\n\n${itemNames}\n\nTap OK to remove them from your pantry.`)) {
            const usedIds = new Set(usedPantryItems.map(p => p.id))
            state.updatePantry(pantry.filter(p => !usedIds.has(p.id)))
          }
        }
      }
    }
    setCookedMeals(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      try { localStorage.setItem('sb_cooked_meals', JSON.stringify([...next])) } catch(e) {}
      return next
    })
  }

  const swapMeal = async (day, slot, currentMeal) => {
    setSwapping({day, slot})
    try {
      const { generateMealPlan } = await import('../ai.js')
      // Generate just one meal replacement
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(state.user ? {} : {})
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `Suggest ONE alternative ${slot} meal to replace "${currentMeal}" for ${day}. 
Diet: ${prefs.diet||'omnivore'}. Country: ${prefs.country||'Lebanon'}. Restrictions: ${prefs.restrictions||'none'}.
Return ONLY JSON: {"name":"","desc":"","cuisine":"","calories":0}`
          }]
        })
      })
      const data = await response.json()
      const text = data.content?.map(b=>b.text||'').join('') || ''
      const clean = text.replace(/```json|```/g,'').trim()
      const fb = clean.indexOf('{'), lb = clean.lastIndexOf('}')
      const newMeal = JSON.parse(clean.substring(fb, lb+1))
      
      // Update the plan
      const updatedPlan = JSON.parse(JSON.stringify(plan))
      const dayObj = updatedPlan.weekPlan.find(d => d.day === day)
      if (dayObj) dayObj[slot] = {...newMeal}
      updatePlan(updatedPlan)
    } catch(e) {
      alert('Could not swap meal — please try again')
    }
    setSwapping(null)
  }

  return (
    <section className="sec on">
      <div className="pad">
        {isDemo && (
          <div className="demo-mode-badge" style={{display:'flex'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Demo mode — sample Lebanese–Mediterranean plan.
          </div>
        )}

        {/* STATS */}
        <div className="stats fu">
          <div className="stat"><div className="stat-val">{cur}{totalCost.toFixed(2)}</div><div className="stat-lbl">Estimated weekly cost</div></div>
          <div className="stat"><div className="stat-val">{sav}</div><div className="stat-lbl">Below avg. weekly spend</div></div>
          {costPerMeal > 0 && <div className="stat fu" style={{gridColumn:'1/-1',background:'var(--gl)',border:'1px solid rgba(31,78,26,.12)'}}>
            <div className="stat-val" style={{fontSize:16,color:'var(--g)'}}>{cur}{costPerMeal.toFixed(2)}</div>
            <div className="stat-lbl" style={{color:'var(--gm)'}}>Est. cost per meal · {adults} adult{adults!==1?"s":""}{kids>0?` + ${kids} kid${kids!==1?"s":""}`:""}</div>
          </div>}
        </div>

        {/* WEEKLY SAVINGS SUMMARY */}
        {weeklySpend.length > 0 && (
          <div style={{marginBottom:12}}>
            <button onClick={()=>setShowSummary(p=>!p)}
              style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',
                padding:'10px 14px',background:'linear-gradient(135deg,#1a5c15,#2d8a27)',
                borderRadius:'var(--r)',border:'none',cursor:'pointer',fontFamily:'var(--sans)'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:16}}>📊</span>
                <span style={{fontSize:12,fontWeight:700,color:'#fff'}}>Your spending history</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{width:13,height:13,transform:showSummary?'rotate(180deg)':'rotate(0deg)',transition:'transform .2s'}}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {showSummary && (
              <div style={{padding:'12px',background:'var(--bg2)',borderRadius:'0 0 var(--r) var(--r)',
                border:'1px solid var(--bdr)',borderTop:'none'}}>
                {weeklySpend.map((w,i) => {
                  const saved = w.budget - w.total_cost
                  const pct = Math.min(100, Math.round((w.total_cost/w.budget)*100))
                  return (
                    <div key={i} style={{marginBottom:i<weeklySpend.length-1?10:0}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                        <span style={{fontSize:11,color:'var(--t2)',fontWeight:500}}>{w.week_key}</span>
                        <div style={{display:'flex',gap:8}}>
                          <span style={{fontSize:11,color:'var(--t2)'}}>{cur}{Number(w.total_cost).toFixed(2)} spent</span>
                          <span style={{fontSize:11,fontWeight:700,color:saved>=0?'var(--g)':'#e55'}}>
                            {saved>=0?`💰 $${saved.toFixed(2)} saved`:`⚠️ $${Math.abs(saved).toFixed(2)} over`}
                          </span>
                        </div>
                      </div>
                      <div style={{height:4,background:'var(--bdr)',borderRadius:99,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${pct}%`,background:pct>100?'#e55':'var(--g)',borderRadius:99}}></div>
                      </div>
                      {w.meals_cooked > 0 && (
                        <div style={{fontSize:10,color:'var(--t3)',marginTop:2}}>✅ {w.meals_cooked} meals cooked</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* LEFTOVER SUGGESTIONS */}
        {leftovers.length > 0 && (
          <div style={{marginBottom:12,padding:'10px 14px',background:'#fff9e6',
            border:'1px solid #ffe066',borderRadius:'var(--r)',borderLeft:'3px solid #f0a000'}}>
            <div style={{fontSize:12,fontWeight:700,color:'#8a6000',marginBottom:4}}>
              🍱 Use your leftovers!
            </div>
            <div style={{fontSize:11,color:'#8a6000',lineHeight:1.6}}>
              You cooked: <strong>{leftovers.join(', ')}</strong>
              <br/>💡 Use leftovers in tomorrow's lunch to save time & money!
            </div>
          </div>
        )}

        {/* CALORIE STAT */}
        {prefs.calTarget > 0 && (
          <div className="cal-stat fu">
            <div className="cal-stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>
            <div className="cal-stat-info">
              <div className="cal-stat-val">{prefs.calTarget.toLocaleString()} kcal/day</div>
              <div className="cal-stat-lbl">Your target · B:{Math.round(prefs.calTarget*.25)} L:{Math.round(prefs.calTarget*.35)} D:{Math.round(prefs.calTarget*.35)}</div>
            </div>
          </div>
        )}

        {/* CUISINE TAGS */}
        {cuisines.length > 0 && (
          <div className="cuisine-tags fu">
            {cuisines.map(c=><span key={c} className="ctag"><span className="flag">{flag(c)}</span>{c}</span>)}
          </div>
        )}

        {/* WASTE TIP */}
        {s.wasteReductionTip && (
          <div className="tip fu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <div className="tip-t">{s.wasteReductionTip}</div>
          </div>
        )}

        {/* REGEN ROW */}
        <div className="regen-row">
          <button className="sec-btn" onClick={onRegenerate}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Regenerate
          </button>
          <button className="sec-btn" style={{marginLeft:8}} onClick={()=>{
  if(!confirm('Clear your current meal plan?')) return
  if(!confirm('Are you sure? This cannot be undone.')) return
  clearPlan()
}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            Clear
          </button>
        </div>

        {/* PLAN HISTORY */}
        {savedPlans.length > 0 && (
          <div style={{marginBottom:16}}>
            <button onClick={()=>setShowHistory(p=>!p)}
              style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'1px solid var(--bdr2)',
                borderRadius:'var(--r)',padding:'7px 12px',cursor:'pointer',fontFamily:'var(--sans)',
                fontSize:12,color:'var(--t2)',width:'100%',justifyContent:'space-between'}}>
              <span>📅 Saved plans ({savedPlans.length}/4)</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{width:13,height:13,transform:showHistory?'rotate(180deg)':'rotate(0deg)',transition:'transform .2s'}}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {/* CURRENT PLAN CARD */}
            {savedPlans[0] && (
              <div style={{padding:'12px 14px',background:'linear-gradient(135deg,#1a5c15,#2d8a27)',
                borderRadius:12,marginBottom:showHistory?8:0}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontSize:10,padding:'2px 8px',background:'rgba(255,255,255,.2)',
                      borderRadius:99,color:'#fff',fontWeight:600}}>● ACTIVE</span>
                    <span style={{fontSize:11,color:'rgba(255,255,255,.8)'}}>
                      {new Date(savedPlans[0].created_at).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
                    </span>
                  </div>
                  <span style={{fontSize:11,color:'rgba(255,255,255,.8)'}}>
                    {savedPlans[0].plan_data?._cur||'$'}{Number(savedPlans[0].plan_data?.summary?.totalEstimatedCost||0).toFixed(2)} /week
                  </span>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:'#fff',marginBottom:4}}>This week's plan</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {(savedPlans[0].plan_data?.cuisinesUsed||[]).slice(0,4).map(c=>(
                    <span key={c} style={{fontSize:10,padding:'2px 8px',background:'rgba(255,255,255,.15)',
                      borderRadius:99,color:'#fff'}}>{c}</span>
                  ))}
                </div>
              </div>
            )}

            {/* OLDER PLANS */}
            {showHistory && savedPlans.slice(1).map((p,i) => {
              const date = new Date(p.created_at).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})
              const cost = Number(p.plan_data?.summary?.totalEstimatedCost||0).toFixed(2)
              const cur2 = p.plan_data?._cur||'$'
              const cuisines = (p.plan_data?.cuisinesUsed||[]).slice(0,3)
              const mealsCount = (p.plan_data?.weekPlan||[]).length * 3
              return (
                <div key={p.id} style={{padding:'12px 14px',background:'var(--bg2)',
                  borderRadius:12,border:'1px solid var(--bdr)',marginBottom:8,
                  display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:44,height:44,borderRadius:10,background:'var(--bg)',
                    border:'1px solid var(--bdr)',display:'flex',flexDirection:'column',
                    alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <div style={{fontSize:16,fontWeight:800,color:'var(--t)',lineHeight:1}}>
                      {new Date(p.created_at).getDate()}
                    </div>
                    <div style={{fontSize:9,color:'var(--t3)',fontWeight:600,letterSpacing:.5}}>
                      {new Date(p.created_at).toLocaleDateString('en-US',{month:'short'}).toUpperCase()}
                    </div>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:'var(--t)',marginBottom:3}}>{date}</div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:3}}>
                      {cuisines.map(c=>(
                        <span key={c} style={{fontSize:10,padding:'1px 6px',background:'var(--gl)',
                          borderRadius:99,color:'var(--gm)'}}>{c}</span>
                      ))}
                    </div>
                    <div style={{fontSize:11,color:'var(--t3)'}}>{cur2}{cost} · {mealsCount} meals</div>
                  </div>
                  <button onClick={()=>{updatePlan(p.plan_data);setShowHistory(false)}}
                    style={{padding:'7px 12px',background:'var(--g)',color:'#fff',border:'none',
                      borderRadius:'var(--r)',cursor:'pointer',fontFamily:'var(--sans)',
                      fontSize:11,fontWeight:700,flexShrink:0}}>
                    Load
                  </button>
                </div>
              )
            })}
            {showHistory && (
              <div style={{textAlign:'center',padding:'8px',fontSize:11,color:'var(--t3)'}}>
                {4-savedPlans.length>0
                  ? `${4-savedPlans.length} slot${4-savedPlans.length>1?'s':''} remaining`
                  : '4/4 slots full — new plan replaces oldest'}
              </div>
            )}
          </div>
        )}

        {/* DAY GROUPS */}
        {(plan.weekPlan || []).map((day, i) => (
          <div key={day.day} className="day-grp fu" style={{animationDelay:`${i*.04}s`}}>
            <div className="day-lbl">{day.day}{day.cuisine&&<span className="day-flag">{flag(day.cuisine)}</span>}</div>
            <div className="meal-list">
              {['breakfast','lunch','dinner'].map(slot => {
                const m = day[slot] || {}
                // Build recipe ID the same way RecipesTab does
                const rid = `${day.day}_${slot}`.replace(/\s/g, '_')
                return (
                  <div key={slot} className="mcrd" style={{flexDirection:'column',gap:0}}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                      <span className={`mpill ${PC[slot]}`}>{PL[slot]}</span>
                      <div className="minfo">
                        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                          <div className="mname" style={{textDecoration:cookedMeals.has(`${day.day}_${slot}`)? 'line-through':'none',opacity:cookedMeals.has(`${day.day}_${slot}`)?0.5:1}}>{m.name || '—'}</div>
                          {(state.pantry||[]).length > 0 && m.name && (
                            <span style={{fontSize:10,padding:'2px 6px',background:'#f0faf0',
                              border:'1px solid rgba(31,78,26,.15)',borderRadius:99,
                              color:'var(--gm)',fontWeight:500}}>🏠 uses pantry</span>
                          )}
                          {cookedMeals.has(`${day.day}_${slot}`) && (
                            <span style={{fontSize:10,padding:'2px 6px',background:'var(--gl)',
                              border:'1px solid rgba(31,78,26,.2)',borderRadius:99,
                              color:'var(--g)',fontWeight:600}}>✅ Cooked!</span>
                          )}
                        </div>
                        {m.desc && <div className="mdesc">{m.desc}</div>}
                        <div className="meal-badges">
                          {m.calories && <span className="mcal">⚡ {m.calories} kcal</span>}
                          {costPerMeal > 0 && <span className="mprice">💰 {cur}{costPerMeal.toFixed(2)} /meal</span>}
                        </div>
                        {m.cuisine && <div className="mcuisine"><span className="flag">{flag(m.cuisine)}</span>{m.cuisine}</div>}
                      </div>
                    </div>
                    {m.name && (
                      <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
                        <button className="recipe-load-btn" style={{flex:1}} onClick={() => onViewRecipe(rid, m)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                          View recipe
                        </button>
                        {/* MEAL RATING */}
                        <div style={{display:'flex',gap:2,marginTop:6}}>
                          {[1,2,3,4,5].map(star=>(
                            <button key={star} onClick={()=>rateMeal(m.name,m.cuisine,star)}
                              style={{background:'none',border:'none',cursor:'pointer',padding:'2px',
                                fontSize:16,color:star<=(mealRatings[m.name]||0)?'#f5a623':'#ddd',
                                lineHeight:1,transition:'color .1s'}}>★</button>
                          ))}
                          {mealRatings[m.name] && (
                            <span style={{fontSize:10,color:'var(--t3)',alignSelf:'center',marginLeft:2}}>
                              {mealRatings[m.name]>=4?'❤️ Loved it':mealRatings[m.name]<=2?'👎 Not for me':'👍 OK'}
                            </span>
                          )}
                        </div>
                        <button onClick={()=>toggleCooked(`${day.day}_${slot}`, m.name, day.day, slot)}
                          style={{padding:'8px 12px',fontSize:11,fontWeight:600,
                            background:cookedMeals.has(`${day.day}_${slot}`)? 'var(--gl)':'var(--bg2)',
                            color:cookedMeals.has(`${day.day}_${slot}`)? 'var(--g)':'var(--t2)',
                            border:'1px solid var(--bdr)',borderRadius:'var(--r)',
                            cursor:'pointer',fontFamily:'var(--sans)',flexShrink:0}}>
                          {cookedMeals.has(`${day.day}_${slot}`) ? '✅ Done' : '👨‍🍳 Mark cooked'}
                        </button>
                        <button onClick={()=>swapMeal(day.day, slot, m.name)}
                          disabled={swapping?.day===day.day&&swapping?.slot===slot}
                          style={{padding:'8px 12px',fontSize:11,fontWeight:600,
                            background:'var(--bg2)',color:'var(--t2)',
                            border:'1px solid var(--bdr)',borderRadius:'var(--r)',
                            cursor:'pointer',fontFamily:'var(--sans)',flexShrink:0}}>
                          {swapping?.day===day.day&&swapping?.slot===slot
                            ? <><div className="spin" style={{width:10,height:10,borderWidth:1.5,display:'inline-block',verticalAlign:'middle',marginRight:4}}></div>Swapping…</>
                            : '🔄 Swap meal'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
