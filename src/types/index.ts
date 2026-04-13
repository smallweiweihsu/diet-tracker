// ─── User (Multi-user) ───────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  avatarColor: string
}

// ─── User Profile & Goals ────────────────────────────────────────────────────

export type GoalType = 'fat_loss' | 'muscle_gain' | 'maintain'

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extra_active'

export interface UserProfile {
  userName: string
  sex: 'male' | 'female'
  height: number        // cm
  currentWeight: number // kg
  targetWeight: number  // kg
  age: number
  activityLevel: ActivityLevel
  goalType: GoalType
  weeklyGoalKg: 0.25 | 0.5 | 0.75 | 1.0
  tdee: number
  dailyCalorieTarget: number
  proteinTarget: number // g
  carbTarget: number    // g
  fatTarget: number     // g
  updatedAt: string
}

// ─── Fasting ─────────────────────────────────────────────────────────────────

export type FastingPreset = '16:8' | '14:10' | 'custom'

export interface FastingSettings {
  enabled: boolean
  preset: FastingPreset
  fastingHours: number  // e.g. 16
  eatingHours: number   // e.g. 8
  fastingStartTime: string  // "20:00"
}

// ─── Food Logging ─────────────────────────────────────────────────────────────

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks'

export interface FoodEntry {
  id: string
  name: string
  portion: string       // e.g. "1碗", "100g" (text)
  calories: number
  protein: number       // g
  carbs: number         // g
  fat: number           // g
  sugar: number         // g
  saturatedFat: number  // g
  fiber: number         // g
  sodium: number        // mg
  photoUrl?: string     // base64 compressed
  loggedAt: string
}

export interface DayLog {
  date: string  // "YYYY-MM-DD"
  meals: Record<MealType, FoodEntry[]>
  exerciseCalories: number
  waterMl: number
  notes: string
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  totalSugar: number
  totalSaturatedFat: number
  totalFiber: number
  totalSodium: number
  netCalories: number
  isWithinTarget: boolean
}

// ─── Weight Tracking ──────────────────────────────────────────────────────────

export interface WeightEntry {
  date: string  // "YYYY-MM-DD"
  weight: number
}

// ─── Body Measurements ───────────────────────────────────────────────────────

export interface Measurement {
  date: string   // "YYYY-MM-DD"
  waist?: number  // cm
  hip?: number    // cm
  chest?: number  // cm
}

// ─── Meal Templates ──────────────────────────────────────────────────────────

export interface TemplateItem {
  name: string
  portion: string
  calories: number
  protein: number
  carbs: number
  fat: number
  sugar: number
  saturatedFat: number
  fiber: number
  sodium: number
}

export interface MealTemplate {
  id: string
  name: string
  items: TemplateItem[]
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export interface AppSettings {
  setupComplete: boolean
}
