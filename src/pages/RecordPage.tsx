import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { todayStr, formatDate } from '../utils/dateHelpers'
import WeekCalendar from '../components/record/WeekCalendar'
import CalorieSummaryRing from '../components/today/CalorieSummaryRing'
import MacroProgressBars from '../components/today/MacroProgressBars'
import FastingIndicator from '../components/today/FastingIndicator'
import MealSection from '../components/today/MealSection'
import WaterTracker from '../components/today/WaterTracker'
import DailyNotes from '../components/today/DailyNotes'
import type { MealType } from '../types'

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks']

type Tab = 'food' | 'body'

function formatJournalDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const month = d.toLocaleString('en-US', { month: 'long' })
  const day = d.getDate()
  const weekday = d.toLocaleString('en-US', { weekday: 'short' })
  const suffix = day === 1 || day === 21 || day === 31 ? 'st'
    : day === 2 || day === 22 ? 'nd'
    : day === 3 || day === 23 ? 'rd' : 'th'
  return `${month} ${day}${suffix}, ${weekday}.`
}

export default function RecordPage() {
  const profile = useAppStore(s => s.profile)
  const days = useAppStore(s => s.days)
  const setExercise = useAppStore(s => s.setExercise)
  const getDayLog = useAppStore(s => s.getDayLog)

  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [tab, setTab] = useState<Tab>('food')

  const log = getDayLog(selectedDate)
  const target = profile?.dailyCalorieTarget ?? 0
  const isToday = selectedDate === todayStr()

  // Dates with food entries for dots on calendar
  const markedDates = useMemo(() => {
    return new Set(
      Object.entries(days)
        .filter(([, d]) => Object.values(d.meals).some(m => m.length > 0))
        .map(([date]) => date)
    )
  }, [days])

  return (
    <div className="page record-page">
      {/* Linen Journal 頁首 */}
      <div className="journal-top">
        <div className="journal-top-l">
          <div className="journal-volume">Journal · {selectedDate.slice(0, 7)}</div>
          <div className="journal-date">{formatJournalDate(selectedDate)}</div>
        </div>
        <div className="journal-bookmark" aria-hidden="true" />
      </div>
      <div className="journal-title-wrap">
        <h2 className="journal-title">today's <em>little</em><br /><span className="journal-hand">plate notes</span></h2>
        <div className="journal-sub">— what I ate, what I didn't skip —</div>
      </div>

      {/* Week Calendar */}
      <WeekCalendar
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        markedDates={markedDates}
      />

      {/* Date label + back to today */}
      <div className="record-date-bar">
        <span className="record-date-label">
          {isToday ? '今天' : formatDate(selectedDate)}
        </span>
        {!isToday && (
          <button className="btn-back-today" onClick={() => setSelectedDate(todayStr())}>
            回到今天
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="tab-switcher">
        <button
          className={`tab-btn ${tab === 'food' ? 'active' : ''}`}
          onClick={() => setTab('food')}
        >
          飲食
        </button>
        <button
          className={`tab-btn ${tab === 'body' ? 'active' : ''}`}
          onClick={() => setTab('body')}
        >
          身體 &amp; 運動
        </button>
      </div>

      {tab === 'food' ? (
        <div className="tab-content">
          {/* Calorie summary */}
          <div className="card calorie-card">
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
          </div>

          <FastingIndicator />

          {/* Notes */}
          <DailyNotes date={selectedDate} notes={log.notes} />

          {/* Meal sections */}
          <div className="meals-header">
            <span className="meals-title-jp">meals today</span>
            <span className="meals-title-en">— in four acts</span>
          </div>
          <div className="meals">
            {MEAL_ORDER.map(meal => (
              <MealSection
                key={meal}
                meal={meal}
                entries={log.meals[meal]}
                date={selectedDate}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="tab-content">
          {/* Exercise */}
          <div className="card exercise-card">
            <div className="exercise-row">
              <label>🏃 運動消耗</label>
              <div className="input-unit">
                <input
                  type="number"
                  value={log.exerciseCalories || ''}
                  min={0}
                  placeholder="0"
                  inputMode="numeric"
                  onChange={e => setExercise(Number(e.target.value) || 0, selectedDate)}
                />
                <span>kcal</span>
              </div>
            </div>
          </div>

          {/* Water */}
          <WaterTracker date={selectedDate} waterMl={log.waterMl} />

          {/* Quick add grid */}
          <div className="quick-add-grid">
            <button className="quick-add-card" onClick={() => setTab('food')}>
              <span className="quick-add-icon">🍽️</span>
              <span>記錄飲食</span>
            </button>
            <button className="quick-add-card" onClick={() => setTab('body')}>
              <span className="quick-add-icon">🏃</span>
              <span>記錄運動</span>
            </button>
            <button className="quick-add-card" onClick={() => setTab('body')}>
              <span className="quick-add-icon">💧</span>
              <span>記錄飲水</span>
            </button>
            <Link className="quick-add-card" to="/weight">
              <span className="quick-add-icon">⚖️</span>
              <span>記錄體重</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
