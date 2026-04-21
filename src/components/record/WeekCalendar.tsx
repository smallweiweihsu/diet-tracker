import { useMemo, useRef, useState } from 'react'
import { format, addWeeks, subWeeks, startOfWeek, addDays, isFuture, isToday, parseISO } from 'date-fns'
import { zhTW } from 'date-fns/locale'

interface Props {
  selectedDate: string   // "YYYY-MM-DD"
  onSelect: (date: string) => void
  markedDates?: Set<string>  // dates with entries (optional dots)
}

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

export default function WeekCalendar({ selectedDate, onSelect, markedDates }: Props) {
  const selectedParsed = parseISO(selectedDate)

  // Track which week is displayed (start of week containing selectedDate)
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(selectedParsed, { weekStartsOn: 1 })
  )

  // Touch swipe state
  const swipeTouchStartX = useRef(0)
  const swipeTouchStartY = useRef(0)

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [weekStart])

  const monthLabel = format(weekStart, 'yyyy年 M月', { locale: zhTW })
  const canGoNext = !isFuture(addDays(weekStart, 7))

  function handlePrev() {
    setWeekStart(w => subWeeks(w, 1))
  }
  function handleNext() {
    if (canGoNext) setWeekStart(w => addWeeks(w, 1))
  }

  function handleTouchStart(e: React.TouchEvent) {
    swipeTouchStartX.current = e.touches[0].clientX
    swipeTouchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - swipeTouchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - swipeTouchStartY.current)
    // Only respond to predominantly horizontal swipes (> 40px, not scrolling)
    if (Math.abs(dx) < 40 || dy > Math.abs(dx)) return
    if (dx < 0) handleNext()   // swipe left → next week
    else handlePrev()           // swipe right → prev week
  }

  return (
    <div
      className="week-calendar"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="week-calendar-header">
        <span className="week-month-label">{monthLabel}</span>
        <div className="week-nav-btns">
          <button className="week-nav-btn" onClick={handlePrev}>‹</button>
          <button className="week-nav-btn" onClick={handleNext} disabled={!canGoNext}>›</button>
        </div>
      </div>
      <div className="week-days">
        {days.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const future = isFuture(day) && !isToday(day)
          const isSelected = dateStr === selectedDate
          const isCurrentDay = isToday(day)
          const hasDot = markedDates?.has(dateStr)

          return (
            <button
              key={dateStr}
              className={[
                'week-day',
                isSelected ? 'selected' : '',
                isCurrentDay ? 'today' : '',
                future ? 'disabled' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => !future && onSelect(dateStr)}
              disabled={future}
            >
              <span className="week-day-label">{DAY_LABELS[i]}</span>
              <span className="week-day-num">{format(day, 'd')}</span>
              {hasDot && <span className="week-dot" />}
              {!hasDot && <span className="week-dot-spacer" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
