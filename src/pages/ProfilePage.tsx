import { useState, useRef } from 'react'
import { useAppStore, computeStreak } from '../store/appStore'
import { exportUserData, importUserData, setActiveUserId } from '../utils/storage'
import { calcBMI } from '../utils/calculations'
import GoalSetup from '../components/settings/GoalSetup'
import FastingSetup from '../components/settings/FastingSetup'
import MealTemplateManager from '../components/today/MealTemplateManager'

const LAST_BACKUP_KEY = 'dt:lastBackup'

// Session-level cache: remember the file handle within same session
let _sessionFileHandle: FileSystemFileHandle | null = null

async function smartExport(json: string, filename: string): Promise<boolean> {
  // Tier 1: File System Access API (iOS 17+ / Chrome / Edge)
  if ('showSaveFilePicker' in window) {
    try {
      // Re-use existing session handle if valid
      let handle = _sessionFileHandle
      if (handle) {
        try {
          const perm = await (handle as unknown as { queryPermission: (opts: object) => Promise<string> }).queryPermission({ mode: 'readwrite' })
          if (perm !== 'granted') handle = null
        } catch { handle = null }
      }
      if (!handle) {
        handle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'JSON 備份', accept: { 'application/json': ['.json'] } }],
        })
        _sessionFileHandle = handle
      }
      const writable = await handle.createWritable()
      await writable.write(json)
      await writable.close()
      return true
    } catch (e: unknown) {
      // User cancelled picker
      if ((e as Error)?.name === 'AbortError') return false
      // Permission error or other — fall through
      _sessionFileHandle = null
    }
  }

  // Tier 2: Web Share API with file (iOS 15-16 / Safari)
  const file = new File([json], filename, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: '飲食記錄備份' })
      return true
    } catch (e: unknown) {
      if ((e as Error)?.name === 'AbortError') return false
    }
  }

  // Tier 3: Direct download (all browsers)
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return true
}

const AVATAR_EMOJIS = ['😊','💪','🌟','🔥','🌈','🎯','🍎','🏃','🧘','😎','🦋','🌸']

export default function ProfilePage() {
  const currentUser = useAppStore(s => s.currentUser)
  const profile = useAppStore(s => s.profile)
  const weights = useAppStore(s => s.weights)
  const days = useAppStore(s => s.days)
  const updateUserAvatar = useAppStore(s => s.updateUserAvatar)
  const [section, setSection] = useState<'main' | 'profile' | 'fasting' | 'templates'>('main')
  const [lastBackup, setLastBackup] = useState(localStorage.getItem(LAST_BACKUP_KEY) ?? '')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const streak = computeStreak(days)

  const latestWeight = weights.length > 0 ? weights[weights.length - 1].weight : profile?.currentWeight ?? 0
  const bmi = profile ? calcBMI(latestWeight, profile.height) : null

  async function handleExport() {
    if (!currentUser) return
    const json = exportUserData(currentUser.id)
    const now = new Date()
    const datePart = now.toISOString().slice(0, 10)
    const timePart = now.toTimeString().slice(0, 5)  // "HH:MM"
    const timestamp = `${datePart} ${timePart}`
    const filename = `diet-backup-${currentUser.name}-${datePart}.json`
    const ok = await smartExport(json, filename)
    if (ok) {
      localStorage.setItem(LAST_BACKUP_KEY, timestamp)
      setLastBackup(timestamp)
    }
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

      {/* Emoji picker sheet */}
      {showEmojiPicker && (
        <div className="bottom-sheet-overlay" onClick={() => setShowEmojiPicker(false)}>
          <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
            <p className="bottom-sheet-title">選擇頭像 Emoji</p>
            <div className="emoji-picker">
              {AVATAR_EMOJIS.map(e => (
                <button
                  key={e}
                  className={`emoji-option ${currentUser?.avatarEmoji === e ? 'selected' : ''}`}
                  onClick={() => { updateUserAvatar(e); setShowEmojiPicker(false) }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* User card */}
      <div className="card profile-card">
        <div className="profile-avatar-row">
          <button
            className="avatar-circle large"
            style={{ background: currentUser?.avatarColor ?? '#34c759' }}
            onClick={() => setShowEmojiPicker(true)}
            aria-label="更改頭像"
          >
            {currentUser?.avatarEmoji ?? currentUser?.name?.[0]?.toUpperCase() ?? '?'}
          </button>
          <div className="profile-name-block">
            <span className="profile-name">{currentUser?.name ?? '使用者'}</span>
            {streak > 0 && <span className="streak-badge">🔥 {streak} 天連續記錄</span>}
            <span className="avatar-hint">點頭像可更換</span>
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
          <div className="settings-row-label-stack">
            <span className="settings-row-label">匯出資料備份</span>
            {lastBackup && <span className="settings-row-sub">上次備份：{lastBackup}</span>}
          </div>
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
