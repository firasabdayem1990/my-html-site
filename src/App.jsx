import { useState, useEffect } from 'react'
import { supabase, signOut } from './supabase.js'
import AuthScreen from './components/AuthScreen.jsx'
import MainApp from './components/MainApp.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [notifAsked, setNotifAsked] = useState(false)

  useEffect(() => {
    const goOffline = () => setIsOffline(true)
    const goOnline = () => setIsOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])
  const [loading, setLoading] = useState(true)
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

  // Check pantry expiry and notify
  const checkPantryExpiry = (pantry) => {
    if (!pantry?.length) return
    const today = new Date()
    const expiring = pantry.filter(p => {
      const d = new Date(p.exp)
      if (isNaN(d)) return false
      const days = Math.ceil((d - today) / (1000*60*60*24))
      return days >= 0 && days <= 2
    })
    if (expiring.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('🛒 Smart Basket AI', {
        body: `${expiring.map(p=>p.name).join(', ')} ${expiring.length===1?'is':'are'} expiring soon! Use them in today's meals.`,
        icon: '/favicon.ico'
      })
    }
  }

  if (isOffline) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      minHeight:'100vh',background:'var(--bg)',gap:16,padding:24,textAlign:'center'}}>
      <div style={{width:64,height:64,background:'#fff3cd',borderRadius:18,display:'flex',
        alignItems:'center',justifyContent:'center',fontSize:32}}>📡</div>
      <div style={{fontFamily:'var(--serif)',fontSize:20,fontWeight:300,color:'var(--t)'}}>
        No internet connection
      </div>
      <div style={{fontSize:13,color:'var(--t3)',lineHeight:1.6,maxWidth:280}}>
        Smart Basket AI needs internet to generate plans and fetch recipes.
        <br/><br/>
        Your saved plans and shopping list are still available — reconnect to sync.
      </div>
      <button onClick={()=>setIsOffline(!navigator.onLine)}
        style={{padding:'12px 24px',background:'var(--g)',color:'#fff',border:'none',
          borderRadius:'var(--r)',cursor:'pointer',fontFamily:'var(--sans)',fontSize:13,fontWeight:600}}>
        Try again
      </button>
    </div>
  )

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

  if (!user && supabase) {
    return <AuthScreen />
  }

  return <MainApp user={user} onSignOut={handleSignOut} />
}
