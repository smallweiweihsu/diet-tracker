import { useAppStore } from '../../store/appStore'

interface Props {
  date: string
  waterMl: number
}

const WATER_GOAL = 2000
const QUICK_AMOUNTS = [250, 500, 750, 1000]

export default function WaterTracker({ date, waterMl }: Props) {
  const setWater = useAppStore(s => s.setWater)

  function add(ml: number) {
    setWater(Math.min(waterMl + ml, 9999), date)
  }

  function handleCustom(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseInt(e.target.value)
    if (!isNaN(v) && v >= 0) setWater(v, date)
  }

  const pct = Math.min((waterMl / WATER_GOAL) * 100, 100)
  const color = waterMl >= WATER_GOAL ? '#34c759' : '#5ac8fa'

  return (
    <div className="card water-tracker">
      <div className="water-header">
        <span className="water-title">💧 飲水記錄</span>
        <span className="water-value" style={{ color }}>
          {waterMl} <span className="water-goal">/ {WATER_GOAL} ml</span>
        </span>
      </div>

      <div className="water-bar-track">
        <div className="water-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>

      <div className="water-quick-btns">
        {QUICK_AMOUNTS.map(ml => (
          <button key={ml} className="water-btn" onClick={() => add(ml)}>
            +{ml}
          </button>
        ))}
        <input
          type="number"
          className="water-custom-input"
          placeholder="自訂"
          value={waterMl || ''}
          min={0}
          inputMode="numeric"
          onChange={handleCustom}
        />
      </div>
    </div>
  )
}
