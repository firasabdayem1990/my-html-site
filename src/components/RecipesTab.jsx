import { useState, useCallback, useEffect } from 'react'
import { fetchRecipe, searchRecipe } from '../ai.js'
import { loadCommunityRecipes, submitCommunityRecipe, deleteCommunityRecipe, toggleLike, loadUserLikes, submitRating, loadUserRatings, loadComments, submitComment, deleteComment, saveRecipeCacheCloud, loadRecipeCacheCloud, clearRecipeCacheCloud } from '../supabase.js'
import { supabase } from '../supabase.js'

const CUISINE_FLAGS = {'Lebanese':'🇱🇧','Mediterranean':'🌊','Italian':'🇮🇹','French':'🇫🇷','Mexican':'🇲🇽','Indian':'🇮🇳','Japanese':'🇯🇵','Chinese':'🇨🇳','Thai':'🇹🇭','Greek':'🇬🇷','Turkish':'🇹🇷','Moroccan':'🇲🇦','Syrian':'🇸🇾','Korean':'🇰🇷','Spanish':'🇪🇸','Persian':'🇮🇷'}
const flag = (c) => CUISINE_FLAGS[c] || '🍽️'
const QUICK_RECIPES = ['Spaghetti Carbonara','Chicken Shawarma','Beef Tacos','Pad Thai','Knafeh','Sushi Rolls']
const EMOJI_LIST = ['😋','🔥','❤️','👏','😍','🤤','👌','⭐','🥇','💯']

