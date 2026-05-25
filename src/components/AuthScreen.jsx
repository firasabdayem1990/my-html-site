import { useState } from 'react'
import { signIn, signUp } from '../supabase.js'

export default function AuthScreen({ onSkip }) {
  const [tab, setTab] = useState('in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSignIn = async () => {
    if (!email || !password) { setError('Please enter email and password.'); return }
    setLoading(true); setError('')
    try {
      await signIn(email, password)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleSignUp = async () => {
    if (!name || !email || !password) { setError('Please fill in all fields.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true); setError('')
    try {
      await signUp(email, password, name)
      setSuccess('✓ Account created! Check your email to confirm, or sign in directly.')
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const onKey = (fn) => (e) => { if (e.key === 'Enter') fn() }

  return (
    <div id="auth-screen" style={{ display:'block' }}>
      <div className="auth-shell">
        <div className="auth-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
        </div>
        <div className="auth-title">Smart Basket AI</div>
        <div className="auth-sub">Plan smarter. Spend less. Sign in to save your plans.</div>

        <div className="auth-tabs">
          <button className={`auth-tab${tab==='in'?' on':''}`} onClick={() => { setTab('in'); setError(''); setSuccess('') }}>Sign in</button>
          <button className={`auth-tab${tab==='up'?' on':''}`} onClick={() => { setTab('up'); setError(''); setSuccess('') }}>Create account</button>
        </div>

        {tab === 'in' ? (
          <div>
            <div className="auth-field">
              <label>Email</label>
              <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={onKey(handleSignIn)}/>
            </div>
            <div className="auth-field">
              <label>Password</label>
              <input type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={onKey(handleSignIn)}/>
            </div>
            <button className="auth-cta" onClick={handleSignIn} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        ) : (
          <div>
            <div className="auth-field">
              <label>Your name</label>
              <input type="text" placeholder="e.g. Firas" value={name} onChange={e => setName(e.target.value)} onKeyDown={onKey(handleSignUp)}/>
            </div>
            <div className="auth-field">
              <label>Email</label>
              <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={onKey(handleSignUp)}/>
            </div>
            <div className="auth-field">
              <label>Password <span style={{ fontWeight:300, color:'var(--t3)' }}>(min 6 characters)</span></label>
              <input type="password" placeholder="Choose a password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={onKey(handleSignUp)}/>
            </div>
            <button className="auth-cta" onClick={handleSignUp} disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </div>
        )}

        {error && <div className="auth-err">{error}</div>}
        {success && <div className="auth-ok">{success}</div>}

        <div className="auth-divider">or</div>
        <button className="auth-cta" style={{ background:'var(--bg2)', color:'var(--t2)', border:'1px solid var(--bdr2)' }} onClick={onSkip}>
          Continue without account
        </button>
        <div style={{ fontSize:11, color:'var(--t3)', textAlign:'center', marginTop:10 }}>
          Without an account your data is saved locally only
        </div>
      </div>
    </div>
  )
}
