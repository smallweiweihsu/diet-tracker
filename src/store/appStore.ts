import { create } from 'zustand'
import type {
  UserProfile, FastingSettings, AppSettings,
  DayLog, WeightEntry, FoodEntry, MealType,
} from '../types'
import { storageGet, storageSet } from '../utils/storage'
import { todayStr } from '../utils/dateHelpers'

const DEFAULT_FASTING: FastingSettings = {
  enabled: false,
  preset: '16:8',
  fastingHours: 16,
  eatingHours: 8,
  fastingStartTime: '20:00',
}

const DEFAULT_SETTINGS: AppSettings = {
  setupComplete: false,
}

function emptyDayLog(date: string): DayLog {
  return {
    date,
    meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
    exerciseCalories: 0,
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    netCalories: 0,
    isWithinTarget: true,
  }
}

function recomputeDay(log: DayLog, target: number): DayLog {
  let cal = 0, pro = 0, carbs = 0, fat = 0
  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks']
  mealTypes.forEach(m => {
    log.meals[m].forEach(e => {
      cal += e.calories
      pro += e.protein
      carbs += e.carbs
      fat += e.fat
    })
  })
  const net = Math.max(0, cal - log.exerciseCalories)
  return {
    ...log,
    totalCalories: cal,
    totalProtein: pro,
    totalCarbs: carbs,
    totalFat: fat,
    netCalories: net,
    isWithinTarget: net <= target,
  }
}

interface AppState {
  profile: UserProfile | null
  fasting: FastingSettings
  settings: AppSettings
  weights: WeightEntry[]
  days: Record<string, DayLog>

  // actions
  setProfile(p: UserProfile): void
  setFasting(f: FastingSettings): void
  completeSetup(): void

  getTodayLog(): DayLog
  addFood(meal: MealType, entry: FoodEntry): void
  removeFood(meal: MealType, id: string): void
  setExercise(kcal: number): void

  addWeight(entry: WeightEntry): void
  removeWeight(date: string): void
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: storageGet('dt:profile', null as unknown as UserProfile) || null,
  fasting: storageGet('dt:fasting', DEFAULT_FASTING),
  settings: storageGet('dt:settings', DEFAULT_SETTINGS),
  weights: storageGet('dt:weights', []),
  days: storageGet('dt:days', {}),

  setProfile(p) {
    storageSet('dt:profile', p)
    set({ profile: p })
  },

  setFasting(f) {
    storageSet('dt:fasting', f)
    set({ fasting: f })
  },

  completeSetup() {
    const s = { setupComplete: true }
    storageSet('dt:settings', s)
    set({ settings: s })
  },

  getTodayLog() {
    const today = todayStr()
    return get().days[today] ?? emptyDayLog(today)
  },

  addFood(meal, entry) {
    const today = todayStr()
    const days = { ...get().days }
    const log = days[today] ? { ...days[today] } : emptyDayLog(today)
    log.meals = { ...log.meals, [meal]: [...log.meals[meal], entry] }
    const target = get().profile?.dailyCalorieTarget ?? 2000
    days[today] = recomputeDay(log, target)
    storageSet('dt:days', days)
    set({ days })
  },

  removeFood(meal, id) {
    const today = todayStr()
    const days = { ...get().days }
    const log = days[today]
    if (!log) return
    const updated = { ...log }
    updated.meals = { ...log.meals, [meal]: log.meals[meal].filter(e => e.id !== id) }
    const target = get().profile?.dailyCalorieTarget ?? 2000
    days[today] = recomputeDay(updated, target)
    storageSet('dt:days', days)
    set({ days })
  },

  setExercise(kcal) {
    const today = todayStr()
    const days = { ...get().days }
    const log = days[today] ? { ...days[today] } : emptyDayLog(today)
    log.exerciseCalories = kcal
    const target = get().profile?.dailyCalorieTarget ?? 2000
    days[today] = recomputeDay(log, target)
    storageSet('dt:days', days)
    set({ days })
  },

  addWeight(entry) {
    const weights = [...get().weights.filter(w => w.date !== entry.date), entry]
      .sort((a, b) => a.date.localeCompare(b.date))
    storageSet('dt:weights', weights)
    set({ weights })
  },

  removeWeight(date) {
    const weights = get().weights.filter(w => w.date !== date)
    storageSet('dt:weights', weights)
    set({ weights })
  },
}))
