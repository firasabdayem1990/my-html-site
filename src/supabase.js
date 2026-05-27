// src/supabase.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase not configured — running in local mode')
}

export const supabase = SUPABASE_URL
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

// ── AUTH ──
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { name } }
  })
  if (error) throw error
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ── PLANS ──
export async function savePlan(userId, planData) {
  // Generate week key based on current date (e.g. "2025-W01")
  const now = new Date()
  const weekNum = Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7)
  const weekKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-W${weekNum}`

  // Save this plan
  const { error } = await supabase.from('plans').upsert({
    user_id: userId,
    name: `Plan ${weekKey}`,
    plan_data: planData,
    week_key: weekKey,
    created_week: weekKey
  }, { onConflict: 'user_id,week_key' })
  if (error) throw error

  // Keep only last 4 plans per user
  const { data: allPlans } = await supabase
    .from('plans')
    .select('id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (allPlans && allPlans.length > 4) {
    const toDelete = allPlans.slice(4).map(p => p.id)
    await supabase.from('plans').delete().in('id', toDelete)
  }
}

export async function loadPlan(userId) {
  // Load most recent plan
  const { data, error } = await supabase
    .from('plans')
    .select('plan_data, week_key, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.plan_data || null
}

export async function loadAllPlans(userId) {
  // Load all saved plans (max 4)
  const { data, error } = await supabase
    .from('plans')
    .select('id, plan_data, week_key, created_at, name')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(4)
  if (error) throw error
  return data || []
}

// ── PANTRY ──
export async function savePantry(userId, items) {
  await supabase.from('pantry').delete().eq('user_id', userId)
  if (items.length) {
    await supabase.from('pantry').insert(
      items.map(p => ({ user_id: userId, name: p.name, expiry: p.exp }))
    )
  }
}

export async function loadPantry(userId) {
  const { data, error } = await supabase
    .from('pantry')
    .select('*')
    .eq('user_id', userId)
    .order('created_at')
  if (error) throw error
  return (data || []).map(r => ({ id: r.id, name: r.name, exp: r.expiry || 'Unspecified' }))
}

// ── PREFERENCES ──
export async function savePrefs(userId, prefs) {
  const { error } = await supabase.from('profiles').upsert({
    id: userId, prefs
  }, { onConflict: 'id' })
  if (error) throw error
}

export async function loadPrefs(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('prefs')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data?.prefs || null
}

// ── SHOPPING CHECKED ──
export async function saveChecked(userId, checkedSet) {
  await supabase.from('shopping_checked').delete().eq('user_id', userId)
  if (checkedSet.size) {
    await supabase.from('shopping_checked').insert(
      [...checkedSet].map(k => ({ user_id: userId, item_key: k }))
    )
  }
}

export async function loadChecked(userId) {
  const { data, error } = await supabase
    .from('shopping_checked')
    .select('item_key')
    .eq('user_id', userId)
  if (error) throw error
  return new Set((data || []).map(r => r.item_key))
}

// ── COMMUNITY RECIPES ──
export async function loadCommunityRecipes() {
  const { data, error } = await supabase
    .from('community_recipes')
    .select('*')
    .order('likes', { ascending: false })
  if (error) throw error
  return data || []
}

export async function submitCommunityRecipe(userId, recipe) {
  const { error } = await supabase.from('community_recipes').insert({
    user_id: userId,
    author: recipe.author,
    dish: recipe.dish,
    cuisine: recipe.cuisine,
    cook_time: recipe.cookTime,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    tip: recipe.tip
  })
  if (error) throw error
}

export async function deleteCommunityRecipe(userId, recipeId) {
  const { error } = await supabase
    .from('community_recipes')
    .delete()
    .eq('id', recipeId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function loadUserLikes(userId) {
  const { data, error } = await supabase
    .from('recipe_likes')
    .select('recipe_id')
    .eq('user_id', userId)
  if (error) throw error
  return new Set((data || []).map(r => r.recipe_id))
}

export async function toggleLike(userId, recipeId, isLiked) {
  if (isLiked) {
    await supabase.from('recipe_likes').delete()
      .eq('user_id', userId).eq('recipe_id', recipeId)
  } else {
    await supabase.from('recipe_likes').upsert({ user_id: userId, recipe_id: recipeId })
    await supabase.rpc('increment_likes', { recipe_id: recipeId }).catch(() => {})
  }
}

// ── RECIPE CACHE ──
export async function saveRecipeCacheCloud(userId, planKey, recipeId, recipeData) {
  if (!supabase) return
  const { error } = await supabase.from('recipe_cache').upsert({
    user_id: userId,
    plan_key: planKey,
    recipe_id: recipeId,
    recipe_data: recipeData
  }, { onConflict: 'user_id,recipe_id' })
  if (error) throw error
}

export async function loadRecipeCacheCloud(userId, planKey) {
  if (!supabase) return {}
  const { data, error } = await supabase
    .from('recipe_cache')
    .select('recipe_id, recipe_data')
    .eq('user_id', userId)
    .eq('plan_key', planKey)
  if (error) throw error
  const cache = {}
  ;(data || []).forEach(r => { cache[r.recipe_id] = r.recipe_data })
  return cache
}

export async function clearRecipeCacheCloud(userId) {
  if (!supabase) return
  await supabase.from('recipe_cache').delete().eq('user_id', userId)
}

// ── RATINGS ──
export async function submitRating(userId, recipeId, rating) {
  const { error } = await supabase.from('recipe_ratings').upsert({
    user_id: userId,
    recipe_id: recipeId,
    rating
  }, { onConflict: 'user_id,recipe_id' })
  if (error) throw error
  await supabase.rpc('update_recipe_rating', { p_recipe_id: recipeId }).catch(() => {})
}

export async function loadUserRatings(userId) {
  const { data, error } = await supabase
    .from('recipe_ratings')
    .select('recipe_id, rating')
    .eq('user_id', userId)
  if (error) throw error
  const map = {}
  ;(data || []).forEach(r => { map[r.recipe_id] = r.rating })
  return map
}

// ── COMMENTS ──
export async function loadComments(recipeId) {
  const { data, error } = await supabase
    .from('recipe_comments')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function submitComment(userId, recipeId, author, comment) {
  const { error } = await supabase.from('recipe_comments').insert({
    user_id: userId,
    recipe_id: recipeId,
    author,
    comment
  })
  if (error) throw error
  await supabase.rpc('update_comment_count', { p_recipe_id: recipeId }).catch(() => {})
}

export async function deleteComment(userId, commentId) {
  const { error } = await supabase
    .from('recipe_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId)
  if (error) throw error
}
