import { useState, useEffect } from 'react'
import { supabase, signOut } from './supabase.js'
import AuthScreen from './components/AuthScreen.jsx'
import MainApp from './components/MainApp.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [guestMode, setGuestMode] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('Loading your basket…')

  useEffect(() => {
    const msgs = ['Loading your basket…', 'Checking your account…', 'Almost ready…']
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % msgs.length
      setLoadingMsg(msgs[i])
    }, 800)

    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user || null)
        setLoading(false)
        clearInterval(interval)
      })
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null)
        setGuestMode(false)
      })
      return () => { subscription.unsubscribe(); clearInterval(interval) }
    } else {
      setLoading(false)
      clearInterval(interval)
    }
  }, [])

  const handleSignOut = async () => {
    await signOut()
    setUser(null)
    setGuestMode(false)
  }

  if (loading) {
    return (
      <div style={{
        display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'center', minHeight:'100vh',
        background:'var(--bg)', gap:20
      }}>
        {/* Logo */}
        <div style={{
          width:64, height:64, background:'var(--g)', borderRadius:18,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 8px 24px rgba(31,78,26,.25)'
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" style={{width:32,height:32}}>
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
        </div>
        <div>
          <div style={{
            fontFamily:'var(--serif)', fontSize:22, fontWeight:300,
            color:'var(--t)', textAlign:'center', marginBottom:4
          }}>Smart Basket AI</div>
          <div style={{fontSize:12, color:'var(--t3)', textAlign:'center'}}>{loadingMsg}</div>
        </div>
        <div className="spin" style={{width:24, height:24, borderWidth:2}}></div>
      </div>
    )
  }

  if (!user && !guestMode && supabase) {
    return <AuthScreen onSkip={() => setGuestMode(true)} />
  }

  return <MainApp user={user} onSignOut={handleSignOut} />
}
