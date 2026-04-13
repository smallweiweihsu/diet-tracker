import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { formatDate, formatMonth } from '../utils/dateHelpers'
import type { DayLog, MealType } from '../types'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snacks: '點心',
}

function DayRow({ log }: { log: DayLog }) {
  const [open, setOpen] = useState(false)
  const profile = useAppStore(s => s.profile)
  const target = profile?.dailyCalorieTarget ?? 0
  const color = log.isWithinTarget ? 'var(--color-success)' : 'var(--color-danger)'

  const meals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks']

  return (
    <div className="history-row">
      <button className="history-row-header" onClick={() => setOpen(o => !o)}>
        <span className="history-date">{formatDate(log.date)}</span>
        <div className="history-summary">
          <span style={{ color }}>
            {log.netCalories} kcal
          </span>
          <span className="history-target">/ {target} kcal</span>
          {log.exerciseCalories > 0 && (
            <span className="history-exercise">🏃 -{log.exerciseCalories}</span>
          )}
        </div>
        <span className="history-chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="history-detail">
          {meals.map(m => {
            const entries = log.meals[m]
            if (entries.length === 0) return null
            const mealTotal = entries.reduce((s, e) => s + e.calories, 0)
            return (
              <div key={m} className="history-meal">
                <div className="history-meal-header">
                  <span>{MEAL_LABELS[m]}</span>
                  <span>{mealTotal} kcal</span>
                </div>
                {entries.map(e => (
                  <div key={e.id} className="history-food">
                    <span>{e.name}</span>
                    <span>{e.calories} kcal</span>
                  </div>
                ))}
              </div>
            )
          })}
          <div className="history-macro-row">
            <span>P {Math.round(log.totalProtein)}g</span>
            <span>C {Math.round(log.totalCarbs)}g</span>
            <span>F {Math.round(log.totalFat)}g</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HistoryPage() {
  const days = useAppStore(s => s.days)

  const sorted = Object.values(days)
    .filter(d => d.totalCalories > 0 || d.exerciseCalories > 0)
    .sort((a, b) => b.date.localeCompare(a.date))

  // Group by month
  const groups: Record<string, DayLog[]> = {}
  sorted.forEach(d => {
    const month = d.date.slice(0, 7)
    if (!groups[month]) groups[month] = []
    groups[month].push(d)
  })

  return (
    <div className="page history-page">
      <h1>歷史記錄</h1>

      {sorted.length === 0 ? (
        <p className="empty-state">尚無記錄，開始記錄今日飲食吧！</p>
      ) : (
        Object.entries(groups).sort(([a], [b]) => b.localeCompare(a)).map(([month, logs]) => (
          <div key={month} className="history-month">
            <h3 className="history-month-label">{formatMonth(month + '-01')}</h3>
            {logs.map(log => <DayRow key={log.date} log={log} />)}
          </div>
        ))
      )}
    </div>
  )
}
