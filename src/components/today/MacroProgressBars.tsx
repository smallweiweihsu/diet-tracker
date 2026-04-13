interface MacroBarProps {
  label: string
  current: number
  target: number
  color: string
}

function MacroBar({ label, current, target, color }: MacroBarProps) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0
  return (
    <div className="macro-bar">
      <div className="macro-bar-header">
        <span>{label}</span>
        <span>{current} / {target} g</span>
      </div>
      <div className="macro-bar-track">
        <div className="macro-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

interface Props {
  protein: number; proteinTarget: number
  carbs: number; carbTarget: number
  fat: number; fatTarget: number
}

export default function MacroProgressBars({ protein, proteinTarget, carbs, carbTarget, fat, fatTarget }: Props) {
  return (
    <div className="macro-bars">
      <MacroBar label="蛋白質" current={Math.round(protein)} target={proteinTarget} color="#60a5fa" />
      <MacroBar label="碳水" current={Math.round(carbs)} target={carbTarget} color="#fbbf24" />
      <MacroBar label="脂肪" current={Math.round(fat)} target={fatTarget} color="#f97316" />
    </div>
  )
}
