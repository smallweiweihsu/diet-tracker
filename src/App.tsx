import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store/appStore'
import BottomNav from './components/layout/BottomNav'
import TodayPage from './pages/TodayPage'
import WeightPage from './pages/WeightPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import './index.css'

export default function App() {
  const setupComplete = useAppStore(s => s.settings.setupComplete)

  if (!setupComplete) {
    return (
      <div className="setup-page">
        <h1>歡迎使用 DietTrack</h1>
        <p className="subtitle">先設定你的個人資料，讓 App 幫你計算每日所需熱量</p>
        <SettingsPage />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="app-content">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/weight" element={<WeightPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  )
}
