import { useAppStore } from '../store/appStore'
import CalorieSummaryRing from '../components/today/CalorieSummaryRing'
import MacroProgressBars from '../components/today/MacroProgressBars'
import FastingIndicator from '../components/today/FastingIndicator'
import MealSection from '../components/today/MealSection'
import { formatDate, todayStr } from '../utils/dateHelpers'
import type { MealType } from '../types'

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks']

export default function TodayPage() {
  const profile = useAppStore(s => s.profile)
  const getDayLog = useAppStore(s => s.getDayLog)
  const setExercise = useAppStore(s => s.setExercise)

  const today = todayStr()
  const log = getDayLog(today)
  const target = profile?.dailyCalorieTarget ?? 0

  return (
    <div className="page today-page">
      <div className="today-header">
        <h1>今日記錄</h1>
        <span className="today-date">{formatDate(todayStr())}</span>
      </div>

      <CalorieSummaryRing
        consumed={log.totalCalories}
        target={target}
        exercise={log.exerciseCalories}
      />

      {profile && (
        <MacroProgressBars
          protein={log.totalProtein} proteinTarget={profile.proteinTarget}
          carbs={log.totalCarbs} carbTarget={profile.carbTarget}
          fat={log.totalFat} fatTarget={profile.fatTarget}
        />
      )}

      <FastingIndicator />

      <div className="exercise-row">
        <label>🏃 今日運動消耗</label>
        <div className="input-unit">
          <input
            type="number"
            value={log.exerciseCalories || ''}
            min={0}
            placeholder="0"
            inputMode="numeric"
            onChange={e => setExercise(Number(e.target.value) || 0, today)}
          />
          <span>kcal</span>
        </div>
      </div>

      <div className="meals">
        {MEAL_ORDER.map(meal => (
          <MealSection
            key={meal}
            meal={meal}
            entries={log.meals[meal]}
            date={today}
          />
        ))}
      </div>
    </div>
  )
}
