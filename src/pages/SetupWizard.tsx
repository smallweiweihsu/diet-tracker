import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { getUserList, setUserList, setActiveUserId } from '../utils/storage'
import GoalSetup from '../components/settings/GoalSetup'
import FastingSetup from '../components/settings/FastingSetup'

const AVATAR_COLORS = [
  '#34c759', '#007aff', '#ff9500', '#ff3b30',
  '#af52de', '#ff2d55', '#5ac8fa', '#ffcc00',
]

export default function SetupWizard() {
  const addUser = useAppStore(s => s.addUser)
  const switchUser = useAppStore(s => s.switchUser)
  const [step, setStep] = useState<'name' | 'profile' | 'done'>('name')
  const [name, setName] = useState('')
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0])

  function handleNameNext() {
    if (!name.trim()) return
    // Create the user in storage
    const userId = crypto.randomUUID()
    const user = { id: userId, name: name.trim(), avatarColor }
    const users = [...getUserList(), user]
    setUserList(users)
    setActiveUserId(userId)
    addUser(user)
    switchUser(userId)
    setStep('profile')
  }

  if (step === 'name') {
    return (
      <div className="setup-page">
        <div className="setup-header">
          <div className="setup-logo">🍽️</div>
          <h1>歡迎使用 DietTrack</h1>
          <p className="subtitle">先建立你的個人檔案</p>
        </div>

        <div className="setup-card">
          <div className="form-group">
            <label>你的名字</label>
            <input
              type="text"
              className="input-text"
              value={name}
              placeholder="輸入名字"
              maxLength={20}
              autoFocus
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNameNext()}
            />
          </div>

          <div className="form-group">
            <label>頭像顏色</label>
            <div className="avatar-color-picker">
              {AVATAR_COLORS.map(c => (
                <button
                  key={c}
                  className={`avatar-color-swatch ${avatarColor === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setAvatarColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
            <div className="avatar-preview">
              <div className="avatar-circle" style={{ background: avatarColor }}>
                {name ? name[0].toUpperCase() : '?'}
              </div>
            </div>
          </div>

          <button
            className="btn-primary"
            disabled={!name.trim()}
            onClick={handleNameNext}
          >
            下一步
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="setup-page">
      <div className="setup-header">
        <h1>設定目標</h1>
        <p className="subtitle">讓 App 幫你計算每日所需熱量</p>
      </div>
      <div className="setup-card">
        <GoalSetup onSaved={() => setStep('done')} />
        <div style={{ marginTop: 16 }}>
          <FastingSetup />
        </div>
      </div>
    </div>
  )
}
