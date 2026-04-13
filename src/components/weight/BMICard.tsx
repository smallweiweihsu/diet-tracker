import { calcBMI, bmiCategory, estimateGoalDate } from '../../utils/calculations'
import type { WeightEntry, UserProfile } from '../../types'

interface Props {
  profile: UserProfile
  weights: WeightEntry[]
  streak: number
}

export default function BMICard({ profile, weights, streak }: Props) {
  const latestWeight = weights.length > 0
    ? weights[weights.length - 1].weight
    : profile.currentWeight

  const bmi = calcBMI(latestWeight, profile.height)
  const category = bmiCategory(bmi)
  const goalDate = estimateGoalDate(latestWeight, profile.targetWeight, weights)

  const bmiColor =
    bmi < 18.5 ? '#5ac8fa' :
    bmi < 24 ? '#34c759' :
    bmi < 27 ? '#ff9500' : '#ff3b30'

  const progress = Math.min(
    Math.max((latestWeight - profile.targetWeight) / (profile.currentWeight - profile.targetWeight + 0.001), 0),
    1
  )
  const progressPct = Math.round((1 - progress) * 100)

  return (
    <div className="card bmi-card">
      <div className="bmi-header">
        <div>
          <span className="bmi-value" style={{ color: bmiColor }}>{bmi}</span>
          <span className="bmi-unit"> BMI</span>
        </div>
        <span className="bmi-category" style={{ color: bmiColor }}>{category}</span>
        {streak > 0 && (
          <span className="streak-badge">🔥 {streak} 天連續</span>
        )}
      </div>

      <div className="bmi-weight-row">
        <div className="bmi-weight-item">
          <span className="bmi-w-val">{latestWeight} kg</span>
          <span className="bmi-w-label">目前體重</span>
        </div>
        <div className="bmi-arrow">→</div>
        <div className="bmi-weight-item">
          <span className="bmi-w-val">{profile.targetWeight} kg</span>
          <span className="bmi-w-label">目標體重</span>
        </div>
      </div>

      {/* Progress to goal */}
      <div className="goal-progress-wrap">
        <div className="goal-progress-bar-track">
          <div
            className="goal-progress-bar-fill"
            style={{ width: `${progressPct}%`, background: '#34c759' }}
          />
        </div>
        <span className="goal-progress-pct">{progressPct}%</span>
      </div>

      {goalDate && (
        <p className="goal-date-estimate">📅 預計達標日：{goalDate}</p>
      )}
    </div>
  )
}
