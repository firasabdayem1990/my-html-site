import { useState } from 'react'
import { generateMealPlan } from '../ai.js'

const ALL_CUISINES = [
  {n:'Lebanese',f:'🇱🇧'},{n:'Mediterranean',f:'🌊'},{n:'Italian',f:'🇮🇹'},
  {n:'French',f:'🇫🇷'},{n:'Mexican',f:'🇲🇽'},{n:'Indian',f:'🇮🇳'},
  {n:'Japanese',f:'🇯🇵'},{n:'Chinese',f:'🇨🇳'},{n:'Thai',f:'🇹🇭'},
  {n:'Greek',f:'🇬🇷'},{n:'Turkish',f:'🇹🇷'},{n:'Moroccan',f:'🇲🇦'},
  {n:'Syrian',f:'🇸🇾'},{n:'Egyptian',f:'🇪🇬'},{n:'American',f:'🇺🇸'},
  {n:'Korean',f:'🇰🇷'},{n:'Spanish',f:'🇪🇸'},{n:'Persian',f:'🇮🇷'},
  {n:'Ethiopian',f:'🇪🇹'},{n:'Brazilian',f:'🇧🇷'},{n:'Vietnamese',f:'🇻🇳'},
  {n:'Indonesian',f:'🇮🇩'},{n:'Filipino',f:'🇵🇭'},{n:'Pakistani',f:'🇵🇰'},
  {n:'Jordanian',f:'🇯🇴'},{n:'Palestinian',f:'🇵🇸'},{n:'Iraqi',f:'🇮🇶'},
  {n:'Saudi',f:'🇸🇦'},{n:'Emirati',f:'🇦🇪'},{n:'Tunisian',f:'🇹🇳'},
  {n:'Armenian',f:'🇦🇲'},{n:'Georgian',f:'🇬🇪'},{n:'Peruvian',f:'🇵🇪'},
  {n:'Nigerian',f:'🇳🇬'},{n:'Caribbean',f:'🏝️'},{n:'Uzbek',f:'🇺🇿'},
  {n:'Latvian',f:'🇱🇻'},{n:'Lithuanian',f:'🇱🇹'},{n:'Estonian',f:'🇪🇪'},
  {n:'Polish',f:'🇵🇱'},{n:'Russian',f:'🇷🇺'},{n:'Ukrainian',f:'🇺🇦'},
  {n:'Czech',f:'🇨🇿'},{n:'Hungarian',f:'🇭🇺'},{n:'Romanian',f:'🇷🇴'},
  {n:'Bulgarian',f:'🇧🇬'},{n:'Serbian',f:'🇷🇸'},{n:'Croatian',f:'🇭🇷'},
  {n:'Portuguese',f:'🇵🇹'},{n:'Dutch',f:'🇳🇱'},{n:'Belgian',f:'🇧🇪'},
  {n:'Swedish',f:'🇸🇪'},{n:'Norwegian',f:'🇳🇴'},{n:'Danish',f:'🇩🇰'},
  {n:'Finnish',f:'🇫🇮'},{n:'Austrian',f:'🇦🇹'},{n:'Swiss',f:'🇨🇭'},
  {n:'German',f:'🇩🇪'},{n:'Argentinian',f:'🇦🇷'},{n:'Colombian',f:'🇨🇴'},
  {n:'Venezuelan',f:'🇻🇪'},{n:'Chilean',f:'🇨🇱'},{n:'Ecuadorian',f:'🇪🇨'},
  {n:'Ghanaian',f:'🇬🇭'},{n:'Kenyan',f:'🇰🇪'},{n:'Tanzanian',f:'🇹🇿'},
  {n:'Sudanese',f:'🇸🇩'},{n:'Libyan',f:'🇱🇾'},{n:'Algerian',f:'🇩🇿'},
  {n:'Yemeni',f:'🇾🇪'},{n:'Omani',f:'🇴🇲'},{n:'Kuwaiti',f:'🇰🇼'},
  {n:'Bahraini',f:'🇧🇭'},{n:'Qatari',f:'🇶🇦'},{n:'Bangladeshi',f:'🇧🇩'},
  {n:'Sri Lankan',f:'🇱🇰'},{n:'Nepali',f:'🇳🇵'},{n:'Burmese',f:'🇲🇲'},
  {n:'Malaysian',f:'🇲🇾'},{n:'Singaporean',f:'🇸🇬'},{n:'Cambodian',f:'🇰🇭'},
  {n:'Laotian',f:'🇱🇦'},{n:'Taiwanese',f:'🇹🇼'},{n:'Mongolian',f:'🇲🇳'},
  {n:'Kazakhstani',f:'🇰🇿'},{n:'Afghan',f:'🇦🇫'},{n:'Israeli',f:'🇮🇱'},
  {n:'Cypriot',f:'🇨🇾'},{n:'Maltese',f:'🇲🇹'},{n:'Icelandic',f:'🇮🇸'},
  {n:'New Zealand',f:'🇳🇿'},{n:'Australian',f:'🇦🇺'},{n:'South African',f:'🇿🇦'},
  {n:'Zimbabwean',f:'🇿🇼'},{n:'Mozambican',f:'🇲🇿'},{n:'Senegalese',f:'🇸🇳'},
  {n:'Ivorian',f:'🇨🇮'},{n:'Cameroonian',f:'🇨🇲'},{n:'Congolese',f:'🇨🇩'},
]

