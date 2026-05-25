import { useState } from 'react'

export default function PantryTab({ state }) {
  const { pantry, updatePantry } = state
  const [name, setName] = useState('')
  const [exp, setExp] = useState('')

  const addItem = () => {
    if (!name.trim()) return
    updatePantry([...pantry, { id: Date.now(), name: name.trim(), exp: exp.trim() || 'Unspecified' }])
    setName(''); setExp('')
  }

  const removeItem = (id) => updatePantry(pantry.filter(p => p.id !== id))

  const isSoon = (e) => ['today','tomorrow','1 day','2 day','3 day','urgent'].some(w => e.toLowerCase().includes(w))

  return (
    <section className="sec on">
      <div className="pad">
        <div className="add-box">
          <div className="add-box-title">Add pantry or fridge item</div>
          <div className="add-row" style={{marginBottom:8}}>
            <input type="text" placeholder="Item name (e.g. Eggs, Tomatoes…)" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addItem()}/>
          </div>
          <div className="add-row">
            <input type="text" placeholder="Expiry (e.g. 3 days, next week)" value={exp} onChange={e=>setExp(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addItem()} style={{flex:1}}/>
            <button className="add-btn" onClick={addItem}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add
            </button>
          </div>
        </div>
        {!pantry.length ? (
          <div className="empty-v">
            <div className="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg></div>
            <div className="empty-t">Pantry is empty</div>
            <div className="empty-s">Add items from your fridge or pantry. Expiring-soon items get prioritised in your meal plan.</div>
          </div>
        ) : (
          <div className="plist">
            {pantry.map(p => (
              <div key={p.id} className="pitem fu">
                <div className="picon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>
                <div className="pinfo">
                  <div className="pname">{p.name}</div>
                  <div className="pexp">Expires: {p.exp}</div>
                </div>
                <span className={`pbadge ${isSoon(p.exp)?'bsoon':'bok'}`}>{isSoon(p.exp)?'⚠ Use soon':'✓ OK'}</span>
                <button className="pdel" onClick={()=>removeItem(p.id)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
