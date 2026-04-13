import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts'
import { lastNDays } from '../../utils/dateHelpers'
import { format, parseISO } from 'date-fns'
import type { DayLog } from '../../types'

interface Props {
  days: Record<string, DayLog>
  target: number
  range?: number
}

export default function CalorieTrendChart({ days, target, range = 30 }: Props) {
  const dates = lastNDays(range)
  const data = dates.map(d => {
    const log = days[d]
    return {
      date: d,
      calories: log?.netCalories ?? 0,
      hasData: !!log && Object.values(log.meals).some(m => m.length > 0),
      isWithinTarget: log?.isWithinTarget ?? true,
    }
  })

  return (
    <div className="trend-chart">
      <div className="chart-toolbar">
        <h3>熱量趨勢（{range} 天）</h3>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={d => format(parseISO(d), 'M/d')}
            tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
            interval={Math.floor(range / 6)}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
            domain={[0, 'auto']}
          />
          <Tooltip
            formatter={(v: unknown) => [`${v} kcal`, '淨熱量']}
            labelFormatter={l => format(parseISO(l as string), 'yyyy/MM/dd')}
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text)',
              fontSize: 12,
            }}
          />
          {target > 0 && (
            <ReferenceLine
              y={target}
              stroke="#34c759"
              strokeDasharray="4 4"
              label={{ value: '目標', fontSize: 10, fill: '#34c759', position: 'right' }}
            />
          )}
          <Bar dataKey="calories" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  !entry.hasData ? 'var(--color-surface2)'
                    : entry.isWithinTarget ? '#34c759'
                    : '#ff3b30'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="chart-legend">
        <span><span className="dot" style={{ background: '#34c759' }} />達標</span>
        <span><span className="dot" style={{ background: '#ff3b30' }} />超標</span>
        <span><span className="dot" style={{ background: 'var(--color-surface2)', border: '1px solid var(--color-border)' }} />無記錄</span>
      </div>
    </div>
  )
}
