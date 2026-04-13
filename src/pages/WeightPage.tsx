import WeightInput from '../components/weight/WeightInput'
import WeightChart from '../components/weight/WeightChart'
import { useAppStore } from '../store/appStore'

export default function WeightPage() {
  const profile = useAppStore(s => s.profile)
  const weights = useAppStore(s => s.weights)
  const removeWeight = useAppStore(s => s.removeWeight)

  const recent = [...weights].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7)

  return (
    <div className="page weight-page">
      <h1>體重記錄</h1>
      {profile && (
        <div className="weight-targets">
          <span>目前目標：<b>{profile.targetWeight} kg</b></span>
          {weights.length > 0 && (
            <span>最新：<b>{weights[weights.length - 1].weight} kg</b></span>
          )}
        </div>
      )}

      <WeightInput />
      <WeightChart />

      {recent.length > 0 && (
        <div className="weight-list">
          <h3>最近記錄</h3>
          {recent.map(w => (
            <div key={w.date} className="weight-row">
              <span>{w.date}</span>
              <span className="weight-val">{w.weight} kg</span>
              <button className="btn-icon danger" onClick={() => removeWeight(w.date)}>🗑</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
