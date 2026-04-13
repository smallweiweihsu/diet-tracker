import { useEffect, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { fastingWindow } from '../../utils/dateHelpers'

export default function FastingIndicator() {
  const fasting = useAppStore(s => s.fasting)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  if (!fasting.enabled) return null

  const { fastStart, fastEnd } = fastingWindow(fasting.fastingStartTime, fasting.fastingHours)

  // Normalize to minutes since midnight
  const toMin = (d: Date) => d.getHours() * 60 + d.getMinutes()
  const nowMin = toMin(now)
  const startMin = toMin(fastStart)
  const endMin = toMin(fastEnd) // may exceed 1440

  // Is currently in fasting window?
  let inFast: boolean
  if (endMin > 1440) {
    // wraps midnight
    inFast = nowMin >= startMin || nowMin < (endMin - 1440)
  } else {
    inFast = nowMin >= startMin && nowMin < endMin
  }

  // Time until eating window or until fasting ends
  let remaining = ''
  if (inFast) {
    // minutes until fast ends
    let diff = endMin - nowMin
    if (diff < 0) diff += 1440
    const h = Math.floor(diff / 60)
    const m = diff % 60
    remaining = `距離進食還有 ${h}h ${m}m`
  } else {
    // minutes until fasting starts
    let diff = startMin - nowMin
    if (diff < 0) diff += 1440
    const h = Math.floor(diff / 60)
    const m = diff % 60
    remaining = `距離斷食開始還有 ${h}h ${m}m`
  }

  // Progress bar: how far through the current window
  let progress = 0
  const windowLen = fasting.fastingHours * 60
  if (inFast) {
    let elapsed = nowMin - startMin
    if (elapsed < 0) elapsed += 1440
    progress = Math.min(elapsed / windowLen, 1)
  } else {
    const eatLen = fasting.eatingHours * 60
    let elapsed = nowMin - (endMin % 1440)
    if (elapsed < 0) elapsed += 1440
    progress = Math.min(elapsed / eatLen, 1)
  }

  return (
    <div className={`fasting-indicator ${inFast ? 'fasting' : 'eating'}`}>
      <div className="fasting-label">
        <span>{inFast ? '🌙 斷食中' : '🍽️ 進食窗口'}</span>
        <span className="fasting-mode">{fasting.fastingHours}/{fasting.eatingHours}</span>
      </div>
      <div className="fasting-bar-track">
        <div
          className="fasting-bar-fill"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="fasting-remaining">{remaining}</p>
    </div>
  )
}
