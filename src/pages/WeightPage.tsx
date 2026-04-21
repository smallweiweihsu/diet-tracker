import { useState, useMemo } from 'react'
import { useAppStore } from '../store/appStore'
import { todayStr } from '../utils/dateHelpers'
import { computeStreak } from '../store/appStore'
import WeekCalendar from '../components/record/WeekCalendar'
import WeightInput from '../components/weight/WeightInput'
import WeightChart from '../components/weight/WeightChart'
import BMICard from '../components/weight/BMICard'
import MeasurementsSection from '../components/weight/MeasurementsSection'

export default function WeightPage() {
  const profile = useAppStore(s => s.profile)
  const weights = useAppStore(s => s.weights)
  const days = useAppStore(s => s.days)
  const removeWeight = useAppStore(s => s.removeWeight)

  const [selectedDate, setSelectedDate] = useState(todayStr())
  const streak = computeStreak(days)

  // Dates that have weight entries — show as dots on calendar
  const weightDates = useMemo(
    () => new Set(weights.map(w => w.date)),
    [weights]
  )

  return (
    <div className="page weight-page">
      <div className="page-header">
        <h1>體重</h1>
      </div>

      {/* Week Calendar — like the Record page */}
      <WeekCalendar
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        markedDates={weightDates}
      />

      <WeightInput selectedDate={selectedDate} />

      {profile && weights.length > 0 && (
        <BMICard profile={profile} weights={weights} streak={streak} />
      )}

      <div className="card">
        <WeightChart />
      </div>

      {weights.length > 0 && (
        <div className="card weight-history">
          <h3>最近記錄</h3>
          <div className="weight-list">
            {[...weights].reverse().slice(0, 10).map(w => (
              <div key={w.date} className="weight-list-item">
                <span className="weight-date">{w.date}</span>
                <span className="weight-val">{w.weight} kg</span>
                <button
                  className="btn-icon danger"
                  onClick={() => removeWeight(w.date)}
                  aria-label="刪除"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <MeasurementsSection />
    </div>
  )
}
