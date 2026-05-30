import { useState, useCallback } from 'react'
import { fetchRecipe, searchRecipe } from '../ai.js'
import { loadCommunityRecipes, submitCommunityRecipe, deleteCommunityRecipe, toggleLike, loadUserLikes } from '../supabase.js'

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
      {/* Bar */}
      <div style={{display:'flex',borderRadius:99,overflow:'hidden',height:8,marginBottom:8}}>
        <div style={{width:`${pPct}%`,background:'#3b82f6',transition:'width .3s'}}/>
        <div style={{width:`${cPct}%`,background:'#f59e0b',transition:'width .3s'}}/>
        <div style={{width:`${fPct}%`,background:'#ef4444',transition:'width .3s'}}/>
      </div>
      {/* Labels */}
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
    try {
      const saved = localStorage.getItem('sb_last_search')
      return saved ? JSON.parse(saved) : null
    } catch(e) { return null }
  })
  const [searchResultOpen, setSearchResultOpen] = useState(() => {
    try { 
      const saved = localStorage.getItem('sb_search_open')
      return saved === null ? true : saved === 'true'
    } catch(e) { return true }
  })
  const [searching, setSearching] = useState(false)
  const [searchErr, setSearchErr] = useState('')
  const [community, setCommunity] = useState([])
  const [commLoaded, setCommLoaded] = useState(false)
  const [commForm, setCommForm] = useState({author:'',dish:'',cuisine:'',cookTime:'',ingredients:'',steps:'',tip:''})
  const [commSubmitting, setCommSubmitting] = useState(false)
  const [commSuccess, setCommSuccess] = useState(false)
  const [likes, setLikes] = useState(new Set())

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

  useState(() => { loadComm() }, [])

  const [recipeCacheLoaded, setRecipeCacheLoaded] = useState(false)
  if (!recipeCacheLoaded) {
    try {
      const saved = localStorage.getItem('sb_recipe_cache')
      if (saved) {
        const parsed = JSON.parse(saved)
        const planKey = plan?.weekPlan?.[0]?.day
        if (parsed._planKey === planKey) {
          Object.assign(recipeCache, parsed)
        }
      }
    } catch(e) {}
    setRecipeCacheLoaded(true)
  }

  const saveRecipeCache = (cache) => {
    try {
      const planKey = plan?.weekPlan?.[0]?.day
      localStorage.setItem('sb_recipe_cache', JSON.stringify({...cache, _planKey: planKey}))
    } catch(e) {}
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
        saveRecipeCache(newCache)
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
      try { localStorage.setItem('sb_search_open', 'true') } catch(e) {}
      try { localStorage.setItem('sb_last_search', JSON.stringify(r)) } catch(e) {}
    } catch(e) { setSearchErr(e.message) }
    setSearching(false)
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

  const RecipeBody = ({r}) => r ? (
    <div className="recipe-body" style={{display:'block',padding:'0 16px 16px'}}>
      {/* BADGES */}
      <div style={{display:'flex',gap:8,margin:'14px 0 4px',flexWrap:'wrap'}}>
        {r.prepTime&&<span style={{fontSize:11,padding:'4px 9px',background:'var(--bg2)',borderRadius:99,color:'var(--t2)'}}>⏱ Prep {r.prepTime}</span>}
        {r.cookTime&&<span style={{fontSize:11,padding:'4px 9px',background:'var(--bg2)',borderRadius:99,color:'var(--t2)'}}>🔥 Cook {r.cookTime}</span>}
        {r.difficulty&&<span style={{fontSize:11,padding:'4px 9px',background:'var(--bg2)',borderRadius:99,color:'var(--t2)'}}>📊 {r.difficulty}</span>}
        {planCostPerMeal>0&&<span style={{fontSize:11,padding:'4px 9px',background:'var(--al)',borderRadius:99,color:'var(--am)'}}>💰 {cur}{planCostPerMeal.toFixed(2)} /meal</span>}
        {r.calories&&<span style={{fontSize:11,padding:'4px 9px',background:'var(--gl)',borderRadius:99,color:'var(--gm)'}}>⚡ {r.calories} kcal</span>}
      </div>

      {/* MACROS BAR */}
      <MacrosBar r={r} />

      {/* INGREDIENTS */}
      {(r.ingredients||[]).length>0&&<>
        <div className="recipe-section-title">Ingredients</div>
        <div className="recipe-ingredients">
          {r.ingredients.map((ing,i)=>(
            <div key={i} className="recipe-ing">
              <span className="recipe-ing-qty">{ing.qty||''}</span>
              <span className="recipe-ing-name">{ing.name}{ing.note&&<span style={{fontSize:11,color:'var(--t3)'}}> — {ing.note}</span>}</span>
            </div>
          ))}
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
        {/* SEARCH */}
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
                  <button onClick={e=>{e.stopPropagation();setSearchResult(null);try{localStorage.removeItem('sb_last_search')}catch(e2){}}} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:'var(--t3)',fontFamily:'var(--sans)',padding:'2px 6px',borderRadius:6,marginBottom:3}}>✕ Clear</button>
                </div>
                <div className="recipe-meal-name">{searchResult.dishName||searchQ}</div>
                <div style={{display:'flex',gap:8,marginTop:6,flexWrap:'wrap'}}>
                  {searchResult.prepTime&&<span style={{fontSize:11,color:'var(--t3)'}}>⏱ {searchResult.prepTime}</span>}
                  {searchResult.cookTime&&<span style={{fontSize:11,color:'var(--t3)'}}>🔥 {searchResult.cookTime}</span>}
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:6}}>
                  {searchResult.pricePerServing&&<span style={{fontSize:11,padding:'3px 9px',background:'var(--al)',borderRadius:99,color:'var(--am)'}}>💰 Est. {cur}{Number(searchResult.pricePerServing).toFixed(2)} full ingredient cost in {prefs.country||'Lebanon'}</span>}
                  {searchResult.calories&&<span style={{fontSize:11,padding:'3px 9px',background:'var(--gl)',borderRadius:99,color:'var(--gm)'}}>⚡ {searchResult.calories} kcal</span>}
                </div>
              </div>
              <div className="recipe-toggle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg></div>
            </div>
            {searchResultOpen && <RecipeBody r={searchResult}/>}
          </div>
        )}

        {/* PLAN DIVIDER */}
        {planDays.length>0&&<div className="or-divider" style={{margin:'18px 0'}}>from your meal plan</div>}

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
                      ) : r ? <RecipeBody r={r}/> : (
                        <div style={{padding:'16px 0',fontSize:13,color:'var(--t2)'}}>Tap to load recipe details.</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {/* COMMUNITY SECTION */}
        <div style={{marginTop:28}}>
          <div style={{marginBottom:14}}>
            <div style={{fontFamily:'var(--serif)',fontSize:17,fontWeight:300,color:'var(--t)'}}>
              👨‍🍳 Community recipes
              {community.length>0&&<span style={{background:'var(--g)',color:'#fff',fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:99,marginLeft:8}}>{community.length}</span>}
            </div>
            <div style={{fontSize:11,color:'var(--t3)',marginTop:2}}>Real recipes shared by real people — add yours below</div>
          </div>

          {/* SUBMIT FORM */}
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

          {/* COMMUNITY FEED */}
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
                        <button className="comm-del-btn" onClick={async()=>{if(confirm('Delete?')){await deleteCommunityRecipe(state.user.id,r.id);setCommunity(p=>p.filter(x=>x.id!==r.id))}}}>
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
