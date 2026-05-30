import { useState, useEffect } from 'react'
import { supabase, signOut } from './supabase.js'
import AuthScreen from './components/AuthScreen.jsx'
import MainApp from './components/MainApp.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) { setLoading(false); return }

    // onAuthStateChange fires on load with INITIAL_SESSION event
    // This is the most reliable way to get session on refresh/reopen
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      // Stop loading once we get the initial session check
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        setLoading(false)
      }
    })

    // Fallback — if onAuthStateChange takes too long, stop loading after 3 seconds
    const timeout = setTimeout(() => setLoading(false), 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleSignOut = async () => {
    await signOut()
    setUser(null)
  }

  if (loading) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', gap:12 }}>
        <div className="spin" style={{ width:32, height:32 }}></div>
        <div style={{ fontSize:13, color:'var(--t3)', fontFamily:'var(--sans)' }}>Loading…</div>
      </div>
    )
  }

  if (!user && supabase) {
    return <AuthScreen />
  }

  return <MainApp user={user} onSignOut={handleSignOut} />
}