const COUNTRIES = [
  'Lebanon','United States','United Kingdom','France','Germany','Italy',
  'Spain','UAE','Saudi Arabia','Jordan','Egypt','Turkey','India','Japan',
  'China','South Korea','Thailand','Mexico','Brazil','Australia','Canada',
  'Nigeria','Morocco','South Africa','Latvia','Lithuania','Estonia',
  'Poland','Russia','Ukraine','Czech Republic','Hungary','Romania',
  'Bulgaria','Serbia','Croatia','Portugal','Netherlands','Belgium',
  'Sweden','Norway','Denmark','Finland','Austria','Switzerland',
  'Argentina','Colombia','Venezuela','Chile','Ecuador','Ghana',
  'Kenya','Tanzania','Sudan','Libya','Algeria','Yemen','Oman',
  'Kuwait','Bahrain','Qatar','Bangladesh','Sri Lanka','Nepal',
  'Myanmar','Malaysia','Singapore','Cambodia','Taiwan','Mongolia',
  'Kazakhstan','Afghanistan','Israel','Cyprus','Malta','Iceland',
  'New Zealand','Zimbabwe','Mozambique','Senegal','Cameroon','Other'
]

const COUNTRY_FLAGS = {
  'Lebanon':'🇱🇧','United States':'🇺🇸','United Kingdom':'🇬🇧','France':'🇫🇷',
  'Germany':'🇩🇪','Italy':'🇮🇹','Spain':'🇪🇸','UAE':'🇦🇪','Saudi Arabia':'🇸🇦',
  'Jordan':'🇯🇴','Egypt':'🇪🇬','Turkey':'🇹🇷','India':'🇮🇳','Japan':'🇯🇵',
  'China':'🇨🇳','South Korea':'🇰🇷','Thailand':'🇹🇭','Mexico':'🇲🇽',
  'Brazil':'🇧🇷','Australia':'🇦🇺','Canada':'🇨🇦','Nigeria':'🇳🇬',
  'Morocco':'🇲🇦','South Africa':'🇿🇦','Latvia':'🇱🇻','Lithuania':'🇱🇹',
  'Estonia':'🇪🇪','Poland':'🇵🇱','Russia':'🇷🇺','Ukraine':'🇺🇦',
  'Czech Republic':'🇨🇿','Hungary':'🇭🇺','Romania':'🇷🇴','Bulgaria':'🇧🇬',
  'Serbia':'🇷🇸','Croatia':'🇭🇷','Portugal':'🇵🇹','Netherlands':'🇳🇱',
  'Belgium':'🇧🇪','Sweden':'🇸🇪','Norway':'🇳🇴','Denmark':'🇩🇰',
  'Finland':'🇫🇮','Austria':'🇦🇹','Switzerland':'🇨🇭','Argentina':'🇦🇷',
  'Colombia':'🇨🇴','Venezuela':'🇻🇪','Chile':'🇨🇱','Ecuador':'🇪🇨',
  'Ghana':'🇬🇭','Kenya':'🇰🇪','Tanzania':'🇹🇿','Sudan':'🇸🇩',
  'Libya':'🇱🇾','Algeria':'🇩🇿','Yemen':'🇾🇪','Oman':'🇴🇲',
  'Kuwait':'🇰🇼','Bahrain':'🇧🇭','Qatar':'🇶🇦','Bangladesh':'🇧🇩',
  'Sri Lanka':'🇱🇰','Nepal':'🇳🇵','Myanmar':'🇲🇲','Malaysia':'🇲🇾',
  'Singapore':'🇸🇬','Cambodia':'🇰🇭','Taiwan':'🇹🇼','Mongolia':'🇲🇳',
  'Kazakhstan':'🇰🇿','Afghanistan':'🇦🇫','Israel':'🇮🇱','Cyprus':'🇨🇾',
  'Malta':'🇲🇹','Iceland':'🇮🇸','New Zealand':'🇳🇿','Zimbabwe':'🇿🇼',
  'Mozambique':'🇲🇿','Senegal':'🇸🇳','Cameroon':'🇨🇲','Other':'🌍'
}

