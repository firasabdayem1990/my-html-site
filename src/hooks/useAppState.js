import { useState, useEffect, useCallback } from 'react'
import { savePlan, loadPlan, savePantry, loadPantry, savePrefs, loadPrefs, saveChecked, loadChecked } from '../supabase.js'

const LOCAL_KEY = {
  pantry: 'sb_pantry',
  plan: 'sb_plan',
  checked: 'sb_checked',
  prefs: 'sb_prefs'
}

const defaultPrefs = {
  budget: '80',
  people: '2',
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
  calTarget: 0
}

export function useAppState(user) {
  const [pantry, setPantry] = useState([])
  const [plan, setPlan] = useState(null)
  const [checked, setChecked] = useState(new Set())
  const [prefs, setPrefs] = useState(defaultPrefs)
  const [isDemo, setIsDemo] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Load data on mount or user change
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
          if (cloudPrefs) setPrefs(p => ({ ...p, ...cloudPrefs }))
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
      if (pr) setPrefs(p => ({ ...p, ...JSON.parse(pr) }))
    } catch (e) {}
  }

  const saveAll = useCallback(async ({ newPantry, newPlan, newChecked, newPrefs, demo } = {}) => {
    const p = newPantry !== undefined ? newPantry : pantry
    const pl = newPlan !== undefined ? newPlan : plan
    const ch = newChecked !== undefined ? newChecked : checked
    const pr = newPrefs !== undefined ? newPrefs : prefs
    const dm = demo !== undefined ? demo : isDemo

    // Always save to localStorage as fallback
    try {
      localStorage.setItem(LOCAL_KEY.pantry, JSON.stringify(p))
      if (!dm) localStorage.setItem(LOCAL_KEY.plan, JSON.stringify(pl))
      localStorage.setItem(LOCAL_KEY.checked, JSON.stringify([...ch]))
      localStorage.setItem(LOCAL_KEY.prefs, JSON.stringify(pr))
    } catch (e) {}

    // Also sync to cloud
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

  return {
    pantry, plan, checked, prefs, isDemo, dataLoaded,
    updatePantry, updatePlan, updateChecked, updatePrefs, clearPlan,
    setPlan, setIsDemo
  }
}
