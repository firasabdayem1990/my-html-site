import { useState, useEffect } from 'react'
import { supabase, signOut } from './supabase.js'
import AuthScreen from './components/AuthScreen.jsx'
import MainApp from './components/MainApp.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [guestMode, setGuestMode] = useState(false)

  useEffect(() => {
    // Check existing session
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user || null)
        setLoading(false)
      })
      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null)
        setGuestMode(false)
      })
      return () => subscription.unsubscribe()
    } else {
      setLoading(false)
    }
  }, [])

  const handleSignOut = async () => {
    await signOut()
    setUser(null)
    setGuestMode(false)
  }

  const handleSkip = () => {
    setGuestMode(true)
  }

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
        <div className="spin" style={{ width:32, height:32 }}></div>
      </div>
    )
  }

  if (!user && !guestMode && supabase) {
    return <AuthScreen onSkip={handleSkip} />
  }

  return <MainApp user={user} onSignOut={handleSignOut} />
}
