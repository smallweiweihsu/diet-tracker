import GoalSetup from '../components/settings/GoalSetup'
import FastingSetup from '../components/settings/FastingSetup'
import { exportData, importData } from '../utils/storage'
import { useRef } from 'react'

export default function SettingsPage() {
  const fileRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    const json = exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diet-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const ok = importData(ev.target?.result as string)
      if (ok) {
        alert('匯入成功，即將重新整理')
        window.location.reload()
      } else {
        alert('匯入失敗，請確認檔案格式')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="page settings-page">
      <h1>設定</h1>
      <GoalSetup />
      <div className="divider" />
      <h2>斷食設定</h2>
      <FastingSetup />
      <div className="divider" />
      <h2>資料管理</h2>
      <div className="data-actions">
        <button className="btn-secondary" onClick={handleExport}>
          📤 匯出資料（JSON）
        </button>
        <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
          📥 匯入資料
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleImport}
        />
      </div>
    </div>
  )
}
