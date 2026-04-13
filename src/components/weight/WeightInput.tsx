import { useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { todayStr } from '../../utils/dateHelpers'

export default function WeightInput() {
  const addWeight = useAppStore(s => s.addWeight)
  const weights = useAppStore(s => s.weights)
  const todayEntry = weights.find(w => w.date === todayStr())

  const [value, setValue] = useState(todayEntry?.weight?.toString() ?? '')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    const num = parseFloat(value)
    if (!num || num < 20 || num > 300) return
    addWeight({ date: todayStr(), weight: num })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="weight-input-card">
      <h3>今日體重（早晨空腹）</h3>
      <div className="weight-entry-row">
        <div className="input-unit large">
          <input
            type="number"
            value={value}
            min={20}
            max={300}
            step={0.1}
            placeholder="--.-"
            inputMode="decimal"
            onChange={e => { setValue(e.target.value); setSaved(false) }}
          />
          <span>kg</span>
        </div>
        <button className="btn-primary" onClick={handleSave}>
          {saved ? '✓ 已儲存' : '記錄'}
        </button>
      </div>
    </div>
  )
}
