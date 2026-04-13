import { useMemo, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { todayStr, lastNDays } from '../utils/dateHelpers'
import CalorieTrendChart from '../components/stats/CalorieTrendChart'
import MacroPieChart from '../components/stats/MacroPieChart'

type Period = 7 | 30 | 90 | 365
const PERIOD_LABELS: Record<Period, string> = { 7: '7天', 30: '一個月', 90: '3個月', 365: '一年' }

export default function StatsPage() {
  const profile = useAppStore(s => s.profile)
  const days = useAppStore(s => s.days)
  const [period, setPeriod] = useState<Period>(30)

  const todayLog = days[todayStr()]
  const target = profile?.dailyCalorieTarget ?? 0

  // Achievement rate for selected period
  const weekStats = useMemo(() => {
    const last7 = lastNDays(Math.min(period, 7))
    const withData = last7.filter(d => days[d] && Object.values(days[d].meals).some(m => m.length > 0))
    const withinTarget = withData.filter(d => days[d].isWithinTarget)
    return {
      logged: withData.length,
      achieved: withinTarget.length,
      rate: withData.length > 0 ? Math.round((withinTarget.length / withData.length) * 100) : 0,
    }
  }, [days, period])

  return (
    <div className="page stats-page">
      <div className="page-header">
        <h1>統計</h1>
      </div>

      {/* Period selector */}
      <div className="period-selector">
        {([7, 30, 90, 365] as Period[]).map(p => (
          <button
            key={p}
            className={`period-btn ${period === p ? 'active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="stats-summary-row">
        <div className="card stat-card">
          <span className="stat-num">{weekStats.logged}</span>
          <span className="stat-label">本週記錄天數</span>
        </div>
        <div className="card stat-card">
          <span className="stat-num" style={{ color: weekStats.rate >= 70 ? '#34c759' : '#ff9500' }}>
            {weekStats.rate}%
          </span>
          <span className="stat-label">本週達標率</span>
        </div>
        <div className="card stat-card">
          <span className="stat-num">{target}</span>
          <span className="stat-label">每日目標 kcal</span>
        </div>
      </div>

      {/* Calorie trend */}
      <div className="card">
        <CalorieTrendChart days={days} target={target} range={period} />
      </div>

      {/* Today's macro pie */}
      <div className="card">
        <MacroPieChart
          protein={todayLog?.totalProtein ?? 0}
          carbs={todayLog?.totalCarbs ?? 0}
          fat={todayLog?.totalFat ?? 0}
          totalCalories={todayLog?.totalCalories ?? 0}
        />
      </div>

      {/* Nutrition summary for selected period */}
      <div className="card nutrient-summary">
        <h3>{PERIOD_LABELS[period]}平均（有記錄日）</h3>
        {weekStats.logged > 0 ? (() => {
          const last7 = lastNDays(period)
          const logged = last7.filter(d => days[d] && Object.values(days[d].meals).some(m => m.length > 0))
          const avg = (field: string) => {
            const sum = logged.reduce((s, d) => s + ((days[d] as unknown as Record<string, number>)[field] ?? 0), 0)
            return Math.round(sum / logged.length)
          }
          return (
            <div className="nutrient-grid">
              <div className="nutrient-item">
                <span className="nutrient-val">{avg('totalCalories')}</span>
                <span className="nutrient-name">kcal</span>
              </div>
              <div className="nutrient-item">
                <span className="nutrient-val">{avg('totalProtein')}g</span>
                <span className="nutrient-name">蛋白質</span>
              </div>
              <div className="nutrient-item">
                <span className="nutrient-val">{avg('totalCarbs')}g</span>
                <span className="nutrient-name">碳水</span>
              </div>
              <div className="nutrient-item">
                <span className="nutrient-val">{avg('totalFat')}g</span>
                <span className="nutrient-name">脂肪</span>
              </div>
              <div className="nutrient-item">
                <span className="nutrient-val">{avg('waterMl')}ml</span>
                <span className="nutrient-name">飲水</span>
              </div>
              <div className="nutrient-item">
                <span className="nutrient-val">{avg('totalFiber')}g</span>
                <span className="nutrient-name">膳食纖維</span>
              </div>
            </div>
          )
        })() : <p className="empty-chart">本週尚無記錄</p>}
      </div>
    </div>
  )
}
