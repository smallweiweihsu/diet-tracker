import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Dot, Legend,
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

  const rawData = dayDates.map(d => ({
    date: d,
    weight: weightMap[d] ?? null,
    isWithinTarget: days[d]?.isWithinTarget,
    hasFood: !!days[d] && Object.values(days[d].meals).some(m => m.length > 0),
  })).filter(d => d.weight !== null)

  // 7-day moving average
  const dataWithMA = useMemo(() => {
    return rawData.map((d, i) => {
      const window = rawData.slice(Math.max(0, i - 6), i + 1)
      const validWeights = window.map(x => x.weight).filter((w): w is number => w !== null)
      const ma = validWeights.length > 0
        ? Math.round((validWeights.reduce((a, b) => a + b, 0) / validWeights.length) * 10) / 10
        : null
      return { ...d, movingAvg: ma }
    })
  }, [rawData])

  const allWeights = rawData.map(d => d.weight as number)
  const minW = allWeights.length ? Math.floor(Math.min(...allWeights)) - 1 : 50
  const maxW = allWeights.length ? Math.ceil(Math.max(...allWeights)) + 1 : 100

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function CustomDot(props: any) {
    const { cx, cy, payload } = props
    const color = !payload.hasFood ? '#6b7280'
      : payload.isWithinTarget ? '#34c759'
      : '#ff3b30'
    return <Dot cx={cx} cy={cy} r={4} fill={color} stroke="none" />
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

      {dataWithMA.length === 0 ? (
        <p className="empty-chart">尚無體重記錄</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dataWithMA} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
            />
            <Tooltip
              formatter={(v, name) => [`${v} kg`, name === 'weight' ? '體重' : '移動平均']}
              labelFormatter={l => format(parseISO(l as string), 'yyyy/MM/dd')}
              contentStyle={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                color: 'var(--color-text)',
                fontSize: 12,
              }}
            />
            <Legend
              formatter={v => v === 'weight' ? '體重' : '7日均線'}
              wrapperStyle={{ fontSize: 12 }}
            />
            {profile?.targetWeight && (
              <ReferenceLine
                y={profile.targetWeight}
                stroke="#34c759"
                strokeDasharray="4 4"
                label={{ value: `目標 ${profile.targetWeight}kg`, fontSize: 10, fill: '#34c759', position: 'right' }}
              />
            )}
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={<CustomDot />}
              connectNulls={false}
              legendType="circle"
            />
            <Line
              type="monotone"
              dataKey="movingAvg"
              stroke="#9ca3af"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              connectNulls
              legendType="line"
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="chart-legend">
        <span><span className="dot" style={{ background: '#34c759' }} />達標</span>
        <span><span className="dot" style={{ background: '#ff3b30' }} />超標</span>
        <span><span className="dot" style={{ background: '#6b7280' }} />未記飲食</span>
      </div>
    </div>
  )
}
