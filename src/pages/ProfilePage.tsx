import { useState, useRef } from 'react'
import { useAppStore, computeStreak } from '../store/appStore'
import { exportUserData, importUserData, setActiveUserId } from '../utils/storage'
import { calcBMI } from '../utils/calculations'
import GoalSetup from '../components/settings/GoalSetup'
import FastingSetup from '../components/settings/FastingSetup'
import MealTemplateManager from '../components/today/MealTemplateManager'

export default function ProfilePage() {
  const currentUser = useAppStore(s => s.currentUser)
  const profile = useAppStore(s => s.profile)
  const weights = useAppStore(s => s.weights)
  const days = useAppStore(s => s.days)
  const [section, setSection] = useState<'main' | 'profile' | 'fasting' | 'templates'>('main')
  const fileRef = useRef<HTMLInputElement>(null)
  const streak = computeStreak(days)

  const latestWeight = weights.length > 0 ? weights[weights.length - 1].weight : profile?.currentWeight ?? 0
  const bmi = profile ? calcBMI(latestWeight, profile.height) : null

  function handleExport() {
    if (!currentUser) return
    const json = exportUserData(currentUser.id)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diet-backup-${currentUser.name}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !currentUser) return
    const reader = new FileReader()
    reader.onload = ev => {
      const ok = importUserData(currentUser.id, ev.target?.result as string)
      if (ok) {
        alert('匯入成功，即將重新整理')
        window.location.reload()
      } else {
        alert('匯入失敗，請確認檔案格式')
      }
    }
    reader.readAsText(file)
  }

  function handleSwitchUser() {
    setActiveUserId(null)
    window.location.reload()
  }

  if (section === 'profile') {
    return (
      <div className="page profile-page">
        <div className="page-header">
          <button className="btn-back" onClick={() => setSection('main')}>← 返回</button>
          <h1>帳號設定</h1>
        </div>
        <div className="card">
          <GoalSetup onSaved={() => setSection('main')} />
        </div>
      </div>
    )
  }

  if (section === 'fasting') {
    return (
      <div className="page profile-page">
        <div className="page-header">
          <button className="btn-back" onClick={() => setSection('main')}>← 返回</button>
          <h1>斷食設定</h1>
        </div>
        <div className="card">
          <FastingSetup />
        </div>
      </div>
    )
  }

  if (section === 'templates') {
    return (
      <div className="page profile-page">
        <div className="page-header">
          <button className="btn-back" onClick={() => setSection('main')}>← 返回</button>
          <h1>餐點範本</h1>
        </div>
        <MealTemplateManager />
      </div>
    )
  }

  return (
    <div className="page profile-page">
      <div className="page-header">
        <h1>我的</h1>
      </div>

      {/* User card */}
      <div className="card profile-card">
        <div className="profile-avatar-row">
          <div className="avatar-circle large" style={{ background: currentUser?.avatarColor ?? '#34c759' }}>
            {currentUser?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="profile-name-block">
            <span className="profile-name">{currentUser?.name ?? '使用者'}</span>
            {streak > 0 && <span className="streak-badge">🔥 {streak} 天連續記錄</span>}
          </div>
        </div>

        <div className="profile-stats-row">
          {latestWeight > 0 && (
            <div className="profile-stat">
              <span className="profile-stat-val">{latestWeight} kg</span>
              <span className="profile-stat-label">目前體重</span>
            </div>
          )}
          {profile && (
            <div className="profile-stat">
              <span className="profile-stat-val">{profile.targetWeight} kg</span>
              <span className="profile-stat-label">目標體重</span>
            </div>
          )}
          {bmi && (
            <div className="profile-stat">
              <span className="profile-stat-val">{bmi}</span>
              <span className="profile-stat-label">BMI</span>
            </div>
          )}
          <div className="profile-stat">
            <span className="profile-stat-val">{profile?.dailyCalorieTarget ?? '--'}</span>
            <span className="profile-stat-label">目標 kcal</span>
          </div>
        </div>
      </div>

      {/* Settings list */}
      <div className="card settings-list">
        <button className="settings-row" onClick={() => setSection('profile')}>
          <span className="settings-row-icon">👤</span>
          <span className="settings-row-label">帳號設定</span>
          <span className="settings-row-arrow">›</span>
        </button>
        <button className="settings-row" onClick={() => setSection('fasting')}>
          <span className="settings-row-icon">🌙</span>
          <span className="settings-row-label">斷食設定</span>
          <span className="settings-row-arrow">›</span>
        </button>
        <button className="settings-row" onClick={() => setSection('templates')}>
          <span className="settings-row-icon">📋</span>
          <span className="settings-row-label">餐點範本管理</span>
          <span className="settings-row-arrow">›</span>
        </button>
      </div>

      {/* Data management */}
      <div className="card settings-list">
        <button className="settings-row" onClick={handleExport}>
          <span className="settings-row-icon">📤</span>
          <span className="settings-row-label">匯出資料（JSON）</span>
          <span className="settings-row-arrow">›</span>
        </button>
        <button className="settings-row" onClick={() => fileRef.current?.click()}>
          <span className="settings-row-icon">📥</span>
          <span className="settings-row-label">匯入資料</span>
          <span className="settings-row-arrow">›</span>
        </button>
        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
      </div>

      {/* Switch user */}
      <div className="card settings-list">
        <button className="settings-row" onClick={handleSwitchUser}>
          <span className="settings-row-icon">🔄</span>
          <span className="settings-row-label">切換使用者</span>
          <span className="settings-row-arrow">›</span>
        </button>
      </div>
    </div>
  )
}
