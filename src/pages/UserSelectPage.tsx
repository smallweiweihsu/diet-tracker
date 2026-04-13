import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { setActiveUserId } from '../utils/storage'
import SetupWizard from './SetupWizard'

export default function UserSelectPage() {
  const users = useAppStore(s => s.users)
  const switchUser = useAppStore(s => s.switchUser)
  const [showWizard, setShowWizard] = useState(false)

  if (showWizard) {
    return <SetupWizard />
  }

  function handleSelect(userId: string) {
    setActiveUserId(userId)
    switchUser(userId)
  }

  return (
    <div className="user-select-page">
      <div className="user-select-header">
        <div className="setup-logo">🍽️</div>
        <h1>選擇使用者</h1>
        <p className="subtitle">點選你的個人檔案</p>
      </div>

      <div className="user-list">
        {users.map(user => (
          <button
            key={user.id}
            className="user-select-item"
            onClick={() => handleSelect(user.id)}
          >
            <div className="avatar-circle large" style={{ background: user.avatarColor }}>
              {user.name[0]?.toUpperCase() ?? '?'}
            </div>
            <span className="user-select-name">{user.name}</span>
          </button>
        ))}
      </div>

      <button className="btn-add-user" onClick={() => setShowWizard(true)}>
        + 新增使用者
      </button>
    </div>
  )
}
