const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
    return true
  } catch {
    return false
  }
}

export function normalizePlanTimeZone(timeZone?: string | null): string {
  const candidate = timeZone?.trim()
  return candidate && isValidTimeZone(candidate) ? candidate : 'Asia/Taipei'
}

function datePartsInTimeZone(now: Date, timeZone: string): {
  year: number
  month: number
  day: number
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find(part => part.type === type)?.value)
  return { year: value('year'), month: value('month'), day: value('day') }
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const match = DATE_KEY.exec(dateKey)
  if (!match) throw new Error(`Invalid date key: ${dateKey}`)
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function weekStartForTimeZone(
  now = new Date(),
  requestedTimeZone?: string | null
): string {
  const timeZone = normalizePlanTimeZone(requestedTimeZone)
  const { year, month, day } = datePartsInTimeZone(now, timeZone)
  const localDate = new Date(Date.UTC(year, month - 1, day))
  const daysSinceMonday = (localDate.getUTCDay() + 6) % 7
  localDate.setUTCDate(localDate.getUTCDate() - daysSinceMonday)
  return localDate.toISOString().slice(0, 10)
}
