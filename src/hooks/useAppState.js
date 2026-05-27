import { useState, useEffect, useCallback } from 'react'
import { savePlan, loadPlan, savePantry, loadPantry, savePrefs, loadPrefs, saveChecked, loadChecked, saveUserMeta, loadUserMeta } from '../supabase.js'

const LOCAL_KEY = {
  pantry: 'sb_pantry',
  plan: 'sb_plan',
  checked: 'sb_checked',
  prefs: 'sb_prefs'
}

const defaultPrefs = {
  budget: '80',
  adults: '2',
  kids: '0',
  people: '2', // kept for backward compat
  currency: '$',
  country: 'Lebanon',
  restrictions: '',
  diet: 'omnivore',
  health: [],
  cuisines: [],
  calAge: '',
  calWeight: '',
  calHeight: '',
  calActivity: '1.55',
  calGoal: 'maintain',
  calGender: 'male',
  calTarget: 0,
  cuisinePercs: []
}

export function useAppState(user) {
  // user is passed from App.jsx via MainApp
  const [pantry, setPantry] = useState([])
  const [plan, setPlan] = useState(null)
  const [checked, setChecked] = useState(new Set())
  const [prefs, setPrefs] = useState(defaultPrefs)
  const [isDemo, setIsDemo] = useState(false)
  const [extraItems, setExtraItems] = useState([]) // recipe shopping extras
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (user) {
        try {
          const [cloudPantry, cloudPlan, cloudPrefs, cloudChecked] = await Promise.all([
            loadPantry(user.id),
            loadPlan(user.id),
            loadPrefs(user.id),
            loadChecked(user.id)
          ])
          if (cloudPantry) setPantry(cloudPantry)
          if (cloudPlan) setPlan(cloudPlan)
          const ex = localStorage.getItem('sb_extra_items')
          if (ex) setExtraItems(JSON.parse(ex))
          // Load search history and extra items from cloud
          try {
            const [cloudExtras, cloudHistory] = await Promise.all([
              loadUserMeta(user.id, 'extra_items'),
              loadUserMeta(user.id, 'search_history')
            ])
            if (cloudExtras?.length) setExtraItems(cloudExtras)
            if (cloudHistory?.length) {
              localStorage.setItem('sb_search_history', JSON.stringify(cloudHistory))
            }
          } catch(e) {}
          if (cloudPrefs) setPrefs(p => {
            const merged = { ...p, ...cloudPrefs }
            // Migrate old 'people' field to adults if needed
            if (!merged.adults && merged.people) merged.adults = merged.people
            if (!merged.kids) merged.kids = '0'
            // Keep people in sync
            merged.people = String(parseInt(merged.adults||2) + parseInt(merged.kids||0))
            return merged
          })
          if (cloudChecked) setChecked(cloudChecked)
        } catch (e) {
          console.warn('Cloud load failed, using local', e)
          loadLocal()
        }
      } else {
        loadLocal()
      }
      setDataLoaded(true)
    }
    loadData()
  }, [user])

  const loadLocal = () => {
    try {
      const p = localStorage.getItem(LOCAL_KEY.pantry)
      if (p) setPantry(JSON.parse(p))
      const pl = localStorage.getItem(LOCAL_KEY.plan)
      if (pl) setPlan(JSON.parse(pl))
      const ch = localStorage.getItem(LOCAL_KEY.checked)
      if (ch) setChecked(new Set(JSON.parse(ch)))
      const pr = localStorage.getItem(LOCAL_KEY.prefs)
      if (pr) {
        const saved = JSON.parse(pr)
        // Migrate old 'people' to adults
        if (!saved.adults && saved.people) saved.adults = saved.people
        if (!saved.kids) saved.kids = '0'
        saved.people = String(parseInt(saved.adults||2) + parseInt(saved.kids||0))
        setPrefs(p => ({ ...p, ...saved }))
      }
    } catch (e) {}
  }

  const saveAll = useCallback(async ({ newPantry, newPlan, newChecked, newPrefs, demo } = {}) => {
    const p = newPantry !== undefined ? newPantry : pantry
    const pl = newPlan !== undefined ? newPlan : plan
    const ch = newChecked !== undefined ? newChecked : checked
    const pr = newPrefs !== undefined ? newPrefs : prefs
    const dm = demo !== undefined ? demo : isDemo

    try {
      localStorage.setItem(LOCAL_KEY.pantry, JSON.stringify(p))
      if (!dm) localStorage.setItem(LOCAL_KEY.plan, JSON.stringify(pl))
      localStorage.setItem(LOCAL_KEY.checked, JSON.stringify([...ch]))
      localStorage.setItem(LOCAL_KEY.prefs, JSON.stringify(pr))
    } catch (e) {}

    if (user) {
      try {
        await Promise.all([
          savePantry(user.id, p),
          !dm && pl ? savePlan(user.id, pl) : Promise.resolve(),
          savePrefs(user.id, pr),
          saveChecked(user.id, ch)
        ])
      } catch (e) {
        console.warn('Cloud save failed', e)
      }
    }
  }, [user, pantry, plan, checked, prefs, isDemo])

  const updatePantry = useCallback((newPantry) => {
    setPantry(newPantry)
    saveAll({ newPantry })
  }, [saveAll])

  const updatePlan = useCallback((newPlan, demo = false) => {
    setPlan(newPlan)
    setIsDemo(demo)
    saveAll({ newPlan, demo })
  }, [saveAll])

  const updateChecked = useCallback((newChecked) => {
    setChecked(newChecked)
    saveAll({ newChecked })
  }, [saveAll])

  const updatePrefs = useCallback((newPrefs) => {
    setPrefs(p => {
      const merged = { ...p, ...newPrefs }
      // Always keep people in sync with adults + kids
      merged.people = String(parseInt(merged.adults||2) + parseInt(merged.kids||0))
      saveAll({ newPrefs: merged })
      return merged
    })
  }, [saveAll])

  const clearPlan = useCallback(() => {
    setPlan(null)
    setIsDemo(false)
    setChecked(new Set())
    saveAll({ newPlan: null, newChecked: new Set(), demo: false })
  }, [saveAll])

  const updateExtraItems = useCallback((items) => {
    setExtraItems(items)
    try { localStorage.setItem('sb_extra_items', JSON.stringify(items)) } catch(e) {}
    if (user) saveUserMeta(user.id, 'extra_items', items).catch(() => {})
  }, [user])

  return {
    pantry, plan, checked, prefs, isDemo, dataLoaded, extraItems, user,
    updatePantry, updatePlan, updateChecked, updatePrefs, clearPlan,
    setPlan, setIsDemo, updateExtraItems
  }
}
