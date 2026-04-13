import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store/appStore'
import BottomNav from './components/layout/BottomNav'
import RecordPage from './pages/RecordPage'
import StatsPage from './pages/StatsPage'
import WeightPage from './pages/WeightPage'
import ProfilePage from './pages/ProfilePage'
import UserSelectPage from './pages/UserSelectPage'
import SetupWizard from './pages/SetupWizard'
import './index.css'

export default function App() {
  const initStore = useAppStore(s => s.initStore)
  const users = useAppStore(s => s.users)
  const currentUser = useAppStore(s => s.currentUser)
  const setupComplete = useAppStore(s => s.settings.setupComplete)

  useEffect(() => {
    initStore()
  }, [initStore])

  // No users at all → first-time setup wizard
  if (users.length === 0) {
    return <SetupWizard />
  }

  // Users exist but none selected → user select screen
  if (!currentUser) {
    return <UserSelectPage />
  }

  // User selected but hasn't completed setup
  if (!setupComplete) {
    return <SetupWizard />
  }

  return (
    <div className="app-shell">
      <div className="app-content">
        <Routes>
          <Route path="/record" element={<RecordPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/weight" element={<WeightPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/record" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  )
}
