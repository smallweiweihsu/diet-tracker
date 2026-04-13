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
  const color = over ? 'var(--color-danger)' : 'var(--color-success)'

  return (
    <div className="calorie-ring">
      <svg width={SIZE} height={SIZE}>
        <circle cx={cx} cy={cy} r={R} className="ring-track" />
        <circle
          cx={cx} cy={cy} r={R}
          className="ring-progress"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      <div className="ring-center">
        <span className="ring-net" style={{ color }}>
          {net}
        </span>
        <span className="ring-label">/ {target} kcal</span>
      </div>
      {exercise > 0 && (
        <p className="ring-exercise">🏃 運動消耗 {exercise} kcal</p>
      )}
    </div>
  )
}
