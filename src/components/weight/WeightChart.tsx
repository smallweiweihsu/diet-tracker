import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Dot,
} from 'recharts'
import { useAppStore } from '../../store/appStore'
import { lastNDays } from '../../utils/dateHelpers'
import { format, parseISO } from 'date-fns'

type Range = 30 | 90 | 0

export default function WeightChart() {
  const weights = useAppStore(s => s.weights)
  const days = useAppStore(s => s.days)
  const profile = useAppStore(s => s.profile)
  const [range, setRange] = useState<Range>(30)

  const weightMap = Object.fromEntries(weights.map(w => [w.date, w.weight]))
  const dayDates = range === 0
    ? weights.map(w => w.date)
    : lastNDays(range)

  const data = dayDates.map(d => ({
    date: d,
    weight: weightMap[d] ?? null,
    isWithinTarget: days[d]?.isWithinTarget,
    hasFood: !!days[d]?.totalCalories,
  })).filter(d => d.weight !== null)

  const allWeights = data.map(d => d.weight as number)
  const minW = allWeights.length ? Math.floor(Math.min(...allWeights)) - 1 : 50
  const maxW = allWeights.length ? Math.ceil(Math.max(...allWeights)) + 1 : 100

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function CustomDot(props: any) {
    const { cx, cy, payload } = props
    const color = !payload.hasFood ? '#6b7280'
      : payload.isWithinTarget ? '#10b981'
      : '#ef4444'
    return <Dot cx={cx} cy={cy} r={5} fill={color} stroke="none" />
  }

  return (
    <div className="weight-chart">
      <div className="chart-toolbar">
        <h3>體重趨勢</h3>
        <div className="btn-group small">
          {([30, 90, 0] as Range[]).map(r => (
            <button
              key={r}
              className={`btn-option ${range === r ? 'active' : ''}`}
              onClick={() => setRange(r)}
            >
              {r === 0 ? '全部' : `${r}天`}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="empty-chart">尚無體重記錄</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="date"
              tickFormatter={d => format(parseISO(d), 'MM/dd')}
              tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minW, maxW]}
              tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
              tickFormatter={v => `${v}`}
            />
            <Tooltip
              formatter={(v) => [`${v} kg`, '體重']}
              labelFormatter={l => format(parseISO(l as string), 'yyyy/MM/dd')}
              contentStyle={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                color: 'var(--color-text)',
              }}
            />
            {profile?.targetWeight && (
              <ReferenceLine
                y={profile.targetWeight}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{ value: `目標 ${profile.targetWeight}kg`, fontSize: 11, fill: '#10b981', position: 'right' }}
              />
            )}
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={<CustomDot />}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="chart-legend">
        <span><span className="dot" style={{ background: '#10b981' }} />達標</span>
        <span><span className="dot" style={{ background: '#ef4444' }} />超標</span>
        <span><span className="dot" style={{ background: '#6b7280' }} />未記飲食</span>
        <span className="legend-dashed" style={{ color: '#10b981' }}>── 目標體重</span>
      </div>
    </div>
  )
}
