import { loadAllPlans } from '../supabase.js'
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

  useEffect(() => {
    if (!state.user) return
    loadAllPlans(state.user.id).then(plans => {
      setSavedPlans(plans)
    }).catch(() => {})
  }, [state.user])
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
          <button className="sec-btn" style={{marginLeft:8}} onClick={()=>{if(confirm('Clear this plan?'))clearPlan()}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            Clear
          </button>
        </div>

        {/* PLAN HISTORY */}
        {savedPlans.length > 1 && (
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
            {showHistory && (
              <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:6}}>
                {savedPlans.map((p,i) => {
                  const isActive = JSON.stringify(p.plan_data) === JSON.stringify(plan)
                  const date = new Date(p.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
                  return (
                    <div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                      padding:'10px 12px',background:isActive?'var(--gl)':'var(--bg2)',
                      borderRadius:'var(--r)',border:`1px solid ${isActive?'rgba(31,78,26,.2)':'var(--bdr)'}`}}>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:'var(--t)'}}>
                          {i===0?'Current plan':date}
                          {isActive&&<span style={{fontSize:10,marginLeft:6,color:'var(--g)',fontWeight:700}}>● Active</span>}
                        </div>
                        <div style={{fontSize:11,color:'var(--t3)',marginTop:2}}>
                          {p.plan_data?.cuisinesUsed?.slice(0,3).join(', ')||'Meal plan'}
                          {' · '}{p.plan_data?._cur||'$'}{p.plan_data?.summary?.totalEstimatedCost?.toFixed(2)||'—'}
                        </div>
                      </div>
                      {!isActive && (
                        <button onClick={()=>{updatePlan(p.plan_data);setShowHistory(false)}}
                          style={{padding:'5px 10px',background:'var(--g)',color:'#fff',border:'none',
                            borderRadius:'var(--r)',cursor:'pointer',fontFamily:'var(--sans)',fontSize:11,fontWeight:600}}>
                          Load
                        </button>
                      )}
                    </div>
                  )
                })}
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
                          <div className="mname">{m.name || '—'}</div>
                          {(state.pantry||[]).length > 0 && m.name && (
                            <span style={{fontSize:10,padding:'2px 6px',background:'#f0faf0',
                              border:'1px solid rgba(31,78,26,.15)',borderRadius:99,
                              color:'var(--gm)',fontWeight:500}}>🏠 uses pantry</span>
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
                      <button className="recipe-load-btn" style={{marginTop:10}} onClick={() => onViewRecipe(rid, m)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                        View recipe
                      </button>
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
