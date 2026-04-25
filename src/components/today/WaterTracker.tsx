import { useAppStore } from '../../store/appStore'

interface Props {
  date: string
  waterMl: number
}

const WATER_GOAL = 2000
const QUICK_AMOUNTS = [250, 500, 750, 1000]
const DROP_UNIT = 250

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
  const fillColor = waterMl >= WATER_GOAL ? 'var(--leaf-deep)' : 'var(--thread)'

  return (
    <div className="card water-tracker">
      <div className="water-header">
        <span className="water-title">water glasses</span>
        <span className="water-value">
          {waterMl} <span className="water-goal">/ {WATER_GOAL} ml</span>
        </span>
      </div>

      <div className="water-drops-row">
        {Array.from({ length: 8 }).map((_, i) => {
          const filled = waterMl >= (i + 1) * DROP_UNIT
          return (
            <div key={i} className={`drop${filled ? ' on' : ''}`}>
              <svg viewBox="0 0 64 64" aria-hidden="true">
                <path className="drop-body" d="M 32 10 C 32 24, 48 30, 48 42 A 16 16 0 0 1 16 42 C 16 30, 32 24, 32 10 Z"/>
                <path className="drop-fill" d="M 16 42 A 16 16 0 0 0 48 42 C 48 38, 40 38, 32 38 C 24 38, 16 38, 16 42 Z"/>
                <path className="drop-shine" d="M 26 20 Q 22 26, 22 32" strokeLinecap="round"/>
              </svg>
            </div>
          )
        })}
      </div>

      <div className="water-bar-track">
        <div className="water-bar-fill" style={{ width: `${pct}%`, background: fillColor }} />
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
