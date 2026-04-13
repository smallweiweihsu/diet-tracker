import { useState, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'

interface Props {
  date: string
  notes: string
}

export default function DailyNotes({ date, notes }: Props) {
  const setNotes = useAppStore(s => s.setNotes)
  const [value, setValue] = useState(notes)

  // Sync if date changes
  useEffect(() => { setValue(notes) }, [notes, date])

  function handleBlur() {
    setNotes(value, date)
  }

  return (
    <div className="daily-notes">
      <textarea
        className="notes-textarea"
        value={value}
        placeholder="今天有什麼要記錄的…"
        rows={2}
        onChange={e => setValue(e.target.value)}
        onBlur={handleBlur}
      />
    </div>
  )
}
