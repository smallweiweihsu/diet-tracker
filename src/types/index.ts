// ─── User Profile & Goals ────────────────────────────────────────────────────

export type GoalType = 'fat_loss' | 'muscle_gain' | 'maintain'

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extra_active'

export interface UserProfile {
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
  calories: number
  protein: number  // g
  carbs: number    // g
  fat: number      // g
  photoUrl?: string
  loggedAt: string
}

export interface DayLog {
  date: string  // "YYYY-MM-DD"
  meals: Record<MealType, FoodEntry[]>
  exerciseCalories: number
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  netCalories: number
  isWithinTarget: boolean
}

// ─── Weight Tracking ──────────────────────────────────────────────────────────

export interface WeightEntry {
  date: string  // "YYYY-MM-DD"
  weight: number
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export interface AppSettings {
  setupComplete: boolean
}

// ─── Storage Schema ───────────────────────────────────────────────────────────

export interface StorageSchema {
  'dt:profile': UserProfile
  'dt:fasting': FastingSettings
  'dt:settings': AppSettings
  'dt:weights': WeightEntry[]
  'dt:days': Record<string, DayLog>
}
