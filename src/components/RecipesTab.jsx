import { useState, useCallback, useEffect } from 'react'
import { fetchRecipe, searchRecipe } from '../ai.js'
import { loadCommunityRecipes, submitCommunityRecipe, deleteCommunityRecipe, toggleLike, loadUserLikes, saveRecipeCacheCloud, loadRecipeCacheCloud, clearRecipeCacheCloud, loadAllUserRecipes, deleteUserRecipe } from '../supabase.js'
import { supabase } from '../supabase.js'

const CUISINE_FLAGS = {'Lebanese':'🇱🇧','Mediterranean':'🌊','Italian':'🇮🇹','French':'🇫🇷','Mexican':'🇲🇽','Indian':'🇮🇳','Japanese':'🇯🇵','Chinese':'🇨🇳','Thai':'🇹🇭','Greek':'🇬🇷','Turkish':'🇹🇷','Moroccan':'🇲🇦','Syrian':'🇸🇾','Korean':'🇰🇷','Spanish':'🇪🇸','Persian':'🇮🇷'}
const flag = (c) => CUISINE_FLAGS[c] || '🍽️'
const QUICK_RECIPES = ['Spaghetti Carbonara','Chicken Shawarma','Beef Tacos','Pad Thai','Knafeh','Sushi Rolls']

// ── MACROS BAR ────────────────────────────────────────────────────────────────
const MacrosBar = ({ r }) => {
  if (!r?.protein && !r?.carbs && !r?.fat) return null
  const total = (r.protein||0) + (r.carbs||0) + (r.fat||0)
  if (total === 0) return null
  const pPct = Math.round((r.protein||0) / total * 100)
  const cPct = Math.round((r.carbs||0) / total * 100)
  const fPct = 100 - pPct - cPct
  return (
    <div style={{margin:'10px 0 6px',padding:'10px 12px',background:'var(--bg2)',borderRadius:'var(--r)',border:'1px solid var(--bdr)'}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,flexWrap:'wrap',gap:6}}>
        <span style={{fontSize:11,fontWeight:700,color:'var(--t)',letterSpacing:.3}}>MACROS <span style={{fontWeight:400,color:'var(--t3)'}}>per serving</span></span>
        {r.fiber > 0 && <span style={{fontSize:11,color:'var(--t3)'}}>🌿 Fiber {r.fiber}g</span>}
      </div>
      <div style={{display:'flex',borderRadius:99,overflow:'hidden',height:8,marginBottom:8}}>
        <div style={{width:`${pPct}%`,background:'#3b82f6'}}/>
        <div style={{width:`${cPct}%`,background:'#f59e0b'}}/>
        <div style={{width:`${fPct}%`,background:'#ef4444'}}/>
      </div>
      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        <span style={{fontSize:11,display:'flex',alignItems:'center',gap:4}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:'#3b82f6',display:'inline-block',flexShrink:0}}/>
          <span style={{fontWeight:600,color:'var(--t)'}}>{r.protein||0}g</span>
          <span style={{color:'var(--t3)'}}>protein</span>
        </span>
        <span style={{fontSize:11,display:'flex',alignItems:'center',gap:4}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:'#f59e0b',display:'inline-block',flexShrink:0}}/>
          <span style={{fontWeight:600,color:'var(--t)'}}>{r.carbs||0}g</span>
          <span style={{color:'var(--t3)'}}>carbs</span>
        </span>
        <span style={{fontSize:11,display:'flex',alignItems:'center',gap:4}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:'#ef4444',display:'inline-block',flexShrink:0}}/>
          <span style={{fontWeight:600,color:'var(--t)'}}>{r.fat||0}g</span>
          <span style={{color:'var(--t3)'}}>fat</span>
        </span>
      </div>
    </div>
  )
}

