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
  const { error } = await supabase.from('plans').upsert({
    user_id: userId,
    name: 'My Weekly Plan',
    plan_data: planData
  }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function loadPlan(userId) {
  const { data, error } = await supabase
    .from('plans')
    .select('plan_data')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.plan_data || null
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
