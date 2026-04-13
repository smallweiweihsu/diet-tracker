import { create } from 'zustand'
import type {
  User, UserProfile, FastingSettings, AppSettings,
  DayLog, WeightEntry, FoodEntry, MealType,
  Measurement, MealTemplate,
} from '../types'
import {
  userGet, userSet, getUserList, setUserList,
  getActiveUserId, setActiveUserId, migrateOldData,
} from '../utils/storage'
import { todayStr } from '../utils/dateHelpers'

const DEFAULT_FASTING: FastingSettings = {
  enabled: false,
  preset: '16:8',
  fastingHours: 16,
  eatingHours: 8,
  fastingStartTime: '20:00',
}

const DEFAULT_SETTINGS: AppSettings = { setupComplete: false }

export function emptyDayLog(date: string): DayLog {
  return {
    date,
    meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
    exerciseCalories: 0,
    waterMl: 0,
    notes: '',
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    totalSugar: 0,
    totalSaturatedFat: 0,
    totalFiber: 0,
    totalSodium: 0,
    netCalories: 0,
    isWithinTarget: true,
  }
}

function recomputeDay(log: DayLog, target: number): DayLog {
  let cal = 0, pro = 0, carbs = 0, fat = 0
  let sugar = 0, satFat = 0, fiber = 0, sodium = 0
  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks']
  mealTypes.forEach(m => {
    log.meals[m].forEach(e => {
      cal += e.calories
      pro += e.protein
      carbs += e.carbs
      fat += e.fat
      sugar += e.sugar ?? 0
      satFat += e.saturatedFat ?? 0
      fiber += e.fiber ?? 0
      sodium += e.sodium ?? 0
    })
  })
  const net = Math.max(0, cal - log.exerciseCalories)
  return {
    ...log,
    totalCalories: cal,
    totalProtein: pro,
    totalCarbs: carbs,
    totalFat: fat,
    totalSugar: sugar,
    totalSaturatedFat: satFat,
    totalFiber: fiber,
    totalSodium: sodium,
    netCalories: net,
    isWithinTarget: net <= target,
  }
}

interface AppState {
  // Multi-user
  users: User[]
  currentUser: User | null

  // Per-user data
  profile: UserProfile | null
  fasting: FastingSettings
  settings: AppSettings
  weights: WeightEntry[]
  days: Record<string, DayLog>
  measurements: Measurement[]
  mealTemplates: MealTemplate[]
  recentFoods: FoodEntry[]

  // ── User actions ──
  initStore(): void
  addUser(user: User): void
  removeUser(userId: string): void
  switchUser(userId: string): void

  // ── Profile actions ──
  setProfile(p: UserProfile): void
  updateUserName(name: string): void
  updateUserAvatar(emoji: string): void
  setFasting(f: FastingSettings): void
  completeSetup(): void

  // ── Day log actions ──
  getDayLog(date: string): DayLog
  addFood(meal: MealType, entry: FoodEntry, date: string): void
  removeFood(meal: MealType, id: string, date: string): void
  setExercise(kcal: number, date: string): void
  setWater(ml: number, date: string): void
  setNotes(text: string, date: string): void

  // ── Weight actions ──
  addWeight(entry: WeightEntry): void
  removeWeight(date: string): void

  // ── Measurements ──
  addMeasurement(m: Measurement): void
  removeMeasurement(date: string): void

  // ── Meal templates ──
  saveMealTemplate(t: MealTemplate): void
  deleteMealTemplate(id: string): void
  applyMealTemplate(templateId: string, meal: MealType, date: string): void
}

