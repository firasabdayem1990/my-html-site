import { useState } from 'react'
import { useAppState } from '../hooks/useAppState.js'
import SetupTab from './SetupTab.jsx'
import PantryTab from './PantryTab.jsx'
import MealsTab from './MealsTab.jsx'
import ShoppingTab from './ShoppingTab.jsx'
import RecipesTab from './RecipesTab.jsx'

const TABS = [
  { id: 'setup', label: 'Setup', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 0 0 4.93 19.07M4.93 4.93a10 10 0 0 1 14.14 14.14"/></svg> },
  { id: 'pantry', label: 'Pantry', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg> },
  { id: 'meals', label: 'Meal plan', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { id: 'shopping', label: 'Shopping', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> },
  { id: 'recipes', label: 'Recipes', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> }
]

export default function MainApp({ user, onSignOut }) {
  const [activeTab, setActiveTab] = useState('setup')
  const state = useAppState(user)

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || null
  const userInitial = userName ? userName[0].toUpperCase() : null

  return (
    <div className="shell">
      <header className="hdr">
        <div className="brand">
          <div className="bmark">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
          </div>
          <div>
            <div className="bname">Smart Basket AI</div>
            <div className="btag">Food Optimization System</div>
          </div>
          {user ? (
            <div className="user-badge" style={{ marginLeft:'auto' }}>
              <div className="user-avatar">{userInitial}</div>
              <span className="user-name">{userName}</span>
              <button className="user-signout" onClick={onSignOut}>Sign out</button>
            </div>
          ) : (
            <span style={{ fontSize:11, color:'var(--t3)', marginLeft:'auto' }}>Local mode</span>
          )}
        </div>
        <nav style={{
          display:'flex',
          borderTop:'1px solid var(--bdr)',
          margin:'0 -18px',
          padding:'0',
          overflowX:'auto',
          scrollbarWidth:'none'
        }} role="tablist">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                flex:1,
                display:'flex',
                flexDirection:'column',
                alignItems:'center',
                justifyContent:'center',
                gap:4,
                padding:'8px 4px',
                background:'none',
                border:'none',
                borderTop: activeTab===t.id ? '2px solid var(--g)' : '2px solid transparent',
                cursor:'pointer',
                WebkitTapHighlightColor:'transparent',
                transition:'all .15s',
                minWidth:0,
              }}
            >
              <span style={{
                width:22,
                height:22,
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                borderRadius:8,
                background: activeTab===t.id ? 'var(--g)' : 'transparent',
                padding: activeTab===t.id ? 4 : 0,
                transition:'all .15s',
                color: activeTab===t.id ? '#fff' : 'var(--t3)',
              }}>
                {t.icon}
              </span>
              <span style={{
                fontSize:10,
                fontFamily:'var(--sans)',
                fontWeight: activeTab===t.id ? 600 : 400,
                color: activeTab===t.id ? 'var(--g)' : 'var(--t3)',
                letterSpacing:.2,
                whiteSpace:'nowrap',
                overflow:'hidden',
                textOverflow:'ellipsis',
                maxWidth:52,
              }}>
                {t.label}
              </span>
            </button>
          ))}
        </nav>
      </header>

      <div style={{ display: activeTab === 'setup' ? 'block' : 'none' }}>
        <SetupTab state={state} onPlanGenerated={() => setActiveTab('meals')} />
      </div>
      <div style={{ display: activeTab === 'pantry' ? 'block' : 'none' }}>
        <PantryTab state={state} />
      </div>
      <div style={{ display: activeTab === 'meals' ? 'block' : 'none' }}>
        <MealsTab state={state} onViewRecipe={() => setActiveTab('recipes')} onRegenerate={() => setActiveTab('setup')} />
      </div>
      <div style={{ display: activeTab === 'shopping' ? 'block' : 'none' }}>
        <ShoppingTab state={state} />
      </div>
      <div style={{ display: activeTab === 'recipes' ? 'block' : 'none' }}>
        <RecipesTab state={state} />
      </div>
    </div>
  )
}