export default function RecipesTab({ state }) {
  const { plan, prefs } = state
  const [openCards, setOpenCards] = useState({})
  const [recipeCache, setRecipeCache] = useState({})
  const [loadingCard, setLoadingCard] = useState(null)
  const [searchQ, setSearchQ] = useState('')
  const [searchResult, setSearchResult] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sb_last_search')) } catch(e) { return null }
  })
  const [searchHistory, setSearchHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sb_search_history')) || [] } catch(e) { return [] }
  })
  const [searchResultOpen, setSearchResultOpen] = useState(() => {
    try { const s = localStorage.getItem('sb_search_open'); return s === null ? true : s === 'true' } catch(e) { return true }
  })
  const [searching, setSearching] = useState(false)
  const [addedToShopping, setAddedToShopping] = useState(false)
  const [scaleFactors, setScaleFactors] = useState({})
  const [searchErr, setSearchErr] = useState('')
  const [community, setCommunity] = useState([])
  const [commLoaded, setCommLoaded] = useState(false)
  const [commForm, setCommForm] = useState({author:'',dish:'',cuisine:'',cookTime:'',ingredients:'',steps:'',tip:''})
  const [commSubmitting, setCommSubmitting] = useState(false)
  const [commSuccess, setCommSuccess] = useState(false)
  const [likes, setLikes] = useState(new Set())
  const [cookbook, setCookbook] = useState([])
  const [cookbookLoaded, setCookbookLoaded] = useState(false)
  const [cookbookOpen, setCookbookOpen] = useState(false)
  const [cookbookCards, setCookbookCards] = useState({})

  const loadComm = useCallback(async () => {
    if (commLoaded) return
    try {
      const data = await loadCommunityRecipes()
      setCommunity(data)
      if (state.user) {
        const userLikes = await loadUserLikes(state.user.id)
        setLikes(userLikes)
      }
    } catch (e) {
      const raw = localStorage.getItem('sb_community_recipes')
      if (raw) setCommunity(JSON.parse(raw))
    }
    setCommLoaded(true)
  }, [commLoaded, state.user])

  useEffect(() => { loadComm() }, [])

  // ── LOAD COOKBOOK ────────────────────────────────────────────────────────
  useEffect(() => {
    if (cookbookLoaded || !state.user) return
    loadAllUserRecipes(state.user.id).then(recipes => {
      setCookbook(recipes)
      setCookbookLoaded(true)
    }).catch(() => setCookbookLoaded(true))
  }, [state.user, cookbookLoaded])

  // ── 2-LAYER CACHE ────────────────────────────────────────────────────────
  const [recipeCacheLoaded, setRecipeCacheLoaded] = useState(false)
  useEffect(() => {
    if (recipeCacheLoaded) return
    const planKey = plan?.weekPlan?.[0]?.day
    // Layer 1: localStorage (instant)
    try {
      const saved = localStorage.getItem('sb_recipe_cache')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed._planKey === planKey) setRecipeCache(p => ({...p, ...parsed}))
      }
    } catch(e) {}
    // Layer 2: Supabase cloud
    if (state.user && planKey) {
      loadRecipeCacheCloud(state.user.id, planKey).then(cloudCache => {
        if (cloudCache && Object.keys(cloudCache).length > 0) {
          setRecipeCache(p => ({...p, ...cloudCache}))
          try {
            const current = JSON.parse(localStorage.getItem('sb_recipe_cache') || '{}')
            localStorage.setItem('sb_recipe_cache', JSON.stringify({...current, ...cloudCache, _planKey: planKey}))
          } catch(e) {}
        }
      }).catch(() => {})
    }
    setRecipeCacheLoaded(true)
  }, [state.user, plan])

  const saveToAllLayers = async (cache, rid, recipe) => {
    const planKey = plan?.weekPlan?.[0]?.day || 'default'
    try { localStorage.setItem('sb_recipe_cache', JSON.stringify({...cache, _planKey: planKey})) } catch(e) {}
    if (state.user) saveRecipeCacheCloud(state.user.id, planKey, rid, recipe).catch(() => {})
  }

  const toggleCard = async (rid, name, cuisine, desc) => {
    const isOpen = openCards[rid]
    setOpenCards(p => ({...p, [rid]: !isOpen}))
    if (!isOpen && !recipeCache[rid]) {
      setLoadingCard(rid)
      try {
        const r = await fetchRecipe({
          name, cuisine, desc,
          people: parseInt(prefs.people)||2,
          diet: prefs.diet||'omnivore',
          restrictions: prefs.restrictions||'',
          country: prefs.country||'Lebanon',
          currency: prefs.currency||'$'
        })
        const newCache = {...recipeCache, [rid]: r}
        setRecipeCache(newCache)
        await saveToAllLayers(newCache, rid, r)
        // Also save to shared cache so all users benefit
        if (supabase && m?.name) {
          try {
            const normName = (m.name||name).toLowerCase().trim().replace(/\s+/g,' ')
            const country = prefs.country || 'Lebanon'
            await supabase.from('shared_recipe_cache').upsert({
              dish_name: normName,
              country,
              recipe_data: JSON.stringify(r),
              cached_at: new Date().toISOString()
            }, { onConflict: 'dish_name,country' })
          } catch(e) { /* fail silently */ }
        }
      } catch(e) {}
      setLoadingCard(null)
    }
  }

  const doSearch = async (q) => {
    const query = q || searchQ
    if (!query.trim()) return
    setSearching(true); setSearchErr(''); setSearchResult(null)
    try {
      const r = await searchRecipe({
        query,
        people: parseInt(prefs.people)||2,
        diet: prefs.diet||'omnivore',
        restrictions: prefs.restrictions||'',
        country: prefs.country||'Lebanon',
        currency: prefs.currency||'$'
      })
      setSearchResult(r)
      setSearchResultOpen(true)
      setSearchHistory(prev => {
        const filtered = prev.filter(h => h.dishName !== r.dishName)
        const updated = [r, ...filtered].slice(0, 8)
        try { localStorage.setItem('sb_search_history', JSON.stringify(updated)) } catch(e) {}
        return updated
      })
      try { localStorage.setItem('sb_search_open', 'true') } catch(e) {}
      try { localStorage.setItem('sb_last_search', JSON.stringify(r)) } catch(e) {}
      // Save to user's cookbook
      if (state.user && r) {
        const dishName = (r.dishName || query).toLowerCase().trim().replace(/\s+/g,' ')
        saveRecipeCacheCloud(state.user.id, 'search', dishName, r).catch(() => {})
        setCookbook(prev => {
          const filtered = prev.filter(c => c.rid !== dishName)
          return [{ rid: dishName, planKey: 'search', savedAt: new Date().toISOString(), recipe: r }, ...filtered]
        })
      }
    } catch(e) { setSearchErr(e.message) }
    setSearching(false)
  }

  // ── ADD TO SHOPPING ───────────────────────────────────────────────────────
  const addToShopping = () => {
    if (!searchResult?.ingredients?.length) return
    const { updateExtraItems, extraItems } = state
    const FAM = [
      {base:'egg',members:['egg','eggs']},{base:'chicken',members:['chicken','chicken breast','chicken thigh']},
      {base:'garlic',members:['garlic','garlic clove','garlic cloves']},{base:'onion',members:['onion','onions','yellow onion','red onion']},
      {base:'tomato',members:['tomato','tomatoes']},{base:'butter',members:['butter','unsalted butter','salted butter']},
      {base:'milk',members:['milk','whole milk']},{base:'flour',members:['flour','plain flour','all purpose flour']},
      {base:'rice',members:['rice','basmati rice','jasmine rice']},{base:'salt',members:['salt','sea salt','table salt']},
      {base:'olive oil',members:['olive oil','extra virgin olive oil']},{base:'lemon',members:['lemon','lemons','lemon juice']},
      {base:'pasta',members:['pasta','spaghetti','penne','fusilli']},{base:'spinach',members:['spinach','baby spinach']},
    ]
    const getF = (n) => { const l=(n||'').toLowerCase().trim(); for(const f of FAM){if(f.members.some(m=>l===m||l.startsWith(m+' ')||l.endsWith(' '+m)))return f.base} return l }
    const newItems = {
      dishName: searchResult.dishName || searchQ,
      cuisine: searchResult.cuisine || '',
      pricePerServing: searchResult.pricePerServing || 0,
      ingredients: searchResult.ingredients.map(ing => {
        const isInPantry = ing.inPantry || (state.pantry||[]).some(p => { const pf=getF(p.name),ingf=getF(ing.name||''); return pf===ingf&&pf!=='' })
        return { name: ing.name, qty: ing.qty||'', estimatedCost: 0, inPantry: isInPantry }
      })
    }
    const filtered = (extraItems || []).filter(e => e.dishName !== newItems.dishName)
    updateExtraItems([...filtered, newItems])
    setAddedToShopping(true)
    setTimeout(() => setAddedToShopping(false), 2000)
  }

  const handleSubmitComm = async () => {
    if (!commForm.author || !commForm.dish || !commForm.steps) return
    setCommSubmitting(true)
    try {
      const recipe = {
        ...commForm,
        ingredients: commForm.ingredients.split('\n').filter(l=>l.trim()).map(l=>{
          const m = l.match(/^([\d\/\.\s]+\w*)\s+(.+)$/)
          return m ? {qty:m[1].trim(),name:m[2].trim()} : {qty:'',name:l.trim()}
        }),
        steps: commForm.steps.split('\n').filter(l=>l.trim())
      }
      if (state.user) await submitCommunityRecipe(state.user.id, recipe)
      else {
        const saved = JSON.parse(localStorage.getItem('sb_community_recipes')||'[]')
        saved.unshift({...recipe, id: Date.now().toString(36), likes:0, created_at: new Date().toISOString()})
        localStorage.setItem('sb_community_recipes', JSON.stringify(saved))
      }
      setCommSuccess(true)
      setCommForm({author:'',dish:'',cuisine:'',cookTime:'',ingredients:'',steps:'',tip:''})
      setCommLoaded(false)
      loadComm()
    } catch(e) { alert('Could not save recipe: ' + e.message) }
    setCommSubmitting(false)
  }

  const handleLike = async (id) => {
    if (!state.user) return alert('Sign in to like recipes')
    const isLiked = likes.has(id)
    try {
      await toggleLike(state.user.id, id, isLiked)
      setLikes(p => { const n=new Set(p); isLiked?n.delete(id):n.add(id); return n })
      setCommunity(p => p.map(r => r.id===id ? {...r, likes:(r.likes||0)+(isLiked?-1:1)} : r))
    } catch(e) {}
  }

  const planDays = plan?.weekPlan || []
  const cur = plan?._cur || prefs.currency || '$'
  const planCostPerMeal = plan?.summary?.totalEstimatedCost
    ? plan.summary.totalEstimatedCost / (7 * 3 * (parseInt(prefs.people)||2))
    : 0

  // ── RECIPE BODY ───────────────────────────────────────────────────────────
  const RecipeBody = ({r, rid}) => r ? (
    <div className="recipe-body" style={{display:'block',padding:'0 16px 16px'}}>

      {/* HISTORY & ORIGIN */}
      {r.history && (
        <div style={{display:'flex',gap:10,margin:'14px 0 12px',padding:'12px 14px',
          background:'linear-gradient(135deg,#f5f0e8,#fdf8f0)',borderRadius:10,
          border:'1px solid #e8d9b8',borderLeft:'3px solid #c4a35a'}}>
          <span style={{fontSize:18,flexShrink:0,marginTop:1}}>📜</span>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:'#8a6c2a',letterSpacing:.8,marginBottom:4}}>HISTORY & ORIGIN</div>
            <div style={{fontSize:12,color:'#4a3c28',lineHeight:1.65}}>{r.history}</div>
          </div>
        </div>
      )}

      {/* SERVINGS + SCALE */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',
        background:'var(--bg2)',borderRadius:'var(--r)',marginBottom:10,
        border:'1px solid var(--bdr)',flexWrap:'wrap'}}>
        <span style={{fontSize:16}}>👥</span>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:700,color:'var(--t)'}}>Serves {parseInt(prefs.people)||2}</div>
          <div style={{fontSize:11,color:'var(--t3)'}}>Based on your household in Setup tab</div>
        </div>
        <div style={{width:'100%',marginTop:6}}>
          <span style={{fontSize:11,color:'var(--t3)',display:'block',marginBottom:4}}>Scale:</span>
          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            {[1,2,3,4,5,6,7,8].map(s=>(
              <button key={s} onClick={()=>setScaleFactors(p=>({...p,[rid||'search']:s}))}
                style={{padding:'4px 10px',fontSize:11,fontWeight:600,
                  background:(scaleFactors[rid||'search']||1)===s?'var(--g)':'var(--bg)',
                  color:(scaleFactors[rid||'search']||1)===s?'#fff':'var(--t2)',
                  border:'1px solid var(--bdr2)',borderRadius:6,cursor:'pointer',fontFamily:'var(--sans)'}}>
                {s+'×'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* BADGES */}
      <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
        {r.prepTime&&<span style={{fontSize:11,padding:'4px 9px',background:'var(--bg2)',borderRadius:99,color:'var(--t2)'}}>⏱ Prep {r.prepTime}</span>}
        {r.cookTime&&<span style={{fontSize:11,padding:'4px 9px',background:'var(--bg2)',borderRadius:99,color:'var(--t2)'}}>🔥 Cook {r.cookTime}</span>}
        {r.difficulty&&<span style={{fontSize:11,padding:'4px 9px',background:'var(--bg2)',borderRadius:99,color:'var(--t2)'}}>📊 {r.difficulty}</span>}
        {r.pricePerServing>0
          ? <span style={{fontSize:11,padding:'4px 9px',background:'var(--al)',borderRadius:99,color:'var(--am)'}}>💰 {cur}{Number(r.pricePerServing).toFixed(2)} total ingredients</span>
          : planCostPerMeal>0&&<span style={{fontSize:11,padding:'4px 9px',background:'var(--al)',borderRadius:99,color:'var(--am)'}}>💰 {cur}{planCostPerMeal.toFixed(2)} /meal</span>
        }
        {r.calories&&<span style={{fontSize:11,padding:'4px 9px',background:'var(--gl)',borderRadius:99,color:'var(--gm)'}}>⚡ {r.calories} kcal</span>}
      </div>

      {/* MACROS */}
      <MacrosBar r={r} />

      {/* INGREDIENTS */}
      {(r.ingredients||[]).length>0&&<>
        <div className="recipe-section-title">Ingredients</div>
        <div className="recipe-ingredients">
          {r.ingredients.map((ing,i)=>{
            const scale = scaleFactors[rid||'search'] || 1
            const scaleQty = (qty) => {
              if (!qty || scale === 1) return qty
              const match = qty.match(/^([\d.\/]+)\s*(.*)$/)
              if (!match) return qty
              let num = match[1].includes('/')
                ? match[1].split('/').reduce((a,b)=>parseFloat(a)/parseFloat(b))
                : parseFloat(match[1])
              const scaled = Math.round(num * scale * 4) / 4
              return (scaled % 1 === 0 ? scaled : scaled.toFixed(2)) + (match[2] ? ' ' + match[2] : '')
            }
            const pn = (n) => n.toLowerCase().trim()
            const ingn = pn(ing.name||'')
            const inPantry = ing.inPantry || (state.pantry||[]).some(p => {
              const p2 = pn(p.name); return p2===ingn||p2===ingn+'s'||ingn===p2+'s'
            })
            return (
              <div key={i} className="recipe-ing" style={{flexDirection:'column',alignItems:'flex-start',gap:2}}>
                <span className="recipe-ing-name">
                  {ing.name}
                  {ing.note&&<span style={{fontSize:11,color:'var(--t3)'}}> — {ing.note}</span>}
                </span>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {ing.qty&&<span style={{fontSize:11,padding:'2px 8px',background:'var(--gl)',borderRadius:99,color:'var(--gm)',fontWeight:500}}>
                    🍳 {scaleQty(ing.qty)}
                  </span>}
                  {inPantry&&<span style={{fontSize:11,padding:'2px 8px',background:'#f0faf0',borderRadius:99,color:'var(--g)',fontWeight:600,border:'1px solid rgba(31,78,26,.2)'}}>✅ In pantry</span>}
                </div>
              </div>
            )
          })}
        </div>
      </>}

      {/* STEPS */}
      {(r.steps||[]).length>0&&<>
        <div className="recipe-section-title">Method</div>
        <div className="recipe-steps">
          {r.steps.map((step,i)=>(
            <div key={i} className="recipe-step">
              <span className="recipe-step-num">{i+1}</span>
              <span className="recipe-step-text">{step}</span>
            </div>
          ))}
        </div>
      </>}
      {r.tip&&<div className="recipe-tip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{r.tip}</div>}
    </div>
  ) : null

  const timeAgo = (ts) => {
    if (!ts) return ''
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff/60000)
    if (m<1) return 'just now'
    if (m<60) return m+'m ago'
    const h = Math.floor(m/60)
    if (h<24) return h+'h ago'
    return Math.floor(h/24)+'d ago'
  }

  return (
    <section className="sec on">
      <div className="pad" id="recipes-pad">

        {/* SEARCH BOX */}
        <div className="add-box" style={{marginBottom:20}}>
          <div className="add-box-title">Search any recipe in the world</div>
          <div className="add-row" style={{marginBottom:8}}>
            <input type="text" placeholder="e.g. Beef Bourguignon, Pad Thai, Knafeh…" value={searchQ} onChange={e=>setSearchQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch()}/>
          </div>
          <div style={{display:'flex',gap:7,flexWrap:'wrap',marginBottom:10}}>
            {QUICK_RECIPES.map(q=>(
              <button key={q} className="chip" onClick={()=>{setSearchQ(q);doSearch(q)}}>{q}</button>
            ))}
          </div>
          <button className="cta" style={{marginTop:0}} onClick={()=>doSearch()} disabled={searching}>
            {searching?<><div className="spin" style={{width:16,height:16,borderWidth:2}}></div>&nbsp;Searching…</>:<><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Find recipe</>}
          </button>
          {searchErr&&<div className="err-box" style={{marginTop:8}}>{searchErr}</div>}
        </div>

        {/* SEARCH RESULT */}
        {searchResult&&(
          <div className={`recipe-card${searchResultOpen?' open':''}`} style={{marginBottom:20}}>
            <div className="recipe-header" onClick={()=>setSearchResultOpen(p=>{const next=!p;try{localStorage.setItem('sb_search_open',next)}catch(e){}return next;})} style={{cursor:'pointer'}}>
              <span className="recipe-flag">{flag(searchResult.cuisine)}</span>
              <div className="recipe-hinfo">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{fontSize:10,fontWeight:500,letterSpacing:.5,textTransform:'uppercase',color:'var(--t3)',marginBottom:3}}>{searchResult.cuisine||'World cuisine'}</div>
                  <button onClick={e=>{
                    e.stopPropagation()
                    if(!confirm('Remove this search result?')) return
                    setSearchResult(null)
                    try{localStorage.removeItem('sb_last_search')}catch(e2){}
                  }} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:'var(--t3)',fontFamily:'var(--sans)',padding:'2px 6px',borderRadius:6,marginBottom:3}}>✕ Clear</button>
                </div>
                <div className="recipe-meal-name">{searchResult.dishName||searchQ}</div>
                <div style={{display:'flex',gap:8,marginTop:6,flexWrap:'wrap'}}>
                  {searchResult.prepTime&&<span style={{fontSize:11,color:'var(--t3)'}}>⏱ {searchResult.prepTime}</span>}
                  {searchResult.cookTime&&<span style={{fontSize:11,color:'var(--t3)'}}>🔥 {searchResult.cookTime}</span>}
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:6}}>
                  {searchResult.pricePerServing&&<span style={{fontSize:11,padding:'3px 9px',background:'var(--al)',borderRadius:99,color:'var(--am)'}}>💰 Est. {cur}{Number(searchResult.pricePerServing).toFixed(2)} in {prefs.country||'Lebanon'}</span>}
                  {searchResult.calories&&<span style={{fontSize:11,padding:'3px 9px',background:'var(--gl)',borderRadius:99,color:'var(--gm)'}}>⚡ {searchResult.calories} kcal</span>}
                </div>
                {/* ADD TO SHOPPING */}
                <button onClick={e=>{e.stopPropagation();addToShopping()}}
                  style={{marginTop:8,display:'inline-flex',alignItems:'center',gap:5,padding:'6px 12px',
                    background:addedToShopping?'var(--g)':'var(--bg2)',color:addedToShopping?'#fff':'var(--t2)',
                    border:'1px solid',borderColor:addedToShopping?'var(--g)':'var(--bdr2)',
                    borderRadius:99,cursor:'pointer',fontFamily:'var(--sans)',fontSize:11,fontWeight:600,transition:'all .2s'}}>
                  {addedToShopping ? '✓ Added to shopping!' : '🛒 Add ingredients to shopping'}
                </button>
              </div>
              <div className="recipe-toggle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg></div>
            </div>
            {searchResultOpen && <RecipeBody r={searchResult} rid='search'/>}

            {/* COMMUNITY VERSIONS OF THIS DISH */}
            {searchResultOpen && (() => {
              const dishName = (searchResult.dishName || searchQ || '').toLowerCase()
              const matches = community.filter(r =>
                r.dish?.toLowerCase().includes(dishName) ||
                dishName.includes(r.dish?.toLowerCase() || '')
              )
              if (!matches.length) return null
              return (
                <div style={{padding:'10px 14px 14px',borderTop:'1px solid var(--bdr)'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--t3)',letterSpacing:.5,marginBottom:8}}>
                    👨‍🍳 {matches.length} COMMUNITY VERSION{matches.length>1?'S':''} OF THIS DISH
                  </div>
                  {[...matches].sort((a,b) => {
                    const scoreA = (a.avg_rating||0)*2 + (a.likes||0)*0.5
                    const scoreB = (b.avg_rating||0)*2 + (b.likes||0)*0.5
                    return scoreB - scoreA
                  }).map(r => {
                    const isOpen = openCards['comm_search_'+r.id]
                    const isLiked = likes.has(r.id)
                    return (
                      <div key={r.id} style={{marginBottom:8,background:'var(--bg2)',borderRadius:'var(--r)',border:'1px solid var(--bdr)',overflow:'hidden'}}>
                        <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',cursor:'pointer'}}
                          onClick={()=>setOpenCards(p=>({...p,['comm_search_'+r.id]:!isOpen}))}>
                          <div style={{width:32,height:32,borderRadius:'50%',background:'var(--g)',color:'#fff',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            {(r.author||'?')[0].toUpperCase()}
                          </div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:600,color:'var(--t)'}}>{r.author}'s {r.dish}</div>
                            <div style={{display:'flex',gap:6,marginTop:2,flexWrap:'wrap'}}>
                              {r.avg_rating>0&&<span style={{fontSize:11,color:'#f5a623'}}>⭐ {r.avg_rating} ({r.rating_count})</span>}
                              <span style={{fontSize:11,color:'var(--t3)'}}>❤️ {r.likes||0}</span>
                              {r.cook_time&&<span style={{fontSize:11,color:'var(--t3)'}}>⏱ {r.cook_time}</span>}
                            </div>
                          </div>
                          <button onClick={e=>{e.stopPropagation();handleLike(r.id)}}
                            style={{background:'none',border:'none',cursor:'pointer',fontSize:16,color:isLiked?'#e55':'var(--t3)',padding:'4px'}}>
                            {isLiked?'❤️':'🤍'}
                          </button>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{width:13,height:13,color:'var(--t3)',transform:isOpen?'rotate(180deg)':'rotate(0deg)',transition:'transform .2s',flexShrink:0}}>
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </div>
                        {isOpen && (
                          <div style={{padding:'0 12px 12px',borderTop:'1px solid var(--bdr)'}}>
                            {(r.ingredients||[]).length>0&&<>
                              <div style={{fontSize:10,fontWeight:700,color:'var(--t3)',letterSpacing:.5,margin:'10px 0 6px'}}>INGREDIENTS</div>
                              {r.ingredients.map((ing,i)=>(
                                <div key={i} style={{fontSize:12,color:'var(--t2)',padding:'3px 0',borderBottom:'1px solid var(--bdr)',display:'flex',gap:8}}>
                                  <span style={{color:'var(--t3)',minWidth:60}}>{ing.qty||''}</span>
                                  <span>{ing.name||ing}</span>
                                </div>
                              ))}
                            </>}
                            {(r.steps||[]).length>0&&<>
                              <div style={{fontSize:10,fontWeight:700,color:'var(--t3)',letterSpacing:.5,margin:'10px 0 6px'}}>METHOD</div>
                              {r.steps.map((s,i)=>(
                                <div key={i} style={{display:'flex',gap:8,marginBottom:6,fontSize:12,color:'var(--t2)'}}>
                                  <span style={{width:20,height:20,borderRadius:'50%',background:'var(--g)',color:'#fff',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{i+1}</span>
                                  <span style={{lineHeight:1.5}}>{s}</span>
                                </div>
                              ))}
                            </>}
                            {r.tip&&<div style={{marginTop:8,padding:'8px 10px',background:'var(--al)',borderRadius:'var(--r)',fontSize:11,color:'var(--am)'}}>💡 {r.tip}</div>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}

        {/* SEARCH HISTORY */}
        {searchHistory.length > 0 && (
          <div style={{marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
              <div style={{fontSize:11,fontWeight:600,color:'var(--t3)',letterSpacing:.5}}>RECENT SEARCHES</div>
              <button onClick={()=>{
                if(!confirm('Clear all recent searches?')) return
                setSearchHistory([])
                try{localStorage.removeItem('sb_search_history')}catch(e){}
              }} style={{fontSize:11,color:'var(--t3)',background:'none',border:'none',cursor:'pointer',fontFamily:'var(--sans)'}}>Clear all</button>
            </div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {searchHistory.map((h,i)=>(
                <button key={i} onClick={()=>{setSearchResult(h);setSearchResultOpen(true)}}
                  style={{fontSize:11,padding:'4px 10px',background:'var(--bg2)',border:'1px solid var(--bdr)',
                    borderRadius:99,cursor:'pointer',fontFamily:'var(--sans)',color:'var(--t2)',
                    display:'flex',alignItems:'center',gap:4}}>
                  {flag(h.cuisine)} {h.dishName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PLAN DIVIDER */}
        {planDays.length>0&&(
          <div style={{display:'flex',alignItems:'center',gap:10,margin:'18px 0'}}>
            <div className="or-divider" style={{flex:1,margin:0}}>from your meal plan</div>
            <button onClick={async()=>{
              if(!confirm('Clear all cached recipes? They will be re-fetched next time you open them.')) return
              try { localStorage.removeItem('sb_recipe_cache') } catch(e) {}
              if (state.user) await clearRecipeCacheCloud(state.user.id).catch(()=>{})
              setRecipeCache({})
              setOpenCards({})
            }} style={{fontSize:11,padding:'4px 10px',background:'#fff3cd',border:'1px solid #e6c84a',borderRadius:99,color:'#856404',cursor:'pointer',fontFamily:'var(--sans)',fontWeight:600,whiteSpace:'nowrap',flexShrink:0}}>
              🔄 Reload recipes
            </button>
          </div>
        )}

        {/* EMPTY STATE */}
        {!planDays.length&&!searchResult&&(
          <div className="empty-v" style={{paddingTop:20}}>
            <div className="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>
            <div className="empty-t">No plan recipes yet</div>
            <div className="empty-s">Generate a meal plan first, or search any dish above.</div>
          </div>
        )}

        {/* PLAN RECIPES */}
        {planDays.map(day=>(
          <div key={day.day}>
            <div className="recipe-day-sep">{day.day}</div>
            {['breakfast','lunch','dinner'].map(slot=>{
              const m = day[slot]||{}
              if (!m.name) return null
              const rid = `${day.day}_${slot}`.replace(/\s/g,'_')
              const isOpen = openCards[rid]
              const r = recipeCache[rid]
              return (
                <div key={slot} className={`recipe-card${isOpen?' open':''}`} id={`rc_${rid}`}>
                  <div className="recipe-header" onClick={()=>toggleCard(rid,m.name,m.cuisine,m.desc)}>
                    <span className="recipe-flag">{flag(m.cuisine)}</span>
                    <div className="recipe-hinfo">
                      <div className="recipe-slot">{slot.charAt(0).toUpperCase()+slot.slice(1)}</div>
                      <div className="recipe-meal-name">{m.name}</div>
                      <div className="recipe-meta">
                        <span className="recipe-meta-item">⏱ 30–45 min</span>
                        <span className="recipe-meta-item">👥 {prefs.people||2} servings</span>
                      </div>
                    </div>
                    <div className="recipe-toggle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg></div>
                  </div>
                  {isOpen&&(
                    <div className="recipe-body" style={{display:'block',padding:'0 16px 16px',borderTop:'1px solid var(--bdr)'}}>
                      {loadingCard===rid ? (
                        <div className="recipe-body-loading"><div className="spin"></div>Loading recipe…</div>
                      ) : r ? <RecipeBody r={r} rid={rid}/> : (
                        <div style={{padding:'16px 0',fontSize:13,color:'var(--t2)'}}>Tap to load recipe details.</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {/* MY COOKBOOK */}
        {state.user && cookbook.length > 0 && (
          <div style={{marginTop:28,marginBottom:8}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,cursor:'pointer'}}
              onClick={()=>setCookbookOpen(p=>!p)}>
              <div>
                <div style={{fontFamily:'var(--serif)',fontSize:17,fontWeight:300,color:'var(--t)'}}>
                  📖 My Cookbook
                  <span style={{background:'var(--g)',color:'#fff',fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:99,marginLeft:8}}>{cookbook.length}</span>
                </div>
                <div style={{fontSize:11,color:'var(--t3)',marginTop:2}}>All recipes you've viewed — tap to expand</div>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{width:16,height:16,color:'var(--t3)',transform:cookbookOpen?'rotate(180deg)':'rotate(0deg)',transition:'transform .2s',flexShrink:0}}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            {cookbookOpen && (
              <div>
                {cookbook.map((item, i) => {
                  const r = item.recipe
                  if (!r) return null
                  const name = r.dishName || r.name || item.rid || 'Recipe'
                  const cuisine = r.cuisine || ''
                  const isOpen = cookbookCards[item.rid]
                  return (
                    <div key={i} className={`recipe-card${isOpen?' open':''}`} style={{marginBottom:8}}>
                      <div className="recipe-header" onClick={()=>setCookbookCards(p=>({...p,[item.rid]:!isOpen}))}
                        style={{cursor:'pointer'}}>
                        <span className="recipe-flag">{flag(cuisine)}</span>
                        <div className="recipe-hinfo">
                          <div style={{fontSize:10,fontWeight:500,letterSpacing:.5,textTransform:'uppercase',color:'var(--t3)',marginBottom:2}}>{cuisine||'Recipe'}</div>
                          <div className="recipe-meal-name">{name}</div>
                          <div style={{display:'flex',gap:8,marginTop:4,flexWrap:'wrap'}}>
                            {r.prepTime&&<span style={{fontSize:11,color:'var(--t3)'}}>⏱ {r.prepTime}</span>}
                            {r.calories&&<span style={{fontSize:11,color:'var(--t3)'}}>⚡ {r.calories} kcal</span>}
                            {r.protein&&<span style={{fontSize:11,color:'var(--t3)'}}>💪 {r.protein}g protein</span>}
                          </div>
                        </div>
                        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                          <div className="recipe-toggle">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                          </div>
                          <button onClick={e=>{
                            e.stopPropagation()
                            if(!confirm(`Remove "${name}" from your cookbook?`)) return
                            deleteUserRecipe(state.user.id, item.planKey, item.rid).catch(()=>{})
                            setCookbook(prev => prev.filter(c => c.rid !== item.rid))
                          }} style={{background:'none',border:'none',cursor:'pointer',fontSize:10,color:'var(--t3)',fontFamily:'var(--sans)',padding:'2px'}}>✕</button>
                        </div>
                      </div>
                      {isOpen && <RecipeBody r={r} rid={item.rid}/>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* COMMUNITY SECTION */}
        <div style={{marginTop:28}}>
          <div style={{marginBottom:14}}>
            <div style={{fontFamily:'var(--serif)',fontSize:17,fontWeight:300,color:'var(--t)'}}>
              👨‍🍳 Community recipes
              {community.length>0&&<span style={{background:'var(--g)',color:'#fff',fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:99,marginLeft:8}}>{community.length}</span>}
            </div>
            <div style={{fontSize:11,color:'var(--t3)',marginTop:2}}>Real recipes shared by real people — add yours below</div>
          </div>

          {!commSuccess?(
            <div className="comm-add-box">
              <div className="comm-add-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Share your recipe</div>
              <div className="comm-row2">
                <div className="comm-field"><label>Your name</label><input type="text" value={commForm.author} onChange={e=>setCommForm(p=>({...p,author:e.target.value}))} placeholder="e.g. Firas"/></div>
                <div className="comm-field"><label>Dish name</label><input type="text" value={commForm.dish} onChange={e=>setCommForm(p=>({...p,dish:e.target.value}))} placeholder="e.g. Mama's Mujaddara"/></div>
              </div>
              <div className="comm-row2">
                <div className="comm-field"><label>Cuisine</label><input type="text" value={commForm.cuisine} onChange={e=>setCommForm(p=>({...p,cuisine:e.target.value}))} placeholder="e.g. Lebanese"/></div>
                <div className="comm-field"><label>Cook time</label><input type="text" value={commForm.cookTime} onChange={e=>setCommForm(p=>({...p,cookTime:e.target.value}))} placeholder="e.g. 45 mins"/></div>
              </div>
              <div className="comm-field"><label>Ingredients (one per line)</label><textarea rows="4" value={commForm.ingredients} onChange={e=>setCommForm(p=>({...p,ingredients:e.target.value}))} placeholder="1 cup green lentils&#10;2 large onions"/></div>
              <div className="comm-field"><label>Steps (one per line)</label><textarea rows="4" value={commForm.steps} onChange={e=>setCommForm(p=>({...p,steps:e.target.value}))} placeholder="Rinse lentils and boil.&#10;Fry onions until golden."/></div>
              <div className="comm-field"><label>Chef's tip (optional)</label><input type="text" value={commForm.tip} onChange={e=>setCommForm(p=>({...p,tip:e.target.value}))} placeholder="e.g. The secret is extra crispy onions!"/></div>
              <button className="cta" style={{marginTop:4}} onClick={handleSubmitComm} disabled={commSubmitting}>
                {commSubmitting?'Sharing…':'Share with the community'}
              </button>
            </div>
          ):(
            <div style={{textAlign:'center',padding:'16px',background:'var(--gl)',borderRadius:'var(--rl2)',marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:500,color:'var(--g)'}}>✓ Recipe shared! Thank you.</div>
              <button onClick={()=>setCommSuccess(false)} style={{marginTop:8,background:'none',border:'1px solid var(--bdr2)',borderRadius:'var(--r)',padding:'6px 14px',fontFamily:'var(--sans)',fontSize:12,color:'var(--t2)',cursor:'pointer'}}>+ Add another</button>
            </div>
          )}

          <div>
            {community.length===0&&commLoaded&&(
              <div className="comm-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                No community recipes yet. Be the first!
              </div>
            )}
            {community.map(r=>{
              const isOpen = openCards['comm_'+r.id]
              const isLiked = likes.has(r.id)
              return (
                <div key={r.id} className={`comm-card${isOpen?' open':''}`}>
                  <div className="comm-card-hdr" onClick={()=>setOpenCards(p=>({...p,['comm_'+r.id]:!isOpen}))}>
                    <div className="comm-avatar">{(r.author||'?')[0].toUpperCase()}</div>
                    <div className="comm-info">
                      <div className="comm-dish">{flag(r.cuisine)} {r.dish}</div>
                      <div className="comm-meta">
                        <span>by <strong>{r.author}</strong></span>
                        {r.cuisine&&<span className="comm-tag">{r.cuisine}</span>}
                        {(r.cook_time||r.cookTime)&&<span>⏱ {r.cook_time||r.cookTime}</span>}
                        <span style={{color:'var(--t3)'}}>{timeAgo(r.created_at)}</span>
                      </div>
                    </div>
                    <button className={`comm-like-btn${isLiked?' liked':''}`} onClick={e=>{e.stopPropagation();handleLike(r.id)}}>
                      <svg viewBox="0 0 24 24" fill={isLiked?'var(--rd)':'none'} stroke={isLiked?'var(--rd)':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      {r.likes||0}
                    </button>
                  </div>
                  {isOpen&&(
                    <div className="comm-body">
                      {(r.ingredients||[]).length>0&&<>
                        <div className="comm-section-lbl">Ingredients</div>
                        <div className="comm-ing-list">
                          {r.ingredients.map((ing,i)=>(
                            <div key={i} className="comm-ing"><span className="comm-ing-qty">{ing.qty||''}</span><span>{ing.name||ing}</span></div>
                          ))}
                        </div>
                      </>}
                      {(r.steps||[]).length>0&&<>
                        <div className="comm-section-lbl">Method</div>
                        <div className="comm-steps">
                          {r.steps.map((s,i)=>(
                            <div key={i} className="comm-step"><span className="comm-step-num">{i+1}</span><span className="comm-step-text">{s}</span></div>
                          ))}
                        </div>
                      </>}
                      {r.tip&&<div className="comm-author-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{r.tip}</div>}
                      {state.user&&r.user_id===state.user.id&&(
                        <button className="comm-del-btn" onClick={async()=>{
                          if(!confirm(`Delete your recipe "${r.dish}"? This cannot be undone.`)) return
                          await deleteCommunityRecipe(state.user.id,r.id)
                          setCommunity(p=>p.filter(x=>x.id!==r.id))
                        }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>Delete my recipe
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