const CURRENCIES = [
  {symbol:'$',name:'USD — US Dollar'},
  {symbol:'€',name:'EUR — Euro'},
  {symbol:'£',name:'GBP — British Pound'},
  {symbol:'L.L',name:'LBP — Lebanese Pound'},
  {symbol:'AED',name:'AED — UAE Dirham'},
  {symbol:'SAR',name:'SAR — Saudi Riyal'},
  {symbol:'JOD',name:'JOD — Jordanian Dinar'},
  {symbol:'EGP',name:'EGP — Egyptian Pound'},
  {symbol:'TRY',name:'TRY — Turkish Lira'},
  {symbol:'INR',name:'INR — Indian Rupee'},
  {symbol:'JPY',name:'JPY — Japanese Yen'},
  {symbol:'CNY',name:'CNY — Chinese Yuan'},
  {symbol:'KRW',name:'KRW — Korean Won'},
  {symbol:'THB',name:'THB — Thai Baht'},
  {symbol:'MXN',name:'MXN — Mexican Peso'},
  {symbol:'BRL',name:'BRL — Brazilian Real'},
  {symbol:'AUD',name:'AUD — Australian Dollar'},
  {symbol:'CAD',name:'CAD — Canadian Dollar'},
  {symbol:'MAD',name:'MAD — Moroccan Dirham'},
  {symbol:'NGN',name:'NGN — Nigerian Naira'},
  {symbol:'ZAR',name:'ZAR — South African Rand'},
  {symbol:'CHF',name:'CHF — Swiss Franc'},
  {symbol:'SEK',name:'SEK — Swedish Krona'},
  {symbol:'NOK',name:'NOK — Norwegian Krone'},
  {symbol:'PLN',name:'PLN — Polish Zloty'},
  {symbol:'CZK',name:'CZK — Czech Koruna'},
  {symbol:'HUF',name:'HUF — Hungarian Forint'},
  {symbol:'RON',name:'RON — Romanian Leu'},
  {symbol:'Other',name:'Other — Custom symbol'},
]

