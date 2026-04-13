import type { ActivityLevel, GoalType, UserProfile } from '../types'

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
}

export function calcBMR(
  sex: 'male' | 'female',
  weightKg: number,
  heightCm: number,
  age: number,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

export function calcTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel])
}

export function calcDailyTarget(
  tdee: number,
  goalType: GoalType,
  weeklyGoalKg: number,
  sex: 'male' | 'female',
): number {
  const dailyDelta = Math.round((weeklyGoalKg * 7700) / 7)
  let target: number
  if (goalType === 'fat_loss') target = tdee - dailyDelta
  else if (goalType === 'muscle_gain') target = tdee + dailyDelta
  else target = tdee

  const floor = sex === 'male' ? 1500 : 1200
  return Math.max(target, floor)
}

export function calcMacros(
  dailyCalorieTarget: number,
  weightKg: number,
  goalType: GoalType,
): { protein: number; carbs: number; fat: number } {
  const proteinMultiplier =
    goalType === 'fat_loss' ? 2.2 : goalType === 'muscle_gain' ? 2.0 : 1.6
  const protein = Math.round(weightKg * proteinMultiplier)
  const fat = Math.round((dailyCalorieTarget * 0.2) / 9)
  const carbCalories = dailyCalorieTarget - protein * 4 - fat * 9
  const carbs = Math.max(0, Math.round(carbCalories / 4))
  return { protein, carbs, fat }
}

export function buildProfile(params: {
  userName: string
  sex: 'male' | 'female'
  height: number
  currentWeight: number
  targetWeight: number
  age: number
  activityLevel: ActivityLevel
  goalType: GoalType
  weeklyGoalKg: 0.25 | 0.5 | 0.75 | 1.0
}): UserProfile {
  const bmr = calcBMR(params.sex, params.currentWeight, params.height, params.age)
  const tdee = calcTDEE(bmr, params.activityLevel)
  const dailyCalorieTarget = calcDailyTarget(tdee, params.goalType, params.weeklyGoalKg, params.sex)
  const { protein, carbs, fat } = calcMacros(dailyCalorieTarget, params.currentWeight, params.goalType)
  return {
    ...params,
    tdee,
    dailyCalorieTarget,
    proteinTarget: protein,
    carbTarget: carbs,
    fatTarget: fat,
    updatedAt: new Date().toISOString(),
  }
}

export function calcBMI(weightKg: number, heightCm: number): number {
  const h = heightCm / 100
  return Math.round((weightKg / (h * h)) * 10) / 10
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return '體重過輕'
  if (bmi < 24) return '正常範圍'
  if (bmi < 27) return '體重過重'
  if (bmi < 30) return '輕度肥胖'
  return '中重度肥胖'
}

export function estimateGoalDate(
  currentWeight: number,
  targetWeight: number,
  recentWeights: { date: string; weight: number }[],
): string | null {
  if (recentWeights.length < 2) return null
  const sorted = [...recentWeights].sort((a, b) => a.date.localeCompare(b.date))
  const recent = sorted.slice(-28) // up to 4 weeks
  if (recent.length < 2) return null
  const firstW = recent[0].weight
  const lastW = recent[recent.length - 1].weight
  const days = (new Date(recent[recent.length - 1].date).getTime() -
    new Date(recent[0].date).getTime()) / 86400000
  const ratePerDay = (lastW - firstW) / days // negative = losing
  if (Math.abs(ratePerDay) < 0.001) return null
  const diff = targetWeight - currentWeight
  if ((diff < 0 && ratePerDay >= 0) || (diff > 0 && ratePerDay <= 0)) return null
  const daysNeeded = Math.abs(diff / ratePerDay)
  const goalDate = new Date()
  goalDate.setDate(goalDate.getDate() + Math.round(daysNeeded))
  return goalDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
}
