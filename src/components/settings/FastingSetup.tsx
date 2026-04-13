import { useState } from 'react'
import type { FastingPreset, FastingSettings } from '../../types'
import { useAppStore } from '../../store/appStore'

const PRESETS: { label: string; value: FastingPreset; fasting: number; eating: number }[] = [
  { label: '16/8', value: '16:8', fasting: 16, eating: 8 },
  { label: '14/10', value: '14:10', fasting: 14, eating: 10 },
  { label: '自訂', value: 'custom', fasting: 12, eating: 12 },
]

export default function FastingSetup() {
  const fasting = useAppStore(s => s.fasting)
  const setFasting = useAppStore(s => s.setFasting)

  const [enabled, setEnabled] = useState(fasting.enabled)
  const [preset, setPreset] = useState<FastingPreset>(fasting.preset)
  const [fastingHours, setFastingHours] = useState(fasting.fastingHours)
  const [eatingHours, setEatingHours] = useState(fasting.eatingHours)
  const [startTime, setStartTime] = useState(fasting.fastingStartTime)

  function selectPreset(p: typeof PRESETS[0]) {
    setPreset(p.value)
    if (p.value !== 'custom') {
      setFastingHours(p.fasting)
      setEatingHours(p.eating)
    }
  }

  function save() {
    const s: FastingSettings = {
      enabled,
      preset,
      fastingHours,
      eatingHours,
      fastingStartTime: startTime,
    }
    setFasting(s)
  }

  return (
    <div className="fasting-setup">
      <div className="toggle-row">
        <span>斷食計時器</span>
        <label className="toggle">
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
          <span className="slider" />
        </label>
      </div>

      {enabled && (
        <>
          <div className="form-group">
            <label>斷食模式</label>
            <div className="btn-group">
              {PRESETS.map(p => (
                <button
                  key={p.value}
                  className={`btn-option ${preset === p.value ? 'active' : ''}`}
                  onClick={() => selectPreset(p)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {preset === 'custom' && (
            <div className="form-row">
              <div className="form-group">
                <label>斷食時數</label>
                <div className="input-unit">
                  <input type="number" value={fastingHours} min={8} max={23}
                    onChange={e => {
                      const h = Number(e.target.value)
                      setFastingHours(h)
                      setEatingHours(24 - h)
                    }} />
                  <span>hr</span>
                </div>
              </div>
              <div className="form-group">
                <label>進食時數</label>
                <div className="input-unit">
                  <input type="number" value={eatingHours} readOnly />
                  <span>hr</span>
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>斷食開始時間</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            <p className="hint">
              進食窗口：{startTime} 後 {fastingHours} hr 開始，持續 {eatingHours} hr
            </p>
          </div>
        </>
      )}

      <button className="btn-primary" onClick={save}>儲存</button>
    </div>
  )
}
