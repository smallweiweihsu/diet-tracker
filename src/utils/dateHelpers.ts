import { format, parseISO, subDays, eachDayOfInterval } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MM/dd (EEE)', { locale: zhTW })
}

export function formatMonth(dateStr: string): string {
  return format(parseISO(dateStr), 'yyyy年MM月', { locale: zhTW })
}

export function lastNDays(n: number): string[] {
  const end = new Date()
  const start = subDays(end, n - 1)
  return eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'))
}

export function formatTimeHHMM(date: Date): string {
  return format(date, 'HH:mm')
}

/** Given fasting start time (e.g. "20:00") and fasting hours (e.g. 16),
 *  returns { fastEnd, eatEnd } as Date objects for today */
export function fastingWindow(fastingStartTime: string, fastingHours: number): {
  fastStart: Date
  fastEnd: Date
} {
  const [sh, sm] = fastingStartTime.split(':').map(Number)
  const now = new Date()
  const fastStart = new Date(now)
  fastStart.setHours(sh, sm, 0, 0)
  const fastEnd = new Date(fastStart.getTime() + fastingHours * 60 * 60 * 1000)
  return { fastStart, fastEnd }
}
