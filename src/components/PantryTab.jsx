import { useState } from 'react'

export default function PantryTab({ state }) {
  const { pantry, updatePantry } = state
  const [name, setName] = useState('')
  const [exp, setExp] = useState('')
  const [filter, setFilter] = useState('all')

  const addItem = () => {
    if (!name.trim()) return
    updatePantry([...pantry, { id: Date.now(), name: name.trim(), exp: exp.trim() || 'Unspecified' }])
    setName(''); setExp('')
  }

  const removeItem = (id) => {
    const item = pantry.find(p => p.id === id)
    if (!confirm('Remove "' + (item?.name||'this item') + '" from pantry?')) return
    updatePantry(pantry.filter(p => p.id !== id))
  }

  // Smart expiry detection using actual dates and text
  const getExpiryStatus = (e) => {
    if (!e || e === 'Unspecified') return 'ok'
    const lower = e.toLowerCase()
    
    // Check for actual date
    const dateAttempt = new Date(e)
    if (!isNaN(dateAttempt)) {
      const diff = (dateAttempt - new Date()) / (1000 * 60 * 60 * 24)
      if (diff < 0) return 'expired'
      if (diff <= 2) return 'urgent'
      if (diff <= 5) return 'soon'
      return 'ok'
    }
    
    // Text-based detection
    if (['expired','expir'].some(w => lower.includes(w))) return 'expired'
    if (['today','tonight','1 day','urgent','asap'].some(w => lower.includes(w))) return 'urgent'
    if (['tomorrow','2 day','3 day','soon','this week'].some(w => lower.includes(w))) return 'soon'
    return 'ok'
  }

  const STATUS = {
    expired: { label: '⛔ Expired', bg: '#fff0f0', border: '#ffcccc', badge: '#dc3545', text: 'Use or toss!' },
    urgent:  { label: '🔴 Use today', bg: '#fff5f0', border: '#ffd0b0', badge: '#e55', text: 'Use today!' },
    soon:    { label: '🟡 Use soon', bg: '#fffbf0', border: '#ffe066', badge: '#f0a000', text: 'Use soon' },
    ok:      { label: '✅ Fresh', bg: 'var(--bg2)', border: 'var(--bdr)', badge: 'var(--g)', text: '✓ OK' }
  }

  const expiredItems = pantry.filter(p => getExpiryStatus(p.exp) === 'expired')
  const urgentItems = pantry.filter(p => getExpiryStatus(p.exp) === 'urgent')
  const soonItems = pantry.filter(p => getExpiryStatus(p.exp) === 'soon')
  const okItems = pantry.filter(p => getExpiryStatus(p.exp) === 'ok')

  const filteredPantry = filter === 'all' ? pantry
    : filter === 'expired' ? expiredItems
    : filter === 'urgent' ? urgentItems
    : filter === 'soon' ? soonItems
    : okItems

  return (
    <section className="sec on">
      <div className="pad">

        {/* EXPIRY ALERTS */}
        {(expiredItems.length > 0 || urgentItems.length > 0) && (
          <div style={{marginBottom:16}}>
            {expiredItems.length > 0 && (
              <div style={{padding:'10px 14px',background:'#fff0f0',border:'1px solid #ffcccc',
                borderRadius:'var(--r)',marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:18}}>⛔</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:'#dc3545'}}>
                    {expiredItems.length} item{expiredItems.length>1?'s':''} expired!
                  </div>
                  <div style={{fontSize:11,color:'#dc3545',opacity:.8}}>
                    {expiredItems.map(p=>p.name).join(', ')} — please remove or use immediately
                  </div>
                </div>
              </div>
            )}
            {urgentItems.length > 0 && (
              <div style={{padding:'10px 14px',background:'#fff5f0',border:'1px solid #ffd0b0',
                borderRadius:'var(--r)',display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:18}}>🔴</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:'#e55'}}>
                    {urgentItems.length} item{urgentItems.length>1?'s':''} expiring today!
                  </div>
                  <div style={{fontSize:11,color:'#e55',opacity:.8}}>
                    {urgentItems.map(p=>p.name).join(', ')} — use in today's meals
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ADD ITEM */}
        <div className="add-box">
          <div className="add-box-title">Add pantry or fridge item</div>
          <div className="add-row" style={{marginBottom:8}}>
            <input type="text" placeholder="Item name (e.g. Eggs, Tomatoes…)" value={name}
              onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addItem()}/>
          </div>
          <div className="add-row">
            <input type="date" value={exp} onChange={e=>setExp(e.target.value)}
              style={{flex:1,padding:'10px 13px',background:'var(--bg)',border:'1px solid var(--bdr2)',
                borderRadius:'var(--r)',fontFamily:'var(--sans)',fontSize:13,color:'var(--t)',outline:'none'}}/>
            <button className="add-btn" onClick={addItem}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add
            </button>
          </div>
          <div style={{fontSize:11,color:'var(--t3)',marginTop:6}}>
            💡 Pick an expiry date — we'll warn you before items go bad
          </div>
        </div>

        {!pantry.length ? (
          <div className="empty-v">
            <div className="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg></div>
            <div className="empty-t">Pantry is empty</div>
            <div className="empty-s">Add items from your fridge or pantry. Expiring-soon items get prioritised in your meal plan.</div>
          </div>
        ) : (
          <>
            {/* FILTER TABS */}
            <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
              {[
                {id:'all', label:`All (${pantry.length})`},
                {id:'expired', label:`⛔ Expired (${expiredItems.length})`, hide: expiredItems.length===0},
                {id:'urgent', label:`🔴 Today (${urgentItems.length})`, hide: urgentItems.length===0},
                {id:'soon', label:`🟡 Soon (${soonItems.length})`, hide: soonItems.length===0},
                {id:'ok', label:`✅ Fresh (${okItems.length})`}
              ].filter(f=>!f.hide).map(f=>(
                <button key={f.id} onClick={()=>setFilter(f.id)}
                  style={{padding:'5px 12px',fontSize:11,fontWeight:filter===f.id?700:400,
                    background:filter===f.id?'var(--g)':'var(--bg2)',
                    color:filter===f.id?'#fff':'var(--t2)',
                    border:`1px solid ${filter===f.id?'var(--g)':'var(--bdr)'}`,
                    borderRadius:99,cursor:'pointer',fontFamily:'var(--sans)'}}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* PANTRY LIST */}
            <div className="plist">
              {filteredPantry.map(p => {
                const status = getExpiryStatus(p.exp)
                const s = STATUS[status]
                // Format date nicely
                const dateAttempt = new Date(p.exp)
                const displayExp = !isNaN(dateAttempt) && p.exp
                  ? dateAttempt.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
                  : p.exp
                // Days remaining
                const daysLeft = !isNaN(dateAttempt) && p.exp
                  ? Math.ceil((dateAttempt - new Date()) / (1000*60*60*24))
                  : null
                return (
                  <div key={p.id} className="pitem fu" style={{
                    background: s.bg,
                    border: `1px solid ${s.border}`,
                    borderLeft: `3px solid ${s.badge}`
                  }}>
                    <div className="picon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                      </svg>
                    </div>
                    <div className="pinfo">
                      <div className="pname">{p.name}</div>
                      <div className="pexp">
                        {displayExp !== 'Unspecified' ? `Expires: ${displayExp}` : 'No expiry set'}
                        {daysLeft !== null && (
                          <span style={{marginLeft:6,fontWeight:600,
                            color: daysLeft < 0 ? '#dc3545' : daysLeft <= 2 ? '#e55' : daysLeft <= 5 ? '#f0a000' : 'var(--gm)'}}>
                            {daysLeft < 0 ? `(${Math.abs(daysLeft)}d ago)` 
                              : daysLeft === 0 ? '(today!)' 
                              : daysLeft === 1 ? '(tomorrow!)' 
                              : `(${daysLeft}d left)`}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{fontSize:10,padding:'3px 8px',background:s.badge,color:'#fff',
                      borderRadius:99,fontWeight:600,flexShrink:0,whiteSpace:'nowrap'}}>
                      {s.text}
                    </span>
                    <button className="pdel" onClick={()=>removeItem(p.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
