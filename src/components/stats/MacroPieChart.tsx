import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  protein: number
  carbs: number
  fat: number
  totalCalories: number
}

const COLORS = ['#60a5fa', '#fbbf24', '#f97316']
const LABELS = ['蛋白質', '碳水', '脂肪']

export default function MacroPieChart({ protein, carbs, fat, totalCalories }: Props) {
  // Convert to kcal for true ratio
  const pCal = protein * 4
  const cCal = carbs * 4
  const fCal = fat * 9
  const total = pCal + cCal + fCal

  if (total === 0) {
    return (
      <div className="macro-pie empty-chart">
        <p>尚無飲食記錄</p>
      </div>
    )
  }

  const data = [
    { name: LABELS[0], value: pCal, grams: protein },
    { name: LABELS[1], value: cCal, grams: carbs },
    { name: LABELS[2], value: fCal, grams: fat },
  ]

  return (
    <div className="macro-pie">
      <h3>今日巨量營養素比例</h3>
      <div className="macro-pie-wrap">
        <ResponsiveContainer width="50%" height={150}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={65}
              dataKey="value"
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: unknown, name: unknown) => [`${Math.round(((v as number) / total) * 100)}%`, name as string]}
              contentStyle={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="macro-pie-center-label">
          <span className="macro-pie-kcal">{totalCalories}</span>
          <span className="macro-pie-unit">kcal</span>
        </div>

        <div className="macro-pie-legend">
          {data.map((d, i) => (
            <div key={i} className="pie-legend-item">
              <span className="dot" style={{ background: COLORS[i] }} />
              <span>{d.name}</span>
              <span className="pie-legend-val">{d.grams}g</span>
              <span className="pie-legend-pct">({Math.round((d.value / total) * 100)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
