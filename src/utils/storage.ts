import type { User, UserProfile, FastingSettings, AppSettings, WeightEntry, DayLog, Measurement, MealTemplate, FoodEntry } from '../types'

// ─── Per-user typed keys ──────────────────────────────────────────────────────

export interface UserStorageSchema {
  profile: UserProfile
  fasting: FastingSettings
  settings: AppSettings
  weights: WeightEntry[]
  days: Record<string, DayLog>
  measurements: Measurement[]
  mealTemplates: MealTemplate[]
  recentFoods: FoodEntry[]
  foodDraft: Partial<FoodEntry> | null
}

function userKey(base: keyof UserStorageSchema, userId: string): string {
  return `dt:${userId}:${base}`
}

export function userGet<K extends keyof UserStorageSchema>(
  base: K,
  userId: string,
  fallback: UserStorageSchema[K],
): UserStorageSchema[K] {
  try {
    const raw = localStorage.getItem(userKey(base, userId))
    return raw ? (JSON.parse(raw) as UserStorageSchema[K]) : fallback
  } catch {
    return fallback
  }
}

export function userSet<K extends keyof UserStorageSchema>(
  base: K,
  userId: string,
  value: UserStorageSchema[K],
): void {
  localStorage.setItem(userKey(base, userId), JSON.stringify(value))
}

export function userClear(userId: string): void {
  const bases: (keyof UserStorageSchema)[] = [
    'profile', 'fasting', 'settings', 'weights', 'days',
    'measurements', 'mealTemplates', 'recentFoods', 'foodDraft',
  ]
  bases.forEach(b => localStorage.removeItem(userKey(b, userId)))
}

// ─── Global (non-user) keys ───────────────────────────────────────────────────

export function getUserList(): User[] {
  try {
    const raw = localStorage.getItem('dt:users')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function setUserList(users: User[]): void {
  localStorage.setItem('dt:users', JSON.stringify(users))
}

export function getActiveUserId(): string | null {
  return localStorage.getItem('dt:activeUserId')
}

export function setActiveUserId(id: string | null): void {
  if (id === null) localStorage.removeItem('dt:activeUserId')
  else localStorage.setItem('dt:activeUserId', id)
}

// ─── Migration: old single-user data → new format ────────────────────────────
// Run once if old keys exist but no users list

export function migrateOldData(): User | null {
  const alreadyMigrated = getUserList().length > 0
  if (alreadyMigrated) return null

  const hasOldData = localStorage.getItem('dt:profile') || localStorage.getItem('dt:days')
  if (!hasOldData) return null

  const userId = crypto.randomUUID()
  let userName = '我'
  try {
    const raw = localStorage.getItem('dt:profile')
    if (raw) {
      const p = JSON.parse(raw) as Partial<UserProfile>
      if (p.userName) userName = p.userName
    }
  } catch { /* ignore */ }

  const user: User = { id: userId, name: userName, avatarColor: '#34c759' }

  // Copy all old keys to new namespaced keys
  const mapping: [string, keyof UserStorageSchema][] = [
    ['dt:profile', 'profile'],
    ['dt:fasting', 'fasting'],
    ['dt:settings', 'settings'],
    ['dt:weights', 'weights'],
    ['dt:days', 'days'],
  ]
  mapping.forEach(([oldKey, newBase]) => {
    const raw = localStorage.getItem(oldKey)
    if (raw) {
      localStorage.setItem(userKey(newBase, userId), raw)
      localStorage.removeItem(oldKey)
    }
  })

  setUserList([user])
  setActiveUserId(userId)
  return user
}

// ─── Export / Import (per user) ───────────────────────────────────────────────

export function exportUserData(userId: string): string {
  const bases: (keyof UserStorageSchema)[] = [
    'profile', 'fasting', 'settings', 'weights', 'days', 'measurements', 'mealTemplates',
  ]
  const data: Record<string, unknown> = {}
  bases.forEach(b => {
    const raw = localStorage.getItem(userKey(b, userId))
    if (raw) data[b] = JSON.parse(raw)
  })
  return JSON.stringify(data, null, 2)
}

export function importUserData(userId: string, json: string): boolean {
  try {
    const data = JSON.parse(json) as Record<string, unknown>
    Object.entries(data).forEach(([base, value]) => {
      localStorage.setItem(userKey(base as keyof UserStorageSchema, userId), JSON.stringify(value))
    })
    return true
  } catch {
    return false
  }
}
