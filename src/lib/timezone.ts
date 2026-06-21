/** 全站時間以台北為準，避免 SSR（UTC）與 client 時區不一致造成 hydration mismatch */

const TZ = 'Asia/Taipei'

/** 凌晨此時刻前仍歸屬「前一日」飲食紀錄（配合睡前／夜班） */
export const NUTRITION_DAY_ROLLOVER_HOUR = 5

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

/** 飲食紀錄用的「今天」— 00:00–04:59 仍算昨天 */
export function getNutritionDayKey(date = new Date()): string {
  if (getTaipeiHour(date) < NUTRITION_DAY_ROLLOVER_HOUR) {
    const prev = new Date(date.getTime() - 24 * 60 * 60 * 1000)
    return getTaipeiDateKey(prev)
  }
  return getTaipeiDateKey(date)
}

export function nutritionDayResetLabel(): string {
  return `紀錄日於凌晨 ${NUTRITION_DAY_ROLLOVER_HOUR}:00（台北）換新`
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