export default function RecipesTab({ state, targetRecipe, onTargetHandled }) {
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
  const [searchErr, setSearchErr] = useState('')
  const [community, setCommunity] = useState([])
  const [commLoaded, setCommLoaded] = useState(false)
  const [commForm, setCommForm] = useState({author:'',dish:'',cuisine:'',cookTime:'',ingredients:'',steps:'',tip:''})
  const [commSubmitting, setCommSubmitting] = useState(false)
  const [commSuccess, setCommSuccess] = useState(false)
  const [likes, setLikes] = useState(new Set())
  const [userRatings, setUserRatings] = useState({})
  const [comments, setComments] = useState({})
  const [commentInputs, setCommentInputs] = useState({})
  const [commentOpen, setCommentOpen] = useState({})
  const [submittingComment, setSubmittingComment] = useState({})
  const [editingComment, setEditingComment] = useState({}) // {commentId: text}

  // ── Auto-open target recipe from MealsTab ──
  useEffect(() => {
    if (!targetRecipe) return
    const { rid, meal } = targetRecipe
    setOpenCards(p => ({ ...p, [rid]: true }))
    if (!recipeCache[rid]) fetchAndCache(rid, meal.name, meal.cuisine, meal.desc)
    setTimeout(() => {
      const el = document.getElementById('rc_' + rid)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 300)
    if (onTargetHandled) onTargetHandled()
  }, [targetRecipe])

  const loadComm = useCallback(async () => {
    if (commLoaded) return
    try {
      const data = await loadCommunityRecipes()
      setCommunity(data)
      if (state.user) {
        const [userLikes, ratings] = await Promise.all([
          loadUserLikes(state.user.id),
          loadUserRatings(state.user.id)
        ])
        setLikes(userLikes)
        setUserRatings(ratings)
      }
    } catch (e) {
      const raw = localStorage.getItem('sb_community_recipes')
      if (raw) setCommunity(JSON.parse(raw))
    }
    setCommLoaded(true)
  }, [commLoaded, state.user])

  useEffect(() => { loadComm() }, [])

  const [recipeCacheLoaded, setRecipeCacheLoaded] = useState(false)
  useEffect(() => {
    if (recipeCacheLoaded) return
    // Load from localStorage first (fast)
    try {
      const saved = localStorage.getItem('sb_recipe_cache')
      if (saved) {
        const parsed = JSON.parse(saved)
        const planKey = plan?.weekPlan?.[0]?.day
        if (parsed._planKey === planKey) setRecipeCache(p => ({...p, ...parsed}))
      }
    } catch(e) {}
    // Then load from cloud (authoritative)
    if (state.user && plan?.weekPlan?.[0]?.day) {
      const planKey = plan.weekPlan[0].day
      loadRecipeCacheCloud(state.user.id, planKey).then(cloudCache => {
        if (Object.keys(cloudCache).length > 0) {
          setRecipeCache(p => ({...p, ...cloudCache}))
        }
      }).catch(() => {})
    }
    setRecipeCacheLoaded(true)
  }, [state.user, plan])

  const saveRecipeCache = (cache) => {
    try {
      const planKey = plan?.weekPlan?.[0]?.day
      localStorage.setItem('sb_recipe_cache', JSON.stringify({...cache, _planKey: planKey}))
    } catch(e) {}
  }

  const saveRecipeCacheEntry = async (rid, recipe) => {
    if (!state.user) return
    try {
      const planKey = plan?.weekPlan?.[0]?.day || 'default'
      await saveRecipeCacheCloud(state.user.id, planKey, rid, recipe)
    } catch(e) { console.warn('Cloud cache save failed:', e.message) }
  }

  const fetchAndCache = async (rid, name, cuisine, desc) => {
    setLoadingCard(rid)
    try {
      const r = await fetchRecipe({
        name, cuisine, desc,
        people: parseInt(prefs.people)||2,
        adults: parseInt(prefs.adults)||2,
        kids: parseInt(prefs.kids)||0,
        diet: prefs.diet||'omnivore',
        restrictions: prefs.restrictions||'',
        country: prefs.country||'Lebanon',
        currency: prefs.currency||'$'
      })
      setRecipeCache(prev => {
        const newCache = {...prev, [rid]: r}
        saveRecipeCache(newCache)
        return newCache
      })
      // Save to cloud
      await saveRecipeCacheEntry(rid, r)
    } catch(e) {}
    setLoadingCard(null)
  }

  const toggleCard = async (rid, name, cuisine, desc) => {
    const isOpen = openCards[rid]
    setOpenCards(p => ({...p, [rid]: !isOpen}))
    if (!isOpen && (!recipeCache[rid] || recipeCache[rid].history === undefined)) {
      await fetchAndCache(rid, name, cuisine, desc)
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
        adults: parseInt(prefs.adults)||2,
        kids: parseInt(prefs.kids)||0,
        diet: prefs.diet||'omnivore',
        restrictions: prefs.restrictions||'',
        country: prefs.country||'Lebanon',
        currency: prefs.currency||'$'
      })
      setSearchResult(r)
      setSearchResultOpen(true)
      // Save to history (max 10, no duplicates)
      setSearchHistory(prev => {
        const filtered = prev.filter(h => h.dishName !== r.dishName)
        const updated = [r, ...filtered].slice(0, 10)
        try { localStorage.setItem('sb_search_history', JSON.stringify(updated)) } catch(e) {}
        return updated
      })
      try { localStorage.setItem('sb_search_open', 'true') } catch(e) {}
      try { localStorage.setItem('sb_last_search', JSON.stringify(r)) } catch(e) {}
    } catch(e) { setSearchErr(e.message) }
    setSearching(false)
  }

  const addToShopping = () => {
    if (!searchResult?.ingredients?.length) return
    const { updateExtraItems, extraItems } = state
    const newItems = {
      dishName: searchResult.dishName || searchQ,
      cuisine: searchResult.cuisine || '',
      pricePerServing: searchResult.pricePerServing || 0,
      ingredients: searchResult.ingredients.map(ing => ({
        name: ing.name,
        qty: ing.qty || '',
        estimatedCost: 0
      }))
    }
    // Remove same dish if already added
    const filtered = (extraItems || []).filter(e => e.dishName !== newItems.dishName)
    updateExtraItems([...filtered, newItems])
    setAddedToShopping(true)
    setTimeout(() => setAddedToShopping(false), 2000)
  }

  const handleRating = async (recipeId, rating) => {
    if (!state.user) return alert('Sign in to rate recipes')
    try {
      await submitRating(state.user.id, recipeId, rating)
      setUserRatings(p => ({...p, [recipeId]: rating}))
      setCommunity(p => p.map(r => {
        if (r.id !== recipeId) return r
        const oldRating = userRatings[recipeId] || 0
        const oldCount = r.rating_count || 0
        const oldTotal = (r.avg_rating || 0) * oldCount
        const newCount = oldRating ? oldCount : oldCount + 1
        const newTotal = oldRating ? oldTotal - oldRating + rating : oldTotal + rating
        return {...r, avg_rating: Math.round((newTotal/newCount)*10)/10, rating_count: newCount}
      }))
    } catch(e) {}
  }

  const loadRecipeComments = async (recipeId) => {
    try {
      const data = await loadComments(recipeId)
      setComments(p => ({...p, [recipeId]: data}))
    } catch(e) {}
  }

  const handleCommentOpen = (recipeId) => {
    const isOpen = commentOpen[recipeId]
    setCommentOpen(p => ({...p, [recipeId]: !isOpen}))
    if (!isOpen && !comments[recipeId]) loadRecipeComments(recipeId)
  }

  const handleSubmitComment = async (recipeId) => {
    if (!state.user) return alert('Sign in to comment')
    const text = commentInputs[recipeId]?.trim()
    if (!text) return
    setSubmittingComment(p => ({...p, [recipeId]: true}))
    try {
      const author = state.user?.user_metadata?.name || state.user?.email?.split('@')[0] || 'User'
      await submitComment(state.user.id, recipeId, author, text)
      setCommentInputs(p => ({...p, [recipeId]: ''}))
      await loadRecipeComments(recipeId)
      setCommunity(p => p.map(r => r.id===recipeId ? {...r, comment_count:(r.comment_count||0)+1} : r))
    } catch(e) { alert('Could not post comment') }
    setSubmittingComment(p => ({...p, [recipeId]: false}))
  }

  const handleDeleteComment = async (recipeId, commentId) => {
    if (!state.user) return
    try {
      await deleteComment(state.user.id, commentId)
      setComments(p => ({...p, [recipeId]: (p[recipeId]||[]).filter(c => c.id !== commentId)}))
      setCommunity(p => p.map(r => r.id===recipeId ? {...r, comment_count:Math.max(0,(r.comment_count||1)-1)} : r))
    } catch(e) {}
  }

  const handleEditComment = async (recipeId, commentId, newText) => {
    if (!state.user || !newText.trim()) return
    try {
      await supabase.from('recipe_comments')
        .update({ comment: newText.trim() })
        .eq('id', commentId)
        .eq('user_id', state.user.id)
      setComments(p => ({
        ...p,
        [recipeId]: (p[recipeId]||[]).map(c =>
          c.id === commentId ? {...c, comment: newText.trim()} : c
        )
      }))
      setEditingComment(p => { const n = {...p}; delete n[commentId]; return n })
    } catch(e) { alert('Could not edit comment') }
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

  // ── Star Rating Component ──
  const StarRating = ({recipeId, avg, count, userRating}) => (
    <div style={{display:'flex',alignItems:'center',gap:6,margin:'6px 0'}}>
      <div style={{display:'flex',gap:2}}>
        {[1,2,3,4,5].map(star => (
          <button key={star} onClick={()=>handleRating(recipeId, star)}
            style={{background:'none',border:'none',cursor:'pointer',padding:'2px',fontSize:18,
              color: star <= (userRating || Math.round(avg||0)) ? '#f5a623' : '#ddd',
              transition:'color .1s',lineHeight:1}}>
            ★
          </button>
        ))}
      </div>
      {avg > 0 && <span style={{fontSize:11,color:'var(--t3)',fontWeight:500}}>{avg} ({count})</span>}
      {!avg && <span style={{fontSize:11,color:'var(--t3)'}}>No ratings yet</span>}
    </div>
  )

  // ── Comments Section ──
  const renderComments = (recipeId) => {
    const recipeComments = comments[recipeId] || []
    const isOpen = commentOpen[recipeId]
    const recipe = community.find(r => r.id === recipeId)
    return (
      <div style={{marginTop:10,borderTop:'1px solid var(--bdr)',paddingTop:10}}>
        <button onClick={()=>handleCommentOpen(recipeId)}
          style={{background:'none',border:'none',cursor:'pointer',fontFamily:'var(--sans)',
            fontSize:12,color:'var(--t2)',display:'flex',alignItems:'center',gap:5,padding:'4px 0'}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          {isOpen ? 'Hide' : 'Show'} comments {recipe?.comment_count > 0 && `(${recipe.comment_count})`}
        </button>

        {isOpen && (
          <div style={{marginTop:10}}>
            {/* Comment list */}
            {recipeComments.length === 0 && (
              <div style={{fontSize:12,color:'var(--t3)',padding:'8px 0'}}>No comments yet. Be the first!</div>
            )}
            {recipeComments.map(c => (
              <div key={c.id} style={{display:'flex',gap:8,marginBottom:10,alignItems:'flex-start'}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:'var(--g)',color:'#fff',
                  fontSize:11,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {(c.author||'?')[0].toUpperCase()}
                </div>
                <div style={{flex:1,background:'var(--bg2)',borderRadius:10,padding:'8px 11px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
                    <span style={{fontSize:11,fontWeight:600,color:'var(--t)'}}>{c.author}</span>
                    <span style={{fontSize:10,color:'var(--t3)'}}>{timeAgo(c.created_at)}</span>
                  </div>
                  {editingComment[c.id] !== undefined ? (
                    <div style={{marginTop:4}}>
                      <textarea value={editingComment[c.id]}
                        onChange={e=>setEditingComment(p=>({...p,[c.id]:e.target.value}))}
                        rows="2"
                        style={{width:'100%',padding:'6px 8px',fontSize:12,border:'1px solid var(--bdr2)',
                          borderRadius:'var(--r)',background:'var(--bg)',color:'var(--t)',
                          fontFamily:'var(--sans)',outline:'none',resize:'none',boxSizing:'border-box'}}/>
                      <div style={{display:'flex',gap:6,marginTop:4}}>
                        <button onClick={()=>handleEditComment(recipeId,c.id,editingComment[c.id])}
                          style={{padding:'4px 10px',background:'var(--g)',color:'#fff',border:'none',
                            borderRadius:'var(--r)',cursor:'pointer',fontFamily:'var(--sans)',fontSize:11,fontWeight:600}}>Save</button>
                        <button onClick={()=>setEditingComment(p=>{const n={...p};delete n[c.id];return n})}
                          style={{padding:'4px 10px',background:'none',border:'1px solid var(--bdr2)',
                            borderRadius:'var(--r)',cursor:'pointer',fontFamily:'var(--sans)',fontSize:11,color:'var(--t2)'}}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{fontSize:13,color:'var(--t2)',lineHeight:1.5}}>{c.comment}</div>
                  )}
                  {state.user && c.user_id === state.user.id && editingComment[c.id] === undefined && (
                    <div style={{display:'flex',gap:8,marginTop:4}}>
                      <button onClick={()=>setEditingComment(p=>({...p,[c.id]:c.comment}))}
                        style={{background:'none',border:'none',cursor:'pointer',fontSize:10,
                          color:'var(--g)',fontFamily:'var(--sans)'}}>✏️ Edit</button>
                      <button onClick={()=>handleDeleteComment(recipeId,c.id)}
                        style={{background:'none',border:'none',cursor:'pointer',fontSize:10,
                          color:'var(--t3)',fontFamily:'var(--sans)'}}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Emoji picker */}
            {state.user && (
              <div>
                <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:8}}>
                  {EMOJI_LIST.map(emoji => (
                    <button key={emoji} onClick={()=>setCommentInputs(p=>({...p,[recipeId]:(p[recipeId]||'')+emoji}))}
                      style={{background:'var(--bg2)',border:'1px solid var(--bdr)',borderRadius:8,
                        padding:'4px 7px',fontSize:16,cursor:'pointer',lineHeight:1}}>
                      {emoji}
                    </button>
                  ))}
                </div>
                <div style={{display:'flex',gap:8}}>
                  <input type="text" placeholder="Add a comment…"
                    value={commentInputs[recipeId]||''}
                    onChange={e=>setCommentInputs(p=>({...p,[recipeId]:e.target.value}))}
                    onKeyDown={e=>e.key==='Enter'&&handleSubmitComment(recipeId)}
                    style={{flex:1,padding:'9px 12px',fontSize:13,border:'1px solid var(--bdr2)',
                      borderRadius:'var(--r)',background:'var(--bg)',color:'var(--t)',
                      fontFamily:'var(--sans)',outline:'none'}}/>
                  <button onClick={()=>handleSubmitComment(recipeId)}
                    disabled={submittingComment[recipeId]}
                    style={{padding:'9px 14px',background:'var(--g)',color:'#fff',border:'none',
                      borderRadius:'var(--r)',cursor:'pointer',fontFamily:'var(--sans)',
                      fontSize:12,fontWeight:500,flexShrink:0}}>
                    {submittingComment[recipeId] ? '…' : 'Post'}
                  </button>
                </div>
              </div>
            )}
            {!state.user && (
              <div style={{fontSize:12,color:'var(--t3)',padding:'6px 0'}}>Sign in to comment</div>
            )}
          </div>
        )}
      </div>
    )
  }

  const RecipeBody = ({r}) => r ? (
    <div style={{padding:'0 16px 16px'}}>
      {/* HISTORY */}
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
      {/* BADGES */}
      <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
        {r.prepTime&&<span style={{fontSize:11,padding:'4px 9px',background:'var(--bg2)',borderRadius:99,color:'var(--t2)'}}>⏱ Prep {r.prepTime}</span>}
        {r.cookTime&&<span style={{fontSize:11,padding:'4px 9px',background:'var(--bg2)',borderRadius:99,color:'var(--t2)'}}>🔥 Cook {r.cookTime}</span>}
        {r.difficulty&&<span style={{fontSize:11,padding:'4px 9px',background:'var(--bg2)',borderRadius:99,color:'var(--t2)'}}>📊 {r.difficulty}</span>}
        {planCostPerMeal>0&&<span style={{fontSize:11,padding:'4px 9px',background:'var(--al)',borderRadius:99,color:'var(--am)'}}>💰 {cur}{planCostPerMeal.toFixed(2)} /meal</span>}
        {r.calories&&<span style={{fontSize:11,padding:'4px 9px',background:'var(--gl)',borderRadius:99,color:'var(--gm)'}}>⚡ {r.calories} kcal</span>}
      </div>
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
      {r.tip&&<div className="recipe-tip">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {r.tip}
      </div>}
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
                  <button onClick={e=>{e.stopPropagation();setSearchResult(null);try{localStorage.removeItem('sb_last_search')}catch(e2){}}} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:'var(--t3)',fontFamily:'var(--sans)',padding:'2px 6px',borderRadius:6}}>✕ Clear</button>
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
            {searchResultOpen && <RecipeBody r={searchResult}/>}
          </div>
        )}

        {/* SEARCH HISTORY */}
        {searchHistory.length > 1 && (
          <div style={{marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <div style={{fontSize:11,fontWeight:600,color:'var(--t3)',letterSpacing:.5}}>RECENT SEARCHES</div>
              <button onClick={()=>{setSearchHistory([]);try{localStorage.removeItem('sb_search_history')}catch(e){}}}
                style={{fontSize:11,color:'var(--t3)',background:'none',border:'none',cursor:'pointer',fontFamily:'var(--sans)'}}>
                Clear all
              </button>
            </div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {searchHistory.slice(1).map((h,i)=>(
                <button key={i} onClick={()=>{setSearchResult(h);setSearchResultOpen(true)}}
                  style={{fontSize:11,padding:'5px 10px',background:'var(--bg2)',border:'1px solid var(--bdr)',
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
                    <div style={{borderTop:'1px solid var(--bdr)'}}>
                      {loadingCard===rid
                        ? <div className="recipe-body-loading"><div className="spin"></div>Loading recipe…</div>
                        : r ? <RecipeBody r={r}/>
                        : <div style={{padding:'16px',fontSize:13,color:'var(--t2)'}}>Tap to load recipe details.</div>
                      }
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
            <div style={{fontSize:11,color:'var(--t3)',marginTop:2}}>Real recipes shared by real people — rate, comment & add yours</div>
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
              const userRating = userRatings[r.id] || 0
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
                      {/* STAR RATING */}
                      <StarRating recipeId={r.id} avg={r.avg_rating} count={r.rating_count} userRating={userRating}/>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flexShrink:0}}>
                      <button className={`comm-like-btn${isLiked?' liked':''}`} onClick={e=>{e.stopPropagation();handleLike(r.id)}}>
                        <svg viewBox="0 0 24 24" fill={isLiked?'var(--rd)':'none'} stroke={isLiked?'var(--rd)':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        {r.likes||0}
                      </button>
                      {r.comment_count > 0 && (
                        <span style={{fontSize:10,color:'var(--t3)',display:'flex',alignItems:'center',gap:2}}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:11,height:11}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          {r.comment_count}
                        </span>
                      )}
                    </div>
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
                      {/* COMMENTS */}
                      {renderComments(r.id)}
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
