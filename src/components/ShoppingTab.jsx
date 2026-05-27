import { useState } from 'react'

export default function ShoppingTab({ state }) {
  const { plan, checked, updateChecked, prefs, isDemo, extraItems, updateExtraItems } = state
  const [extraOpen, setExtraOpen] = useState(true)

  const cur = plan?._cur || prefs.currency || '$'
  const budget = parseFloat(prefs.budget) || 80
  const list = plan?.shoppingList || []

  let planTotal = 0
  list.forEach(cat => (cat.items || []).forEach(i => { planTotal += (i.estimatedCost || 0) }))

  // Extra items total — use pricePerServing as total ingredient cost
  const extraTotal = (extraItems || []).reduce((sum, dish) =>
    sum + (parseFloat(dish.pricePerServing) || 0), 0)

  const total = planTotal + extraTotal
  const hasExtras = (extraItems||[]).length > 0
  const pct = Math.min(100, Math.round((total / budget) * 100))
  const rem = budget - total

  const toggleItem = (k) => {
    const newChecked = new Set(checked)
    newChecked.has(k) ? newChecked.delete(k) : newChecked.add(k)
    updateChecked(newChecked)
  }

  const uncheckAll = () => updateChecked(new Set())

  const removeExtraDish = (dishName) => {
    updateExtraItems((extraItems || []).filter(e => e.dishName !== dishName))
  }

  const copyList = () => {
    const lines = []
    list.forEach(cat => {
      lines.push(`\n${cat.category.toUpperCase()}`)
      ;(cat.items || []).forEach((item, i) => {
        const k = cat.category.replace(/\W/g,'_') + '_' + i
        lines.push(`${checked.has(k) ? '[x]' : '[ ]'} ${item.name} — ${item.qty} (${cur}${(item.estimatedCost||0).toFixed(2)})`)
      })
    })
    if ((extraItems||[]).length) {
      lines.push('\n── RECIPE EXTRAS ──')
      extraItems.forEach(dish => {
        lines.push(`\n${dish.dishName.toUpperCase()}`)
        dish.ingredients.forEach(ing => {
          lines.push(`[ ] ${ing.name}${ing.qty ? ' — ' + ing.qty : ''}`)
        })
      })
    }
    navigator.clipboard.writeText(lines.join('\n'))
    alert('Shopping list copied!')
  }

  if (!plan && !(extraItems||[]).length) return (
    <section className="sec on">
      <div className="pad">
        <div className="empty-v">
          <div className="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div>
          <div className="empty-t">List is empty</div>
          <div className="empty-s">Generate a meal plan or search a recipe and add its ingredients.</div>
        </div>
      </div>
    </section>
  )

  return (
    <section className="sec on">
      <div className="pad">
        {isDemo && (
          <div className="demo-mode-badge" style={{display:'flex'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Demo mode — sample data only.
          </div>
        )}

        {/* BUDGET CARD */}
        {(plan || hasExtras) && (
          <div className="bcard fu">
            <div className="bc-row">
              <div>
                <div className="bc-lbl">Shopping total</div>
                <div className="bc-big">{cur}{total.toFixed(2)}</div>
              </div>
              <div className="bc-right">
                <div className="bc-rem">{cur}{Math.abs(rem).toFixed(2)}</div>
                <div className="bc-remlbl">{rem>=0?'remaining':'over budget'}</div>
              </div>
            </div>
            <div className="btrack"><div className="bprog" style={{width:`${pct}%`,background:rem<0?'#e55':'var(--g)'}}></div></div>
            <div className="bmeta"><span>{cur}0</span><span>{cur}{budget.toFixed(0)} budget</span></div>
            {hasExtras && extraTotal > 0 && (
              <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid var(--bdr)',display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--t3)'}}>
                <span>📋 Meal plan: {cur}{planTotal.toFixed(2)}</span>
                <span>🛒 Recipe extras: {cur}{extraTotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
          <button className="sec-btn" onClick={uncheckAll}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            Uncheck all
          </button>
          <button className="sec-btn" onClick={copyList}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy list
          </button>
          <button className="sec-btn" onClick={()=>window.print()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print
          </button>
        </div>

        {plan && <div className="legend"><div className="mdot"></div>Green dot = used in multiple meals</div>}

        {/* PLAN SHOPPING LIST */}
        {list.map(cat => {
          if (!(cat.items || []).length) return null
          const ck = cat.category.replace(/\W/g,'_')
          return (
            <div key={cat.category} className="scat">
              <div className="scat-hd">{cat.category}</div>
              <div className="sitems">
                {cat.items.map((item, i) => {
                  const k = ck + '_' + i
                  const isc = checked.has(k)
                  return (
                    <div key={k} className={`srow${isc?' chk':''}`} onClick={()=>toggleItem(k)}>
                      <div className={`chkbox${isc?' on':''}`}></div>
                      <span className="sname">{item.name}</span>
                      {item.multiUse && <div className="mdot"></div>}
                      <span className="sqty">{item.qty||''}</span>
                      <span className="scost">{cur}{(item.estimatedCost||0).toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* RECIPE EXTRAS SECTION */}
        {(extraItems||[]).length > 0 && (
          <div style={{marginTop:20}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <button onClick={()=>setExtraOpen(p=>!p)}
                style={{display:'flex',alignItems:'center',gap:8,background:'none',border:'none',
                  cursor:'pointer',fontFamily:'var(--sans)',padding:0}}>
                <div style={{width:28,height:28,background:'#fff3cd',border:'1px solid #e6c84a',
                  borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>🛒</div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:'var(--t)',textAlign:'left'}}>Recipe Extras</div>
                  <div style={{fontSize:11,color:'var(--t3)'}}>Ingredients from searched recipes</div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{width:13,height:13,color:'var(--t3)',marginLeft:4,transform:extraOpen?'rotate(180deg)':'rotate(0deg)',transition:'transform .2s'}}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              <button onClick={()=>updateExtraItems([])}
                style={{fontSize:11,color:'var(--t3)',background:'none',border:'1px solid var(--bdr)',
                  borderRadius:99,padding:'3px 9px',cursor:'pointer',fontFamily:'var(--sans)'}}>
                Clear all
              </button>
            </div>

            {extraOpen && (extraItems||[]).map((dish, di) => (
              <div key={di} className="scat" style={{borderLeft:'3px solid #e6c84a'}}>
                <div className="scat-hd" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span>🍽️ {dish.dishName} {dish.cuisine && `(${dish.cuisine})`}</span>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    {dish.pricePerServing > 0 && (
                      <span style={{fontSize:11,color:'var(--am)',background:'var(--al)',
                        padding:'2px 7px',borderRadius:99,fontWeight:500}}>
                        Est. {cur}{Number(dish.pricePerServing).toFixed(2)} total
                      </span>
                    )}
                    <button onClick={()=>removeExtraDish(dish.dishName)}
                      style={{background:'none',border:'none',cursor:'pointer',fontSize:13,
                        color:'var(--t3)',padding:'2px 4px',lineHeight:1}}>✕</button>
                  </div>
                </div>
                <div className="sitems">
                  {(dish.ingredients||[]).map((ing, i) => {
                    const k = `extra_${di}_${i}`
                    const isc = checked.has(k)
                    return (
                      <div key={k} className={`srow${isc?' chk':''}`} onClick={()=>toggleItem(k)}>
                        <div className={`chkbox${isc?' on':''}`}></div>
                        <span className="sname">{ing.name}</span>
                        <span className="sqty">{ing.qty||''}</span>
                        <span className="scost" style={{color:'var(--t3)',fontSize:11}}>—</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
