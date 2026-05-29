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

const flag = (c) => {
  const code = CUISINE_CODES[c]
  if (code) return <FlagImg code={code} size={14}/>
  return <span style={{fontSize:13}}>🍽️</span>
}

const PC = { breakfast:'pb', lunch:'pl', dinner:'pd' }
const PL = { breakfast:'Breakfast', lunch:'Lunch', dinner:'Dinner' }

export default function MealsTab({ state, onViewRecipe, onRegenerate }) {
  const { plan, prefs, isDemo, clearPlan, updatePlan } = state
  const [cookedMeals, setCookedMeals] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('sb_cooked_meals')||'[]')) } catch(e) { return new Set() }
  })
  const [swapping, setSwapping] = useState(null)
  const [mealRatings, setMealRatings] = useState({})

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
  const effectivePortions = adults + kids * 0.5
  const totalCost = typeof s.totalEstimatedCost === 'number' ? s.totalEstimatedCost : 0
  const costPerMeal = totalCost > 0 ? totalCost / (7 * 3 * effectivePortions) : 0
  const sav = typeof s.savingsPercent === 'number' ? Math.round(s.savingsPercent) + '%' : '—'
  const cuisines = plan._cuisines || plan.cuisinesUsed || []

  const toggleCooked = (key, mealName) => {
    const isCooked = cookedMeals.has(key)
    if (!isCooked) {
      const pantry = state.pantry || []
      if (pantry.length > 0 && mealName) {
        const mealWords = mealName.toLowerCase().split(/\s+/)
        const usedPantryItems = pantry.filter(p => {
          const pName = p.name.toLowerCase()
          return mealWords.some(w => w.length > 3 && (pName.includes(w) || w.includes(pName)))
        })
        if (usedPantryItems.length > 0) {
          const itemNames = usedPantryItems.map(p => p.name).join(', ')
          if (confirm(`Did you use these pantry items for "${mealName}"?\n\n${itemNames}\n\nTap OK to remove them from pantry.`)) {
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
      const token = (await (await import('../supabase.js').catch(()=>({supabase:null}))).supabase?.auth?.getSession())?.data?.session?.access_token
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {'Content-Type':'application/json', ...(token?{'Authorization':`Bearer ${token}`}:{})},
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 300,
          messages: [{role:'user',content:`Suggest ONE alternative ${slot} meal to replace "${currentMeal}". Diet: ${prefs.diet||'omnivore'}. Country: ${prefs.country||'Lebanon'}. Return ONLY JSON: {"name":"","desc":"","cuisine":"","calories":0}`}]
        })
      })
      const data = await response.json()
      const text = data.content?.map(b=>b.text||'').join('') || ''
      const clean = text.replace(/```json|```/g,'').trim()
      const fb = clean.indexOf('{'), lb = clean.lastIndexOf('}')
      const newMeal = JSON.parse(clean.substring(fb, lb+1))
      const updatedPlan = JSON.parse(JSON.stringify(plan))
      const dayObj = updatedPlan.weekPlan.find(d => d.day === day)
      if (dayObj) dayObj[slot] = {...newMeal}
      updatePlan(updatedPlan)
    } catch(e) { alert('Could not swap meal — please try again') }
    setSwapping(null)
  }

  return (
    <section className="sec on">
      <div className="pad">
        {isDemo && (
          <div className="demo-mode-badge" style={{display:'flex'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Demo mode — sample plan.
          </div>
        )}

        <div className="stats fu">
          <div className="stat"><div className="stat-val">{cur}{totalCost.toFixed(2)}</div><div className="stat-lbl">Estimated weekly cost</div></div>
          <div className="stat"><div className="stat-val">{sav}</div><div className="stat-lbl">Below avg. weekly spend</div></div>
          {costPerMeal > 0 && (
            <div className="stat fu" style={{gridColumn:'1/-1',background:'var(--gl)',border:'1px solid rgba(31,78,26,.12)'}}>
              <div className="stat-val" style={{fontSize:16,color:'var(--g)'}}>{cur}{costPerMeal.toFixed(2)}</div>
              <div className="stat-lbl" style={{color:'var(--gm)'}}>Est. cost per meal · {adults} adult{adults!==1?'s':''}{kids>0?` + ${kids} kid${kids!==1?'s':''}`:''}</div>
            </div>
          )}
        </div>

        {prefs.calTarget > 0 && (
          <div className="cal-stat fu">
            <div className="cal-stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>
            <div className="cal-stat-info">
              <div className="cal-stat-val">{prefs.calTarget.toLocaleString()} kcal/day</div>
              <div className="cal-stat-lbl">Your target · B:{Math.round(prefs.calTarget*.25)} L:{Math.round(prefs.calTarget*.35)} D:{Math.round(prefs.calTarget*.35)}</div>
            </div>
          </div>
        )}

        {cuisines.length > 0 && (
          <div className="cuisine-tags fu">
            {cuisines.map(c=><span key={c} className="ctag"><span className="flag">{flag(c)}</span>{c}</span>)}
          </div>
        )}

        {s.wasteReductionTip && (
          <div className="tip fu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <div className="tip-t">{s.wasteReductionTip}</div>
          </div>
        )}

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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            Clear
          </button>
        </div>

        {(plan.weekPlan || []).map((day, i) => (
          <div key={day.day} className="day-grp fu" style={{animationDelay:`${i*.04}s`}}>
            <div className="day-lbl">{day.day}{day.cuisine&&<span className="day-flag">{flag(day.cuisine)}</span>}</div>
            <div className="meal-list">
              {['breakfast','lunch','dinner'].map(slot => {
                const m = day[slot] || {}
                const rid = `${day.day}_${slot}`.replace(/\s/g, '_')
                const isCooked = cookedMeals.has(rid)
                return (
                  <div key={slot} className="mcrd" style={{flexDirection:'column',gap:0}}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                      <span className={`mpill ${PC[slot]}`}>{PL[slot]}</span>
                      <div className="minfo">
                        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                          <div className="mname" style={{textDecoration:isCooked?'line-through':'none',opacity:isCooked?0.5:1}}>{m.name || '—'}</div>
                          {isCooked && <span style={{fontSize:10,padding:'2px 6px',background:'var(--gl)',border:'1px solid rgba(31,78,26,.2)',borderRadius:99,color:'var(--g)',fontWeight:600}}>✅ Cooked!</span>}
                        </div>
                        {m.desc && <div className="mdesc">{m.desc}</div>}
                        <div className="meal-badges">
                          {m.calories && <span className="mcal">⚡ {m.calories} kcal</span>}
                          {costPerMeal > 0 && <span className="mprice">💰 {cur}{costPerMeal.toFixed(2)} /meal</span>}
                        </div>
                        {m.cuisine && <div className="mcuisine"><span className="flag">{flag(m.cuisine)}</span>{m.cuisine}</div>}
                        {/* Star rating */}
                        <div style={{display:'flex',gap:2,marginTop:4}}>
                          {[1,2,3,4,5].map(star=>(
                            <button key={star} onClick={()=>setMealRatings(p=>({...p,[m.name]:star}))}
                              style={{background:'none',border:'none',cursor:'pointer',padding:'2px',fontSize:16,
                                color:star<=(mealRatings[m.name]||0)?'#f5a623':'#ddd',lineHeight:1}}>★</button>
                          ))}
                          {mealRatings[m.name] && (
                            <span style={{fontSize:10,color:'var(--t3)',alignSelf:'center',marginLeft:2}}>
                              {mealRatings[m.name]>=4?'❤️ Loved':mealRatings[m.name]<=2?'👎 Not for me':'👍 OK'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {m.name && (
                      <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
                        <button className="recipe-load-btn" style={{flex:1}} onClick={() => onViewRecipe(rid, m)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                          View recipe
                        </button>
                        <button onClick={()=>toggleCooked(rid, m.name)}
                          style={{padding:'8px 12px',fontSize:11,fontWeight:600,
                            background:isCooked?'var(--gl)':'var(--bg2)',
                            color:isCooked?'var(--g)':'var(--t2)',
                            border:'1px solid var(--bdr)',borderRadius:'var(--r)',
                            cursor:'pointer',fontFamily:'var(--sans)',flexShrink:0}}>
                          {isCooked ? '✅ Done' : '👨‍🍳 Mark cooked'}
                        </button>
                        <button onClick={()=>swapMeal(day.day, slot, m.name)}
                          disabled={swapping?.day===day.day&&swapping?.slot===slot}
                          style={{padding:'8px 12px',fontSize:11,fontWeight:600,
                            background:'var(--bg2)',color:'var(--t2)',
                            border:'1px solid var(--bdr)',borderRadius:'var(--r)',
                            cursor:'pointer',fontFamily:'var(--sans)',flexShrink:0}}>
                          {swapping?.day===day.day&&swapping?.slot===slot?'Swapping…':'🔄 Swap'}
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
