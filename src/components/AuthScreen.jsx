import { useState } from 'react'
import { signIn, signUp, supabase } from '../supabase.js'

const FEATURES = [
  { icon: '🤖', title: 'AI meal plans', desc: 'Personalized 7-day plans in seconds' },
  { icon: '💰', title: 'Stay on budget', desc: 'Real prices for your country' },
  { icon: '🛒', title: 'Smart shopping', desc: 'Auto-generated list, nothing missed' },
  { icon: '📖', title: '100+ cuisines', desc: 'Lebanese, Italian, Japanese & more' },
]

export default function AuthScreen({ onSkip }) {
  const [screen, setScreen] = useState('welcome') // welcome | signin | signup
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSignIn = async () => {
    if (!email || !password) { setError('Please enter email and password.'); return }
    setLoading(true); setError('')
    try { await signIn(email, password) }
    catch (e) { setError(e.message) }
    setLoading(false)
  }

  const handleSignUp = async () => {
    if (!name || !email || !password) { setError('Please fill in all fields.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true); setError('')
    try {
      await signUp(email, password, name)
      setSuccess('✓ Account created! You can sign in now.')
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const onKey = (fn) => (e) => { if (e.key === 'Enter') fn() }

  // ── WELCOME SCREEN ──
  if (screen === 'welcome') return (
    <div id="auth-screen">
      <div className="auth-shell" style={{padding:'0 0 24px'}}>
        {/* HERO */}
        <div style={{background:'linear-gradient(135deg,#1a5c15,#2d8a27)',padding:'32px 24px 28px',
          borderRadius:'0 0 28px 28px',marginBottom:24,textAlign:'center'}}>
          <div style={{width:64,height:64,background:'rgba(255,255,255,.15)',borderRadius:18,
            display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" style={{width:32,height:32}}>
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
          </div>
          <div style={{fontSize:26,fontWeight:700,color:'#fff',fontFamily:'var(--serif)',marginBottom:6}}>
            Smart Basket AI
          </div>
          <div style={{fontSize:13,color:'rgba(255,255,255,.85)',lineHeight:1.5}}>
            Plan smarter. Spend less.<br/>Eat better every week.
          </div>
        </div>

        <div style={{padding:'0 24px'}}>
          {/* FEATURES */}
          <div style={{marginBottom:24}}>
            {FEATURES.map((f,i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,marginBottom:12,
                padding:'10px 14px',background:'var(--bg2)',borderRadius:'var(--r)',
                border:'1px solid var(--bdr)'}}>
                <span style={{fontSize:22,flexShrink:0}}>{f.icon}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--t)'}}>{f.title}</div>
                  <div style={{fontSize:11,color:'var(--t3)'}}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA BUTTONS */}
          <button className="auth-cta" onClick={()=>setScreen('signup')}
            style={{marginBottom:10,fontSize:15,padding:'14px'}}>
            🚀 Get started — it's free
          </button>
          <button className="auth-cta" onClick={()=>setScreen('signin')}
            style={{background:'var(--bg2)',color:'var(--t2)',border:'1px solid var(--bdr2)',
              marginBottom:10,fontSize:14,padding:'12px'}}>
            Sign in to my account
          </button>
          
          
        </div>
      </div>
    </div>
  )

  // ── SIGN IN ──
  if (screen === 'signin') return (
    <div id="auth-screen">
      <div className="auth-shell">
        <button onClick={()=>setScreen('welcome')}
          style={{background:'none',border:'none',cursor:'pointer',fontSize:13,
            color:'var(--t3)',fontFamily:'var(--sans)',marginBottom:16,padding:0,
            display:'flex',alignItems:'center',gap:4}}>
          ← Back
        </button>
        <div className="auth-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
        </div>
        <div className="auth-title">Welcome back!</div>
        <div className="auth-sub">Sign in to access your saved plans</div>

        {!showForgot ? (<>
          <div className="auth-field">
            <label>Email</label>
            <input type="email" placeholder="you@email.com" value={email}
              onChange={e=>setEmail(e.target.value)} onKeyDown={onKey(handleSignIn)}/>
          </div>
          <div className="auth-field">
            <label>Password</label>
            <div style={{position:'relative'}}>
              <input type={showPass?'text':'password'} placeholder="Your password" value={password}
                onChange={e=>setPassword(e.target.value)} onKeyDown={onKey(handleSignIn)}
                style={{paddingRight:40}}/>
              <button onClick={()=>setShowPass(p=>!p)}
                style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',
                  background:'none',border:'none',cursor:'pointer',fontSize:12,color:'var(--t3)'}}>
                {showPass?'Hide':'Show'}
              </button>
            </div>
          </div>
          {error && <div className="auth-err">{error}</div>}
          {success && <div className="auth-ok">{success}</div>}
          <button className="auth-cta" onClick={handleSignIn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <button style={{background:'none',border:'none',cursor:'pointer',fontSize:12,
            color:'var(--t3)',fontFamily:'var(--sans)',marginTop:8,textDecoration:'underline'}}
            onClick={()=>setShowForgot(true)}>
            Forgot your password?
          </button>
          <div className="auth-divider">don't have an account?</div>
          <button className="auth-cta" style={{background:'var(--bg2)',color:'var(--t2)',
            border:'1px solid var(--bdr2)'}} onClick={()=>setScreen('signup')}>
            Create free account
          </button>
        </>) : (
          <div style={{background:'var(--bg2)',borderRadius:'var(--r)',padding:14,marginTop:12}}>
            <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Reset password</div>
            <div className="auth-field">
              <label>Your email</label>
              <input type="email" placeholder="you@email.com" value={forgotEmail}
                onChange={e=>setForgotEmail(e.target.value)}/>
            </div>
            {!forgotSent ? (
              <button className="auth-cta" onClick={async()=>{
                if(!forgotEmail) return
                await supabase.auth.resetPasswordForEmail(forgotEmail,{redirectTo:window.location.origin})
                setForgotSent(true)
              }}>Send reset link</button>
            ) : (
              <div style={{fontSize:12,color:'var(--gm)',marginTop:8}}>✓ Check your email for a reset link!</div>
            )}
            <button style={{background:'none',border:'none',cursor:'pointer',fontSize:11,
              color:'var(--t3)',marginTop:8,fontFamily:'var(--sans)'}}
              onClick={()=>{setShowForgot(false);setForgotSent(false)}}>Cancel</button>
          </div>
        )}
        <div style={{marginTop:12}}>
          
        </div>
      </div>
    </div>
  )

  // ── SIGN UP ──
  return (
    <div id="auth-screen">
      <div className="auth-shell">
        <button onClick={()=>setScreen('welcome')}
          style={{background:'none',border:'none',cursor:'pointer',fontSize:13,
            color:'var(--t3)',fontFamily:'var(--sans)',marginBottom:16,padding:0,
            display:'flex',alignItems:'center',gap:4}}>
          ← Back
        </button>
        <div className="auth-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
        </div>
        <div className="auth-title">Create your account</div>
        <div className="auth-sub">Free forever — your data stays private</div>

        <div className="auth-field">
          <label>Your name</label>
          <input type="text" placeholder="e.g. Firas" value={name}
            onChange={e=>setName(e.target.value)} onKeyDown={onKey(handleSignUp)}/>
        </div>
        <div className="auth-field">
          <label>Email</label>
          <input type="email" placeholder="you@email.com" value={email}
            onChange={e=>setEmail(e.target.value)} onKeyDown={onKey(handleSignUp)}/>
        </div>
        <div className="auth-field">
          <label>Password <span style={{fontWeight:300,color:'var(--t3)'}}>(min 6 characters)</span></label>
          <div style={{position:'relative'}}>
            <input type={showPass?'text':'password'} placeholder="Choose a password" value={password}
              onChange={e=>setPassword(e.target.value)} onKeyDown={onKey(handleSignUp)}
              style={{paddingRight:40}}/>
            <button onClick={()=>setShowPass(p=>!p)}
              style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',
                background:'none',border:'none',cursor:'pointer',fontSize:12,color:'var(--t3)'}}>
              {showPass?'Hide':'Show'}
            </button>
          </div>
        </div>

        {error && <div className="auth-err">{error}</div>}
        {success && <div className="auth-ok">{success}</div>}

        <button className="auth-cta" onClick={handleSignUp} disabled={loading}>
          {loading ? 'Creating account…' : 'Create free account'}
        </button>

        <div className="auth-divider">already have an account?</div>
        <button className="auth-cta" style={{background:'var(--bg2)',color:'var(--t2)',
          border:'1px solid var(--bdr2)'}} onClick={()=>setScreen('signin')}>
          Sign in
        </button>
        <div style={{marginTop:12}}>
          
        </div>
      </div>
    </div>
  )
}
