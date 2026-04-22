interface Props {
  consumed: number
  target: number
  exercise: number
}

export default function CalorieSummaryRing({ consumed, target, exercise }: Props) {
  const net = Math.max(0, consumed - exercise)
  const pct = target > 0 ? Math.min(net / target, 1) : 0
  const over = net > target

  const SIZE = 140
  const R = 56
  const cx = SIZE / 2
  const cy = SIZE / 2
  const circumference = 2 * Math.PI * R
  const dashOffset = circumference * (1 - pct)
  const color = over ? 'var(--berry)' : 'var(--leaf-deep)'

  return (
    <div className="calorie-ring">
      <div className="cal-head">
        <span className="cal-label">today's kcal ✿</span>
        <span className="cal-date">of {target}</span>
      </div>
      <div className="cal-layout">
        <div className="ring-wrap">
          <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={cx} cy={cy} r={R} className="ring-track" strokeWidth={8} />
            <circle
              cx={cx} cy={cy} r={R}
              className="ring-progress"
              stroke={color}
              strokeWidth={8}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="ring-center">
            <span className="ring-net" style={{ color }}>{net}</span>
            <span className="ring-pct">~ {Math.round(pct * 100)}% ~</span>
          </div>
        </div>
        <div className="cal-right">
          <div className="note-row">
            <div className="note-lb">eaten</div>
            <div className="note-vl good">{consumed}</div>
          </div>
          {exercise > 0 && (
            <div className="note-row">
              <div className="note-lb">burned</div>
              <div className="note-vl burn">− {exercise}</div>
            </div>
          )}
          <div className="note-row">
            <div className="note-lb">room for more</div>
            <div className="note-vl">{Math.max(0, target - net)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