function loadUserData(userId: string) {
  return {
    profile: userGet('profile', userId, null as unknown as UserProfile) || null,
    fasting: userGet('fasting', userId, DEFAULT_FASTING),
    settings: userGet('settings', userId, DEFAULT_SETTINGS),
    weights: userGet('weights', userId, []),
    days: userGet('days', userId, {}),
    measurements: userGet('measurements', userId, []),
    mealTemplates: userGet('mealTemplates', userId, []),
    recentFoods: userGet('recentFoods', userId, []),
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  users: [],
  currentUser: null,
  profile: null,
  fasting: DEFAULT_FASTING,
  settings: DEFAULT_SETTINGS,
  weights: [],
  days: {},
  measurements: [],
  mealTemplates: [],
  recentFoods: [],

  initStore() {
    // Try migrating old single-user data first
    migrateOldData()

    const users = getUserList()
    const activeId = getActiveUserId()
    const currentUser = users.find(u => u.id === activeId) ?? null

    if (currentUser) {
      set({ users, currentUser, ...loadUserData(currentUser.id) })
    } else {
      set({ users, currentUser: null })
    }
  },

  addUser(user) {
    const users = [...get().users, user]
    setUserList(users)
    set({ users })
  },

  removeUser(userId) {
    const users = get().users.filter(u => u.id !== userId)
    setUserList(users)
    set({ users })
  },

  switchUser(userId) {
    const users = get().users
    const user = users.find(u => u.id === userId)
    if (!user) return
    setActiveUserId(userId)
    set({ currentUser: user, ...loadUserData(userId) })
  },

  setProfile(p) {
    const uid = get().currentUser?.id ?? ''
    userSet('profile', uid, p)
    set({ profile: p })
  },

  updateUserName(name) {
    const current = get().currentUser
    if (!current) return
    const trimmed = name.trim()
    if (!trimmed) return
    const updated = { ...current, name: trimmed }
    const users = get().users.map(u => u.id === current.id ? updated : u)
    setUserList(users)
    set({ currentUser: updated, users })
  },

  updateUserAvatar(emoji) {
    const current = get().currentUser
    if (!current) return
    const updated = { ...current, avatarEmoji: emoji }
    const users = get().users.map(u => u.id === current.id ? updated : u)
    setUserList(users)
    set({ currentUser: updated, users })
  },

  setFasting(f) {
    const uid = get().currentUser?.id ?? ''
    userSet('fasting', uid, f)
    set({ fasting: f })
  },

  completeSetup() {
    const uid = get().currentUser?.id ?? ''
    const s = { setupComplete: true }
    userSet('settings', uid, s)
    set({ settings: s })
  },

  getDayLog(date) {
    return get().days[date] ?? emptyDayLog(date)
  },

  addFood(meal, entry, date) {
    const uid = get().currentUser?.id ?? ''
    const days = { ...get().days }
    const log = days[date] ? { ...days[date] } : emptyDayLog(date)
    log.meals = { ...log.meals, [meal]: [...log.meals[meal], entry] }
    const target = get().profile?.dailyCalorieTarget ?? 2000
    days[date] = recomputeDay(log, target)
    userSet('days', uid, days)

    // Update recent foods (deduplicate by name, keep last 20)
    const recent = [
      { ...entry },
      ...get().recentFoods.filter(f => f.name !== entry.name),
    ].slice(0, 20)
    userSet('recentFoods', uid, recent)

    set({ days, recentFoods: recent })
  },

  removeFood(meal, id, date) {
    const uid = get().currentUser?.id ?? ''
    const days = { ...get().days }
    const log = days[date]
    if (!log) return
    const updated = { ...log }
    updated.meals = { ...log.meals, [meal]: log.meals[meal].filter(e => e.id !== id) }
    const target = get().profile?.dailyCalorieTarget ?? 2000
    days[date] = recomputeDay(updated, target)
    userSet('days', uid, days)
    set({ days })
  },

  setExercise(kcal, date) {
    const uid = get().currentUser?.id ?? ''
    const days = { ...get().days }
    const log = days[date] ? { ...days[date] } : emptyDayLog(date)
    log.exerciseCalories = kcal
    const target = get().profile?.dailyCalorieTarget ?? 2000
    days[date] = recomputeDay(log, target)
    userSet('days', uid, days)
    set({ days })
  },

  setWater(ml, date) {
    const uid = get().currentUser?.id ?? ''
    const days = { ...get().days }
    const log = days[date] ? { ...days[date] } : emptyDayLog(date)
    log.waterMl = ml
    const target = get().profile?.dailyCalorieTarget ?? 2000
    days[date] = recomputeDay(log, target)
    userSet('days', uid, days)
    set({ days })
  },

  setNotes(text, date) {
    const uid = get().currentUser?.id ?? ''
    const days = { ...get().days }
    const log = days[date] ? { ...days[date] } : emptyDayLog(date)
    log.notes = text
    userSet('days', uid, days)
    set({ days })
  },

  addWeight(entry) {
    const uid = get().currentUser?.id ?? ''
    const weights = [...get().weights.filter(w => w.date !== entry.date), entry]
      .sort((a, b) => a.date.localeCompare(b.date))
    userSet('weights', uid, weights)
    set({ weights })
  },

  removeWeight(date) {
    const uid = get().currentUser?.id ?? ''
    const weights = get().weights.filter(w => w.date !== date)
    userSet('weights', uid, weights)
    set({ weights })
  },

  addMeasurement(m) {
    const uid = get().currentUser?.id ?? ''
    const measurements = [
      ...get().measurements.filter(x => x.date !== m.date),
      m,
    ].sort((a, b) => a.date.localeCompare(b.date))
    userSet('measurements', uid, measurements)
    set({ measurements })
  },

  removeMeasurement(date) {
    const uid = get().currentUser?.id ?? ''
    const measurements = get().measurements.filter(m => m.date !== date)
    userSet('measurements', uid, measurements)
    set({ measurements })
  },

  saveMealTemplate(t) {
    const uid = get().currentUser?.id ?? ''
    const templates = [
      ...get().mealTemplates.filter(x => x.id !== t.id),
      t,
    ]
    userSet('mealTemplates', uid, templates)
    set({ mealTemplates: templates })
  },

  deleteMealTemplate(id) {
    const uid = get().currentUser?.id ?? ''
    const templates = get().mealTemplates.filter(t => t.id !== id)
    userSet('mealTemplates', uid, templates)
    set({ mealTemplates: templates })
  },

  applyMealTemplate(templateId, meal, date) {
    const template = get().mealTemplates.find(t => t.id === templateId)
    if (!template) return
    const uid = get().currentUser?.id ?? ''
    const days = { ...get().days }
    const log = days[date] ? { ...days[date] } : emptyDayLog(date)
    const newEntries: FoodEntry[] = template.items.map(item => ({
      id: crypto.randomUUID(),
      name: item.name,
      portion: item.portion,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      sugar: item.sugar,
      saturatedFat: item.saturatedFat,
      fiber: item.fiber,
      sodium: item.sodium,
      loggedAt: new Date().toISOString(),
    }))
    log.meals = { ...log.meals, [meal]: [...log.meals[meal], ...newEntries] }
    const target = get().profile?.dailyCalorieTarget ?? 2000
    days[date] = recomputeDay(log, target)
    userSet('days', uid, days)
    set({ days })
  },
}))

// Compute streak: consecutive days with at least 1 food entry
export function computeStreak(days: Record<string, DayLog>): number {
  let streak = 0
  let d = new Date()
  // Allow today to not have entries yet (don't break streak for today)
  const todayHasEntries = Object.values(
    days[todayStr()]?.meals ?? { breakfast: [], lunch: [], dinner: [], snacks: [] }
  ).some(arr => arr.length > 0)
  if (!todayHasEntries) {
    d.setDate(d.getDate() - 1)
  }
  while (true) {
    const dateStr = d.toISOString().slice(0, 10)
    const log = days[dateStr]
    const hasEntries = log && Object.values(log.meals).some(arr => arr.length > 0)
    if (!hasEntries) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}
