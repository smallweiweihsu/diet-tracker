import { useState, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import { todayStr, formatDate } from '../../utils/dateHelpers'

interface Props {
  selectedDate: string
}

export default function WeightInput({ selectedDate }: Props) {
  const addWeight = useAppStore(s => s.addWeight)
  const weights = useAppStore(s => s.weights)

  const entry = weights.find(w => w.date === selectedDate)
  const [value, setValue] = useState(entry?.weight?.toString() ?? '')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const e = weights.find(w => w.date === selectedDate)
    setValue(e?.weight?.toString() ?? '')
    setSaved(false)
  }, [selectedDate, weights])

  function handleSave() {
    const num = parseFloat(value)
    if (!num || num < 20 || num > 300) return
    addWeight({ date: selectedDate, weight: num })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const isToday = selectedDate === todayStr()

  return (
    <div className="card weight-input-card">
      <h3>{isToday ? '今日體重（早晨空腹）' : `${formatDate(selectedDate)} 體重`}</h3>
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
