import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { useAppStore } from '../../store/appStore'
import { todayStr } from '../../utils/dateHelpers'
import type { Measurement } from '../../types'

export default function MeasurementsSection() {
  const measurements = useAppStore(s => s.measurements)
  const addMeasurement = useAppStore(s => s.addMeasurement)
  const today = todayStr()
  const existing = measurements.find(m => m.date === today)

  const [date, setDate] = useState(today)
  const [waist, setWaist] = useState(existing?.waist?.toString() ?? '')
  const [hip, setHip] = useState(existing?.hip?.toString() ?? '')
  const [chest, setChest] = useState(existing?.chest?.toString() ?? '')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    const m: Measurement = {
      date,
      ...(waist ? { waist: parseFloat(waist) } : {}),
      ...(hip ? { hip: parseFloat(hip) } : {}),
      ...(chest ? { chest: parseFloat(chest) } : {}),
    }
    if (!m.waist && !m.hip && !m.chest) return
    addMeasurement(m)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const chartData = measurements.slice(-30).map(m => ({
    date: m.date,
    腰圍: m.waist,
    臀圍: m.hip,
    胸圍: m.chest,
  }))

  return (
    <div className="card measurements-section">
      <h3>三圍記錄</h3>

      <div className="measurements-form">
        <div className="form-group measurements-date-group">
          <label>日期</label>
          <input
            type="date"
            className="input-text measurements-date-input"
            value={date}
            max={todayStr()}
            onChange={e => {
              setDate(e.target.value)
              const m = measurements.find(x => x.date === e.target.value)
              setWaist(m?.waist?.toString() ?? '')
              setHip(m?.hip?.toString() ?? '')
              setChest(m?.chest?.toString() ?? '')
            }}
          />
        </div>
        <div className="measurements-inputs">
          {[
            { label: '腰圍', value: waist, set: setWaist },
            { label: '臀圍', value: hip, set: setHip },
            { label: '胸圍', value: chest, set: setChest },
          ].map(({ label, value, set }) => (
            <div key={label} className="form-group">
              <label>{label}</label>
              <div className="input-unit">
                <input
                  type="number"
                  value={value}
                  min={40}
                  max={200}
                  step={0.1}
                  placeholder="--"
                  inputMode="decimal"
                  onChange={e => set(e.target.value)}
                />
                <span>cm</span>
              </div>
            </div>
          ))}
        </div>
        <div className="measurements-actions">
          <button className="btn-primary" onClick={handleSave}>
            {saved ? '✓ 已儲存' : '儲存'}
          </button>
        </div>
      </div>

      {chartData.length >= 2 && (
        <div className="measurements-chart">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="date"
                tickFormatter={d => format(parseISO(d), 'M/d')}
                tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
              <Tooltip
                labelFormatter={l => format(parseISO(l as string), 'yyyy/MM/dd')}
                formatter={(v: unknown) => [`${v} cm`]}
                contentStyle={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="腰圍" stroke="#ff9500" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="臀圍" stroke="#af52de" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="胸圍" stroke="#5ac8fa" strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
