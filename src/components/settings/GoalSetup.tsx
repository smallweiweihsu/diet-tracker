import { useState } from 'react'
import type { ActivityLevel, GoalType } from '../../types'
import { buildProfile } from '../../utils/calculations'
import { useAppStore } from '../../store/appStore'

const GOAL_LABELS: Record<GoalType, string> = {
  fat_loss: '🔥 減脂',
  muscle_gain: '💪 增肌',
  maintain: '⚖️ 維持',
}

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: '久坐（幾乎不運動）',
  lightly_active: '輕度活動（每週 1-3 天）',
  moderately_active: '中度活動（每週 3-5 天）',
  very_active: '高度活動（每週 6-7 天）',
  extra_active: '極度活動（體力勞動 + 運動）',
}

interface Props {
  onSaved?: () => void
}

export default function GoalSetup({ onSaved }: Props) {
  const setProfile = useAppStore(s => s.setProfile)
  const updateUserName = useAppStore(s => s.updateUserName)
  const completeSetup = useAppStore(s => s.completeSetup)
  const existing = useAppStore(s => s.profile)
  const currentUser = useAppStore(s => s.currentUser)

  const [userName, setUserName] = useState(existing?.userName ?? currentUser?.name ?? '')
  const [sex, setSex] = useState<'male' | 'female'>(existing?.sex ?? 'male')
  const [age, setAge] = useState(existing?.age ?? 25)
  const [height, setHeight] = useState(existing?.height ?? 170)
  const [weight, setWeight] = useState(existing?.currentWeight ?? 70)
  const [targetWeight, setTargetWeight] = useState(existing?.targetWeight ?? 65)
  const [goal, setGoal] = useState<GoalType>(existing?.goalType ?? 'fat_loss')
  const [activity, setActivity] = useState<ActivityLevel>(existing?.activityLevel ?? 'lightly_active')
  const [weekly, setWeekly] = useState<0.25 | 0.5 | 0.75 | 1.0>(existing?.weeklyGoalKg ?? 0.5)

  function handleSave() {
    const trimmedName = userName.trim() || (currentUser?.name ?? '')
    const profile = buildProfile({
      userName: trimmedName,
      sex, age, height,
      currentWeight: weight,
      targetWeight,
      goalType: goal,
      activityLevel: activity,
      weeklyGoalKg: weekly,
    })
    setProfile(profile)
    completeSetup()
    updateUserName(trimmedName)
    onSaved?.()
  }

  return (
    <div className="goal-setup">
      <h2>個人設定</h2>

      <div className="form-group">
        <label>姓名</label>
        <input
          type="text"
          value={userName}
          placeholder="輸入你的名字"
          maxLength={20}
          onChange={e => setUserName(e.target.value)}
          className="input-text"
        />
      </div>

      <div className="form-group">
        <label>性別</label>
        <div className="btn-group">
          {(['male', 'female'] as const).map(s => (
            <button
              key={s}
              className={`btn-option ${sex === s ? 'active' : ''}`}
              onClick={() => setSex(s)}
            >
              {s === 'male' ? '♂ 男' : '♀ 女'}
            </button>
          ))}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>年齡</label>
          <div className="input-unit">
            <input type="number" value={age} min={10} max={100}
              inputMode="numeric"
              onChange={e => setAge(Number(e.target.value))} />
            <span>歲</span>
          </div>
        </div>
        <div className="form-group">
          <label>身高</label>
          <div className="input-unit">
            <input type="number" value={height} min={100} max={250}
              inputMode="numeric"
              onChange={e => setHeight(Number(e.target.value))} />
            <span>cm</span>
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>目前體重</label>
          <div className="input-unit">
            <input type="number" value={weight} min={30} max={300} step={0.1}
              inputMode="decimal"
              onChange={e => setWeight(Number(e.target.value))} />
            <span>kg</span>
          </div>
        </div>
        <div className="form-group">
          <label>目標體重</label>
          <div className="input-unit">
            <input type="number" value={targetWeight} min={30} max={300} step={0.1}
              inputMode="decimal"
              onChange={e => setTargetWeight(Number(e.target.value))} />
            <span>kg</span>
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>目標</label>
        <div className="btn-group">
          {(Object.keys(GOAL_LABELS) as GoalType[]).map(g => (
            <button
              key={g}
              className={`btn-option ${goal === g ? 'active' : ''}`}
              onClick={() => setGoal(g)}
            >
              {GOAL_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>活動量</label>
        <select value={activity} onChange={e => setActivity(e.target.value as ActivityLevel)}>
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map(a => (
            <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>
          ))}
        </select>
      </div>

      {goal !== 'maintain' && (
        <div className="form-group">
          <label>每週目標</label>
          <div className="btn-group">
            {([0.25, 0.5, 0.75, 1.0] as const).map(w => (
              <button
                key={w}
                className={`btn-option ${weekly === w ? 'active' : ''}`}
                onClick={() => setWeekly(w)}
              >
                {w} kg/週
              </button>
            ))}
          </div>
        </div>
      )}

      <button className="btn-primary" onClick={handleSave}>
        儲存設定
      </button>
    </div>
  )
}
