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
  const { plan, prefs, isDemo, clearPlan } = state
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
  const people = parseInt(prefs.people) || 2
  const totalCost = typeof s.totalEstimatedCost === 'number' ? s.totalEstimatedCost : 0
  const costPerMeal = totalCost > 0 ? totalCost / (7 * 3 * people) : 0
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
            <div className="stat-lbl" style={{color:'var(--gm)'}}>Est. cost per meal · total ÷ 21 meals ÷ {people} people</div>
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

        {/* DAY GROUPS */}
        {(plan.weekPlan || []).map((day, i) => (
          <div key={day.day} className="day-grp fu" style={{animationDelay:`${i*.04}s`}}>
            <div className="day-lbl">{day.day}{day.cuisine&&<span className="day-flag">{flag(day.cuisine)}</span>}</div>
            <div className="meal-list">
              {['breakfast','lunch','dinner'].map(slot => {
                const m = day[slot] || {}
                const calBadge = m.calories ? `<span class="mcal">⚡ ${m.calories} kcal</span>` : ''
                const priceBadge = costPerMeal > 0 ? `<span class="mprice">💰 ${cur}${costPerMeal.toFixed(2)} /meal</span>` : ''
                return (
                  <div key={slot} className="mcrd" style={{flexDirection:'column',gap:0}}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                      <span className={`mpill ${PC[slot]}`}>{PL[slot]}</span>
                      <div className="minfo">
                        <div className="mname">{m.name || '—'}</div>
                        {m.desc && <div className="mdesc">{m.desc}</div>}
                        <div className="meal-badges">
                          {m.calories && <span className="mcal">⚡ {m.calories} kcal</span>}
                          {costPerMeal > 0 && <span className="mprice">💰 {cur}{costPerMeal.toFixed(2)} /meal</span>}
                        </div>
                        {m.cuisine && <div className="mcuisine"><span className="flag">{flag(m.cuisine)}</span>{m.cuisine}</div>}
                      </div>
                    </div>
                    <button className="recipe-load-btn" style={{marginTop:10}} onClick={onViewRecipe}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                      View recipe
                    </button>
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