export default function SetupTab({ state, onPlanGenerated }) {
  const { prefs, updatePrefs, updatePlan, pantry } = state
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [cuisineSearch, setCuisineSearch] = useState('')
  const [calResult, setCalResult] = useState(null)
  const [calOpen, setCalOpen] = useState(false)

  // Adults + kids counts
  const adults = parseInt(prefs.adults) || 2
  const kids = parseInt(prefs.kids) || 0
  const totalPeople = adults + kids

  const toggleCuisine = (name) => {
    const cuisines = prefs.cuisines || []
    if (cuisines.includes(name)) {
      updatePrefs({ cuisines: cuisines.filter(c => c !== name) })
    } else if (cuisines.length < 5) {
      updatePrefs({ cuisines: [...cuisines, name] })
    }
  }

  const calcCalories = () => {
    const age = parseInt(prefs.calAge) || 0
    const weight = parseFloat(prefs.calWeight) || 0
    const height = parseFloat(prefs.calHeight) || 0
    const activity = parseFloat(prefs.calActivity) || 1.55
    const goal = prefs.calGoal || 'maintain'
    if (!age || !weight || !height) { alert('Please fill in age, weight and height.'); return }
    // Mifflin-St Jeor — more accurate than Harris-Benedict
    let bmr = prefs.calGender === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161
    let tdee = Math.round(bmr * activity)
    if (goal === 'lose') tdee = Math.round(tdee * 0.82)       // ~500 kcal deficit
    else if (goal === 'gain') tdee = Math.round(tdee * 1.12)   // ~250-300 kcal surplus
    updatePrefs({ calTarget: tdee })
    setCalResult(tdee)
  }

  const handleGenerate = async () => {
    setGenerating(true); setError('')
    try {
      const plan = await generateMealPlan({
        budget: parseFloat(prefs.budget) || 80,
        adults,
        kids,
        people: totalPeople,
        currency: prefs.currency || '$',
        country: prefs.country || 'Lebanon',
        diet: prefs.diet || 'omnivore',
        health: prefs.health || [],
        restrictions: prefs.restrictions || '',
        pantry: pantry || [],
        cuisines: prefs.cuisines || [],
        calTarget: prefs.calTarget || 0
      })
      plan._cur = prefs.currency || '$'
      plan._cuisines = prefs.cuisines || []
      plan._country = prefs.country || 'Lebanon'
      plan._adults = adults
      plan._kids = kids
      try { localStorage.removeItem('sb_recipe_cache') } catch(e) {}
      updatePlan(plan)
      onPlanGenerated()
    } catch (e) {
      setError(e.message)
    }
    setGenerating(false)
  }

  const filtered = ALL_CUISINES.filter(c =>
    c.n.toLowerCase().includes(cuisineSearch.toLowerCase())
  )

  // Compact calorie breakdown
  const cal = calResult || prefs.calTarget || 0
  const bfast = Math.round(cal * 0.25)
  const lunch = Math.round(cal * 0.35)
  const dinner = Math.round(cal * 0.35)
  const snack = cal - bfast - lunch - dinner

  return (
    <section className="sec on">
      <div className="pad">

        {/* COMPACT HERO */}
        <div className="hero" style={{padding:'14px 16px',marginBottom:14}}>
          <div className="h-eye" style={{fontSize:10,marginBottom:4}}>AI-powered · Secure</div>
          <div className="h-title" style={{fontSize:22,lineHeight:1.2,marginBottom:6}}>Plan <em>smarter.</em> Spend less.</div>
          <div className="h-sub" style={{fontSize:12,opacity:.85}}>Personalized meal plans built around your budget, diet & preferences.</div>
        </div>

        {/* AI BADGE */}
        <div style={{background:'var(--gl)',border:'1px solid rgba(31,78,26,.15)',borderRadius:'var(--r)',padding:'8px 12px',display:'flex',alignItems:'center',gap:7,marginBottom:16}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--g)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13,flexShrink:0}}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          <span style={{fontSize:11,color:'var(--g)'}}>AI powered — no API key needed. Just generate your plan.</span>
        </div>

        {/* BUDGET & HOUSEHOLD */}
        <div className="flbl">💰 Budget & household</div>
        <div className="g2">
          <div>
            <div className="field-lbl">Weekly budget</div>
            <div className="irow">
              <span className="ipre">{prefs.currency||'$'}</span>
              <input type="number" value={prefs.budget||''} placeholder="80" onChange={e=>updatePrefs({budget:e.target.value})} min="5" style={{width:'100%'}}/>
            </div>
          </div>
          <div>
            <div className="field-lbl">Currency</div>
            <select
              value={CURRENCIES.find(c=>c.symbol===(prefs.currency||'$'))?.symbol||'Other'}
              onChange={e=>{
                if(e.target.value!=='Other') updatePrefs({currency:e.target.value})
                else updatePrefs({currency:''})
              }}
              style={{width:'100%',padding:'10px 13px',background:'var(--bg)',border:'1px solid var(--bdr2)',borderRadius:'var(--r)',fontFamily:'var(--sans)',fontSize:13,color:'var(--t)',outline:'none'}}
            >
              {CURRENCIES.map(c=><option key={c.symbol} value={c.symbol}>{c.name}</option>)}
            </select>
            {(!CURRENCIES.find(c=>c.symbol===(prefs.currency||'$')) || prefs.currency==='') && (
              <input type="text" value={prefs.currency||''} placeholder="Type symbol e.g. ₹" onChange={e=>updatePrefs({currency:e.target.value})} maxLength="6" style={{marginTop:6}}/>
            )}
          </div>
        </div>

        {/* ADULTS + KIDS */}
        <div className="g2" style={{marginTop:10}}>
          <div>
            <div className="field-lbl">👨‍👩 Adults</div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button onClick={()=>updatePrefs({adults:Math.max(1,adults-1)})} style={{width:34,height:34,borderRadius:'var(--r)',border:'1px solid var(--bdr2)',background:'var(--bg)',fontSize:18,cursor:'pointer',color:'var(--t)',flexShrink:0}}>−</button>
              <input type="number" value={adults} min="1" max="20" onChange={e=>updatePrefs({adults:Math.max(1,parseInt(e.target.value)||1)})} style={{textAlign:'center',width:'100%'}}/>
              <button onClick={()=>updatePrefs({adults:Math.min(20,adults+1)})} style={{width:34,height:34,borderRadius:'var(--r)',border:'1px solid var(--bdr2)',background:'var(--bg)',fontSize:18,cursor:'pointer',color:'var(--t)',flexShrink:0}}>+</button>
            </div>
          </div>
          <div>
            <div className="field-lbl">👶 Kids <span style={{fontWeight:300,color:'var(--t3)',fontSize:11}}>(½ portion)</span></div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button onClick={()=>updatePrefs({kids:Math.max(0,kids-1)})} style={{width:34,height:34,borderRadius:'var(--r)',border:'1px solid var(--bdr2)',background:'var(--bg)',fontSize:18,cursor:'pointer',color:'var(--t)',flexShrink:0}}>−</button>
              <input type="number" value={kids} min="0" max="20" onChange={e=>updatePrefs({kids:Math.max(0,parseInt(e.target.value)||0)})} style={{textAlign:'center',width:'100%'}}/>
              <button onClick={()=>updatePrefs({kids:Math.min(20,kids+1)})} style={{width:34,height:34,borderRadius:'var(--r)',border:'1px solid var(--bdr2)',background:'var(--bg)',fontSize:18,cursor:'pointer',color:'var(--t)',flexShrink:0}}>+</button>
            </div>
          </div>
        </div>
        {(adults + kids) > 0 && (
          <div style={{fontSize:11,color:'var(--t3)',marginTop:6,padding:'6px 10px',background:'var(--bg2)',borderRadius:'var(--r)',border:'1px solid var(--bdr)'}}>
            🍽️ Planning for <strong style={{color:'var(--t)'}}>{adults} adult{adults!==1?'s':''}</strong>{kids>0?<> + <strong style={{color:'var(--t)'}}>{kids} kid{kids!==1?'s':''}</strong> (½ portions)</>:''} — <strong style={{color:'var(--g)'}}>effective {adults + kids*0.5} portions/meal</strong>
          </div>
        )}

        {/* COUNTRY */}
        <div style={{marginTop:10}}>
          <div className="field-lbl">🌍 Your country <span style={{fontWeight:300,color:'var(--t3)',fontSize:11}}>(affects pricing accuracy)</span></div>
          <select value={prefs.country||'Lebanon'} onChange={e=>updatePrefs({country:e.target.value})} style={{width:'100%',padding:'10px 13px',background:'var(--bg)',border:'1px solid var(--bdr2)',borderRadius:'var(--r)',fontFamily:'var(--sans)',fontSize:13,color:'var(--t)',outline:'none'}}>
            {COUNTRIES.map(c=><option key={c} value={c}>{COUNTRY_FLAGS[c]||'🌍'} {c}</option>)}
          </select>
        </div>

        {/* COMPACT CALORIE CALCULATOR */}
        <div style={{marginTop:16,border:'2px solid #2d6a27',borderRadius:12,overflow:'hidden'}}>
          {/* Header toggle */}
          <button
            onClick={()=>setCalOpen(p=>!p)}
            style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:'#2d6a27',border:'none',cursor:'pointer',fontFamily:'var(--sans)'}}
          >
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:15}}>🔥</span>
              <span style={{fontSize:13,fontWeight:700,color:'#ffffff'}}>Daily calorie target</span>
              {cal > 0 && <span style={{fontSize:11,padding:'3px 9px',background:'#ffffff',color:'#1a5c15',borderRadius:99,fontWeight:700}}>{cal.toLocaleString()} kcal</span>}
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14,transform:calOpen?'rotate(180deg)':'rotate(0deg)',transition:'transform .2s'}}><polyline points="6 9 12 15 18 9"/></svg>
          </button>

          {calOpen && (
            <div style={{padding:'14px',background:'#f7faf7',borderTop:'none'}}>
              <div style={{fontSize:12,color:'#3a3a3a',marginBottom:12,fontWeight:500}}>Fill in your details for precise calorie targets</div>

              {/* Gender row */}
              <div style={{display:'flex',gap:6,marginBottom:12}}>
                <button
                  onClick={()=>updatePrefs({calGender:'male'})}
                  style={{flex:1,padding:'8px',fontSize:13,fontWeight:600,borderRadius:8,border:'2px solid',borderColor:prefs.calGender==='male'?'#2d6a27':'#c0c0c0',background:prefs.calGender==='male'?'#2d6a27':'#ffffff',color:prefs.calGender==='male'?'#ffffff':'#555555',cursor:'pointer',fontFamily:'var(--sans)',transition:'all .15s'}}
                >♂ Male</button>
                <button
                  onClick={()=>updatePrefs({calGender:'female'})}
                  style={{flex:1,padding:'8px',fontSize:13,fontWeight:600,borderRadius:8,border:'2px solid',borderColor:prefs.calGender==='female'?'#2d6a27':'#c0c0c0',background:prefs.calGender==='female'?'#2d6a27':'#ffffff',color:prefs.calGender==='female'?'#ffffff':'#555555',cursor:'pointer',fontFamily:'var(--sans)',transition:'all .15s'}}
                >♀ Female</button>
              </div>

              {/* Fields 2x2 */}
              <div className="g2" style={{gap:8,marginBottom:8}}>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'#333',display:'block',marginBottom:4}}>AGE</label>
                  <input type="number" value={prefs.calAge||''} onChange={e=>updatePrefs({calAge:e.target.value})} placeholder="30"
                    style={{width:'100%',padding:'9px 11px',fontSize:14,border:'1.5px solid #b0b0b0',borderRadius:8,background:'#fff',color:'#222',fontFamily:'var(--sans)',outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'#333',display:'block',marginBottom:4}}>WEIGHT (KG)</label>
                  <input type="number" value={prefs.calWeight||''} onChange={e=>updatePrefs({calWeight:e.target.value})} placeholder="70"
                    style={{width:'100%',padding:'9px 11px',fontSize:14,border:'1.5px solid #b0b0b0',borderRadius:8,background:'#fff',color:'#222',fontFamily:'var(--sans)',outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'#333',display:'block',marginBottom:4}}>HEIGHT (CM)</label>
                  <input type="number" value={prefs.calHeight||''} onChange={e=>updatePrefs({calHeight:e.target.value})} placeholder="170"
                    style={{width:'100%',padding:'9px 11px',fontSize:14,border:'1.5px solid #b0b0b0',borderRadius:8,background:'#fff',color:'#222',fontFamily:'var(--sans)',outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'#333',display:'block',marginBottom:4}}>GOAL</label>
                  <select value={prefs.calGoal||'maintain'} onChange={e=>updatePrefs({calGoal:e.target.value})}
                    style={{width:'100%',padding:'9px 11px',fontSize:13,border:'1.5px solid #b0b0b0',borderRadius:8,background:'#fff',color:'#222',fontFamily:'var(--sans)',outline:'none',boxSizing:'border-box'}}>
                    <option value="lose">Lose weight</option>
                    <option value="maintain">Stay fit</option>
                    <option value="gain">Build muscle</option>
                  </select>
                </div>
              </div>

              <div style={{marginBottom:12}}>
                <label style={{fontSize:11,fontWeight:700,color:'#333',display:'block',marginBottom:4}}>ACTIVITY LEVEL</label>
                <select value={prefs.calActivity||'1.55'} onChange={e=>updatePrefs({calActivity:e.target.value})}
                  style={{width:'100%',padding:'9px 11px',fontSize:13,border:'1.5px solid #b0b0b0',borderRadius:8,background:'#fff',color:'#222',fontFamily:'var(--sans)',outline:'none',boxSizing:'border-box'}}>
                  <option value="1.2">Sedentary (desk job)</option>
                  <option value="1.375">Light (1-3 days/week)</option>
                  <option value="1.55">Moderate (3-5 days/week)</option>
                  <option value="1.725">Active (6-7 days/week)</option>
                  <option value="1.9">Very active (athlete)</option>
                </select>
              </div>

              <button onClick={calcCalories}
                style={{width:'100%',padding:'10px',fontSize:13,fontWeight:700,background:'#2d6a27',color:'#ffffff',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'var(--sans)',letterSpacing:.3}}>
                Calculate my calories
              </button>

              {cal > 0 && (
                <div style={{marginTop:12,padding:'12px',background:'#2d6a27',borderRadius:10}}>
                  <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:10}}>
                    <span style={{fontSize:26,fontWeight:800,color:'#ffffff',fontFamily:'var(--serif)'}}>{cal.toLocaleString()}</span>
                    <span style={{fontSize:12,color:'rgba(255,255,255,0.8)',fontWeight:500}}>kcal / day</span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
                    <div style={{background:'rgba(255,255,255,0.15)',borderRadius:8,padding:'8px 6px',textAlign:'center'}}>
                      <div style={{fontSize:15,fontWeight:800,color:'#ffffff'}}>{bfast}</div>
                      <div style={{fontSize:10,color:'rgba(255,255,255,0.8)',fontWeight:600,letterSpacing:.5}}>BREAKFAST</div>
                    </div>
                    <div style={{background:'rgba(255,255,255,0.15)',borderRadius:8,padding:'8px 6px',textAlign:'center'}}>
                      <div style={{fontSize:15,fontWeight:800,color:'#ffffff'}}>{lunch}</div>
                      <div style={{fontSize:10,color:'rgba(255,255,255,0.8)',fontWeight:600,letterSpacing:.5}}>LUNCH</div>
                    </div>
                    <div style={{background:'rgba(255,255,255,0.15)',borderRadius:8,padding:'8px 6px',textAlign:'center'}}>
                      <div style={{fontSize:15,fontWeight:800,color:'#ffffff'}}>{dinner}</div>
                      <div style={{fontSize:10,color:'rgba(255,255,255,0.8)',fontWeight:600,letterSpacing:.5}}>DINNER</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CUISINES */}
        <div className="flbl" style={{marginTop:16}}>🌍 Cuisine style <span>(up to 5)</span></div>
        <div className="cuisine-selected">
          {(prefs.cuisines||[]).map(c=>{
            const ci = ALL_CUISINES.find(x=>x.n===c)
            return <span key={c} className="sel-tag">
              <span className="flag">{ci?.f||'🌍'}</span>{c}
              <button className="rm" onClick={()=>toggleCuisine(c)}>×</button>
            </span>
          })}
        </div>
        <div className="cuisine-featured">
          {[{n:'Lebanese',f:'🇱🇧'},{n:'Italian',f:'🇮🇹'},{n:'Indian',f:'🇮🇳'},{n:'Japanese',f:'🇯🇵'},{n:'Mexican',f:'🇲🇽'}].map(c=>(
            <button key={c.n} className={`cchip${(prefs.cuisines||[]).includes(c.n)?' on':''}`} onClick={()=>toggleCuisine(c.n)}>
              <span className="flag">{c.f}</span><span className="cname">{c.n}</span>
            </button>
          ))}
        </div>
        <div className="cuisine-search-wrap" style={{position:'relative'}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14,position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--t3)',pointerEvents:'none'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search all cuisines (100+)…" value={cuisineSearch} onChange={e=>setCuisineSearch(e.target.value)} style={{paddingLeft:34}}/>
        </div>
        {cuisineSearch && (
          <div className="cuisine-dropdown open">
            {filtered.length === 0 && <div style={{padding:'10px 14px',fontSize:12,color:'var(--t3)'}}>No cuisines found</div>}
            {filtered.map(c=>(
              <div key={c.n} className={`cdrop-item${(prefs.cuisines||[]).includes(c.n)?' picked':''}`} onClick={()=>{toggleCuisine(c.n);setCuisineSearch('')}}>
                <span className="flag">{c.f}</span><div className="cinfo"><div>{c.n}</div></div>
              </div>
            ))}
          </div>
        )}

        {/* DIET */}
        <div className="flbl">🍗 Dietary preference</div>
        <div className="chips">
          {['omnivore','vegetarian','vegan','pescatarian','high-protein'].map(d=>(
            <button key={d} className={`chip${prefs.diet===d?' on':''}`} onClick={()=>updatePrefs({diet:d})}>
              {d==='omnivore'?'🍗':d==='vegetarian'?'🥬':d==='vegan'?'🌱':d==='pescatarian'?'🐟':'💪'} {d.charAt(0).toUpperCase()+d.slice(1)}
            </button>
          ))}
        </div>

        {/* HEALTH */}
        <div className="flbl">❤️ Health mode <span>(optional)</span></div>
        <div className="chips">
          {['heart-healthy','low-sugar','high-energy','low-calorie'].map(h=>(
            <button key={h} className={`chip${(prefs.health||[]).includes(h)?' on hon':''}`}
              onClick={()=>{
                const health = prefs.health||[]
                updatePrefs({health: health.includes(h)?health.filter(x=>x!==h):[...health,h]})
              }}>
              {h==='heart-healthy'?'❤️':h==='low-sugar'?'🍬':h==='high-energy'?'⚡':'🧘'} {h.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ')}
            </button>
          ))}
        </div>

        {/* RESTRICTIONS */}
        <div className="flbl">🚫 Allergies / restrictions <span>(optional)</span></div>
        <textarea rows="2" placeholder="e.g. no nuts, gluten-free, halal…" value={prefs.restrictions||''} onChange={e=>updatePrefs({restrictions:e.target.value})}/>

        {error && <div className="err-box" style={{marginTop:14}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>{error}</span></div>}

        <button className="cta" onClick={handleGenerate} disabled={generating}>
          {generating ? <><div className="spin" style={{width:16,height:16,borderWidth:2}}></div>&nbsp;Generating…</> : <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            Generate my plan
          </>}
        </button>
      </div>
    </section>
  )
}
