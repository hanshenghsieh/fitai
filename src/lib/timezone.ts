/** 全站時間以台北為準，避免 SSR（UTC）與 client 時區不一致造成 hydration mismatch */

const TZ = 'Asia/Taipei'

export function getTaipeiHour(date = new Date()): number {
  const h = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone: TZ,
  }).format(date)
  return parseInt(h, 10) % 24
}

export function getTaipeiDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date)
}

/** 例：6月19日 星期五 */
export function formatTaipeiDateLabel(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('zh-TW', {
    timeZone: TZ,
    month: 'numeric',
    day: 'numeric',
    weekday: 'long',
  }).formatToParts(date)
  const month = parts.find(p => p.type === 'month')?.value ?? ''
  const day = parts.find(p => p.type === 'day')?.value ?? ''
  const weekday = parts.find(p => p.type === 'weekday')?.value ?? ''
  return `${month}月${day}日 ${weekday}`
}
