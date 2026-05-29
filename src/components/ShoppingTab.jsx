import { useState } from 'react'

const STORE_SECTIONS = {
  'Produce': { icon: '🥦', order: 1, label: 'Fruits & Vegetables' },
  'Proteins': { icon: '🥩', order: 2, label: 'Meat, Fish & Eggs' },
  'Dairy & Eggs': { icon: '🥛', order: 3, label: 'Dairy & Eggs' },
  'Grains & Legumes': { icon: '🌾', order: 4, label: 'Grains, Legumes & Pasta' },
  'Pantry Staples': { icon: '🫙', order: 5, label: 'Pantry & Condiments' },
  'Frozen': { icon: '🧊', order: 6, label: 'Frozen Foods' },
  'Bakery': { icon: '🍞', order: 7, label: 'Bakery & Bread' },
  'Beverages': { icon: '🧃', order: 8, label: 'Beverages' },
  'Other': { icon: '🛒', order: 9, label: 'Other Items' }
}

const getSection = (category) => STORE_SECTIONS[category] || { icon: '🛒', order: 9, label: category }

export default function ShoppingTab({ state }) {
  const { plan, checked, updateChecked, prefs, isDemo, extraItems, updateExtraItems } = state
  const [extraOpen, setExtraOpen] = useState(true)
  const [storeView, setStoreView] = useState(false)

  const cur = plan?._cur || prefs.currency || '$'
  
  // Smart pantry cross-reference — match shopping items against pantry in real-time
  const pantryNames = (state.pantry || []).map(p => p.name.toLowerCase().trim())
  
  // Smart ingredient synonyms — maps variations to base ingredient
  const INGREDIENT_SYNONYMS = {
    'egg yolk': 'egg', 'egg white': 'egg', 'egg yolks': 'egg', 'egg whites': 'egg',
    'eggs yolk': 'egg', 'yolk': 'egg', 'yolks': 'egg',
    'chicken breast': 'chicken', 'chicken thigh': 'chicken', 'chicken legs': 'chicken',
    'ground beef': 'beef', 'beef mince': 'beef', 'minced beef': 'beef',
    'olive oil': 'oil', 'vegetable oil': 'oil', 'sunflower oil': 'oil',
    'spring onion': 'onion', 'green onion': 'onion', 'shallot': 'onion',
    'garlic clove': 'garlic', 'garlic cloves': 'garlic',
    'lemon juice': 'lemon', 'lime juice': 'lime',
    'heavy cream': 'cream', 'double cream': 'cream', 'sour cream': 'cream',
    'all purpose flour': 'flour', 'plain flour': 'flour', 'bread flour': 'flour',
    'cherry tomato': 'tomato', 'cherry tomatoes': 'tomato', 'grape tomato': 'tomato',
    'baby spinach': 'spinach', 'frozen spinach': 'spinach',
    'parmesan cheese': 'parmesan', 'parmigiano': 'parmesan',
    'cheddar cheese': 'cheddar', 'mozzarella cheese': 'mozzarella',
    'unsalted butter': 'butter', 'salted butter': 'butter',
    'whole milk': 'milk', 'skim milk': 'milk', 'almond milk': 'milk',
    'black pepper': 'pepper', 'white pepper': 'pepper', 'red pepper': 'pepper',
    'sea salt': 'salt', 'kosher salt': 'salt', 'table salt': 'salt',
    'basmati rice': 'rice', 'jasmine rice': 'rice', 'brown rice': 'rice',
    'pasta': 'spaghetti', 'spaghetti': 'pasta', 'penne': 'pasta', 'fusilli': 'pasta',
  }

  const getBaseIngredient = (name) => {
    const lower = name.toLowerCase().trim()
    // Check synonyms first
    for (const [synonym, base] of Object.entries(INGREDIENT_SYNONYMS)) {
      if (lower.includes(synonym)) return base
    }
    // Strip descriptors
    return lower
      .replace(/\d+\s*(kg|g|ml|l|liter|litre|pack|can|bottle|bunch|piece|dozen|bag|box|jar|tube|roll|sheet|slice|head|clove|stalk|sprig|lb|oz|cup|tbsp|tsp)s?/gi, '')
      .replace(/\b(large|small|medium|fresh|dried|frozen|canned|organic|whole|ground|chopped|sliced|diced|minced|boneless|skinless|extra|virgin|pure|raw|cooked|boiled|roasted)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const getPantryMatch = (itemName) => {
    if (!itemName || !pantryNames.length) return null
    const base = getBaseIngredient(itemName)
    
    const pantryItem = (state.pantry || []).find(p => {
      const pn = p.name.toLowerCase().trim()
      const basePn = getBaseIngredient(pn)
      
      return pn.includes(base) || base.includes(pn) ||
        basePn.includes(base) || base.includes(basePn) ||
        base.replace(/s$/, '') === basePn.replace(/s$/, '') ||
        pn.replace(/s$/, '') === base.replace(/s$/, '')
    })
    return pantryItem || null
  }
  
  const isPantryMatch = (itemName) => !!getPantryMatch(itemName)
  const budget = parseFloat(prefs.budget) || 80
  const list = plan?.shoppingList || []

  let planTotal = 0
  list.forEach(cat => (cat.items || []).forEach(i => { 
    if (!i.fromPantry && !isPantryMatch(i.name)) {
      planTotal += (i.estimatedCost || 0) 
    }
  }))

  const extraTotal = (extraItems || []).reduce((sum, dish) =>
    sum + (parseFloat(dish.pricePerServing) || 0), 0)

  const total = planTotal + extraTotal
  const hasExtras = (extraItems || []).length > 0
  const pct = Math.min(100, Math.round((total / budget) * 100))
  const rem = budget - total

  const toggleItem = (k) => {
    const newChecked = new Set(checked)
    newChecked.has(k) ? newChecked.delete(k) : newChecked.add(k)
    updateChecked(newChecked)
  }

  const uncheckAll = () => {
    if (!confirm('Uncheck all items?')) return
    updateChecked(new Set())
  }

  const removeExtraDish = (dishName) => {
    updateExtraItems((extraItems || []).filter(e => e.dishName !== dishName))
  }

  const copyList = () => {
    const lines = []
    list.forEach(cat => {
      lines.push('\n' + cat.category.toUpperCase())
      ;(cat.items || []).forEach((item, i) => {
        const k = cat.category.replace(/\W/g, '_') + '_' + i
        lines.push((checked.has(k) ? '[x]' : '[ ]') + ' ' + item.name + ' — ' + (item.qty||'') + ' (' + cur + (item.estimatedCost||0).toFixed(2) + ')')
      })
    })
    if ((extraItems||[]).length) {
      lines.push('\n── RECIPE EXTRAS ──')
      extraItems.forEach(dish => {
        lines.push('\n' + dish.dishName.toUpperCase())
        dish.ingredients.forEach(ing => {
          lines.push('[ ] ' + ing.name + (ing.qty ? ' — ' + ing.qty : ''))
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
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </div>
          <div className="empty-t">List is empty</div>
          <div className="empty-s">Generate a meal plan or search a recipe and add its ingredients.</div>
        </div>
      </div>
    </section>
  )

  const renderItems = (cat) => {
    const ck = cat.category.replace(/\W/g, '_')
    const items = (cat.items || []).filter(item => !item.fromPantry)
    if (!items.length) return null
    return items.map((item, i) => {
      const k = ck + '_' + i
      const isc = checked.has(k)
      const inPantry = isPantryMatch(item.name)
      return (
        <div key={k} className={'srow' + (isc ? ' chk' : '')} 
          onClick={() => !inPantry && toggleItem(k)}
          style={{opacity: inPantry ? 0.7 : 1, background: inPantry ? '#f0faf0' : ''}}>
          {inPantry ? (
            <span style={{fontSize:14,flexShrink:0}}>✅</span>
          ) : (
            <div className={'chkbox' + (isc ? ' on' : '')}></div>
          )}
          <span className="sname" style={{textDecoration: inPantry ? 'line-through' : 'none'}}>
            {item.name}
          </span>
          {item.multiUse && <div className="mdot"></div>}
          {inPantry ? (
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:2,flexShrink:0}}>
              <span style={{fontSize:10,padding:'2px 7px',background:'var(--gl)',
                borderRadius:99,color:'var(--gm)',fontWeight:600}}>✅ In pantry</span>
              {item.qty && (
                <span style={{fontSize:9,color:'var(--t3)'}}>Need: {item.qty}</span>
              )}
            </div>
          ) : (
            <>
              <span className="sqty">{item.qty || ''}</span>
              <span className="scost">{cur}{(item.estimatedCost || 0).toFixed(2)}</span>
            </>
          )}
        </div>
      )
    })
  }

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
                <div className="bc-remlbl">{rem >= 0 ? 'remaining' : 'over budget'}</div>
              </div>
            </div>
            <div className="btrack">
              <div className="bprog" style={{width: pct + '%', background: rem < 0 ? '#e55' : 'var(--g)'}}></div>
            </div>
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
          <button className="sec-btn" onClick={() => window.print()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print
          </button>
          <button className="sec-btn" onClick={() => {
            const lines = ['🛒 *Smart Basket Shopping List*\n']
            list.forEach(cat => {
              const items = (cat.items||[]).filter(i => !i.fromPantry)
              if (!items.length) return
              lines.push('*' + cat.category + '*')
              items.forEach((item,i) => {
                const k = cat.category.replace(/[^a-z0-9]/gi,'_') + '_' + i
                const done = checked.has(k)
                lines.push((done ? '✅' : '⬜') + ' ' + item.name + ' — ' + (item.qty||'') + ' (' + cur + (item.estimatedCost||0).toFixed(2) + ')')
              })
              lines.push('')
            })
            if (total > 0) lines.push('💰 *Total: ' + cur + total.toFixed(2) + ' / Budget: ' + cur + budget.toFixed(0) + '*')
            const text = encodeURIComponent(lines.join('\n'))
            window.open('https://wa.me/?text=' + text, '_blank')
          }} style={{background:'#25d366',color:'#fff',border:'1px solid #25d366'}}>
            <svg viewBox="0 0 24 24" fill="currentColor" style={{width:13,height:13}}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.561 4.14 1.535 5.874L0 24l6.334-1.502A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.655-.502-5.19-1.378l-.37-.22-3.762.892.945-3.658-.242-.382A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            WhatsApp
          </button>
          <button className="sec-btn" onClick={() => setStoreView(p => !p)}
            style={{background: storeView ? 'var(--g)' : '', color: storeView ? '#fff' : '', border: storeView ? '1px solid var(--g)' : ''}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            {storeView ? 'Store view ✓' : 'Store view'}
          </button>
        </div>

        {plan && <div className="legend"><div className="mdot"></div>Green dot = used in multiple meals</div>}

        {/* PANTRY QUANTITY CHECK */}
        {(state.pantry||[]).length > 0 && list.length > 0 && (()=>{
          const warnings = []
          list.forEach(cat => {
            ;(cat.items||[]).forEach(item => {
              const match = getPantryMatch(item.name)
              if (match && item.qty) {
                warnings.push({
                  name: item.name,
                  needed: item.qty,
                  pantryItem: match.name
                })
              }
            })
          })
          if (!warnings.length) return null
          return (
            <div style={{marginBottom:14,padding:'10px 14px',background:'#fffbf0',
              border:'1px solid #ffe066',borderRadius:'var(--r)',borderLeft:'3px solid #f0a000'}}>
              <div style={{fontSize:12,fontWeight:700,color:'#8a6000',marginBottom:6}}>
                🏠 Check your pantry quantities
              </div>
              {warnings.map((w,i) => (
                <div key={i} style={{fontSize:11,color:'#8a6000',marginBottom:3,
                  display:'flex',alignItems:'center',gap:6}}>
                  <span>•</span>
                  <span><strong>{w.name}</strong> — you need <strong>{w.needed}</strong> this week. Check if you have enough!</span>
                </div>
              ))}
              <div style={{fontSize:10,color:'#8a6000',marginTop:6,opacity:.8}}>
                💡 If you don't have enough, uncheck "In pantry" items to add them to your buy list
              </div>
            </div>
          )
        })()}

        {/* SHOPPING LIST */}
        {storeView ? (
          [...list]
            .sort((a, b) => (getSection(a.category).order || 9) - (getSection(b.category).order || 9))
            .map(cat => {
              const sec = getSection(cat.category)
              const items = renderItems(cat)
              if (!items) return null
              return (
                <div key={cat.category} className="scat">
                  <div className="scat-hd" style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontSize:16}}>{sec.icon}</span>
                    <span>{sec.label}</span>
                  </div>
                  <div className="sitems">{items}</div>
                </div>
              )
            })
        ) : (
          list.map(cat => {
            const items = renderItems(cat)
            if (!items) return null
            return (
              <div key={cat.category} className="scat">
                <div className="scat-hd">{cat.category}</div>
                <div className="sitems">{items}</div>
              </div>
            )
          })
        )}

        {/* PANTRY ITEMS SECTION */}
        {(() => {
          const pantryItems = []
          list.forEach(cat => {
            ;(cat.items || []).forEach((item, i) => {
              if (item.fromPantry) pantryItems.push({...item, idx: i})
            })
          })
          if (!pantryItems.length) return null
          return (
            <div style={{marginTop:16,marginBottom:8}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,padding:'10px 12px',
                background:'#f0faf0',borderRadius:'var(--r)',border:'1px solid rgba(31,78,26,.15)'}}>
                <span style={{fontSize:16}}>🏠</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:'var(--g)'}}>Already in your pantry</div>
                  <div style={{fontSize:11,color:'var(--gm)'}}>No need to buy these — use what you have</div>
                </div>
              </div>
              {pantryItems.map((item, i) => {
                const pantryMatch = getPantryMatch(item.name)
                const pantryQty = pantryMatch?.quantity ? parseFloat(pantryMatch.quantity) : null
                const pantryUnit = pantryMatch?.unit || ''
                const neededQty = item.qty ? parseFloat(item.qty) : null
                const needMore = pantryQty !== null && neededQty !== null && pantryQty < neededQty
                return (
                  <div key={i} style={{padding:'8px 12px',
                    background: needMore ? '#fff9e6' : '#f8fef8',
                    borderRadius:'var(--r)',
                    border: `1px solid ${needMore ? '#ffe066' : 'rgba(31,78,26,.1)'}`,
                    marginBottom:4}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <span style={{fontSize:14}}>{needMore ? '⚠️' : '✅'}</span>
                      <span style={{fontSize:13,color:'var(--t)',flex:1,fontWeight:500}}>{item.name}</span>
                      <span style={{fontSize:11,padding:'2px 8px',
                        background: needMore ? '#ffe066' : 'rgba(31,78,26,.1)',
                        borderRadius:99,
                        color: needMore ? '#8a6000' : 'var(--gm)',
                        fontWeight:600}}>
                        {needMore ? 'Need more' : 'Have it'}
                      </span>
                    </div>
                    <div style={{display:'flex',gap:12,marginTop:4,fontSize:11}}>
                      <span style={{color:'var(--t3)'}}>
                        🛒 Need: <strong>{item.qty || '—'}</strong>
                      </span>
                      <span style={{color: needMore ? '#8a6000' : 'var(--gm)'}}>
                        🏠 Have: <strong>{pantryQty !== null ? `${pantryQty} ${pantryUnit}` : 'some'}</strong>
                      </span>
                      {needMore && neededQty && pantryQty !== null && (
                        <span style={{color:'#e55',fontWeight:600}}>
                          → Buy {Math.ceil(neededQty - pantryQty)} more
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* RECIPE EXTRAS SECTION */}
        {(extraItems || []).length > 0 && (
          <div style={{marginTop:20}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <button onClick={() => setExtraOpen(p => !p)}
                style={{display:'flex',alignItems:'center',gap:8,background:'none',border:'none',cursor:'pointer',fontFamily:'var(--sans)',padding:0}}>
                <div style={{width:28,height:28,background:'#fff3cd',border:'1px solid #e6c84a',
                  borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>🛒</div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:'var(--t)',textAlign:'left'}}>Recipe Extras</div>
                  <div style={{fontSize:11,color:'var(--t3)'}}>Ingredients from searched recipes</div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{width:13,height:13,color:'var(--t3)',marginLeft:4,transform: extraOpen ? 'rotate(180deg)' : 'rotate(0deg)',transition:'transform .2s'}}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              <button onClick={() => {
                  if (!confirm('Clear all recipe extras from shopping list?')) return
                  updateExtraItems([])
                }}
                style={{fontSize:11,color:'var(--t3)',background:'none',border:'1px solid var(--bdr)',
                  borderRadius:99,padding:'3px 9px',cursor:'pointer',fontFamily:'var(--sans)'}}>
                Clear all
              </button>
            </div>

            {extraOpen && (extraItems || []).map((dish, di) => (
              <div key={di} className="scat" style={{borderLeft:'3px solid #e6c84a'}}>
                <div className="scat-hd" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span>🍽️ {dish.dishName} {dish.cuisine && '(' + dish.cuisine + ')'}</span>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    {dish.pricePerServing > 0 && (
                      <span style={{fontSize:11,color:'var(--am)',background:'var(--al)',
                        padding:'2px 7px',borderRadius:99,fontWeight:500}}>
                        Est. {cur}{Number(dish.pricePerServing).toFixed(2)} total
                      </span>
                    )}
                    <button onClick={() => removeExtraDish(dish.dishName)}
                      style={{background:'none',border:'none',cursor:'pointer',fontSize:13,
                        color:'var(--t3)',padding:'2px 4px',lineHeight:1}}>✕</button>
                  </div>
                </div>
                <div className="sitems">
                  {(dish.ingredients || []).map((ing, i) => {
                    const k = 'extra_' + di + '_' + i
                    const isc = checked.has(k)
                    // Real-time pantry check
                    const inPantry = ing.inPantry || !!getPantryMatch(ing.name||'')
                    const isAssumed = !inPantry && (ing.qty === '✓ Assume available' || ing.shopQty === '✓ Assume available')

                    // Always show all ingredients
                    if (inPantry) return (
                      <div key={k} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',
                        background:'#f0faf0',borderRadius:'var(--r)',marginBottom:4,
                        border:'1px solid rgba(31,78,26,.15)'}}>
                        <span style={{fontSize:16}}>✅</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,color:'var(--t)',fontWeight:500}}>{ing.name}</div>
                          <div style={{fontSize:11,color:'var(--gm)',marginTop:1}}>
                            🍳 Need: {ing.cookQty||ing.qty||'—'} · 🏠 You have it in pantry — no need to buy!
                          </div>
                        </div>
                        <span style={{fontSize:10,padding:'3px 9px',background:'rgba(31,78,26,.12)',
                          borderRadius:99,color:'var(--g)',fontWeight:700,flexShrink:0}}>In pantry</span>
                      </div>
                    )
                    if (isAssumed) return (
                      <div key={k} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',
                        background:'var(--bg2)',borderRadius:'var(--r)',marginBottom:4,opacity:.7,
                        border:'1px solid var(--bdr)'}}>
                        <span style={{fontSize:14}}>🏠</span>
                        <span style={{fontSize:13,color:'var(--t2)',flex:1}}>{ing.name}</span>
                        <span style={{fontSize:10,color:'var(--t3)'}}>assumed available</span>
                      </div>
                    )
                    return (
                      <div key={k} className={'srow' + (isc ? ' chk' : '')} onClick={() => toggleItem(k)}>
                        <div className={'chkbox' + (isc ? ' on' : '')}></div>
                        <span className="sname">{ing.name}</span>
                        <span className="sqty">{ing.qty || ''}</span>
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
