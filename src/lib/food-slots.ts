/** Phase 5 — 真實生活餐次，不強迫早午晚 */

export type FoodSlot = 'meal1' | 'meal2' | 'meal3' | 'other' | 'before_sleep'

export const FOOD_SLOTS: { id: FoodSlot; label: string }[] = [
  { id: 'meal1', label: '第 1 餐' },
  { id: 'meal2', label: '第 2 餐' },
  { id: 'meal3', label: '第 3 餐' },
  { id: 'other', label: '其他' },
  { id: 'before_sleep', label: '睡前' },
]

export function defaultFoodSlot(hour: number, recentLogHours?: number[]): FoodSlot {
  if (recentLogHours?.length) {
    const nearest = recentLogHours.reduce((best, h) => {
      const d = Math.abs(h - hour)
      const bd = Math.abs(best - hour)
      return d < bd ? h : best
    }, recentLogHours[0]!)
    if (Math.abs(nearest - hour) <= 2) {
      if (nearest < 10) return 'meal1'
      if (nearest < 15) return 'meal2'
      if (nearest < 22) return 'meal3'
      return 'before_sleep'
    }
  }
  if (hour >= 22 || hour < 5) return 'before_sleep'
  if (hour < 10) return 'meal1'
  if (hour < 15) return 'meal2'
  if (hour < 20) return 'meal3'
  return 'other'
}

export function mealHoursFromLogs(logs: { logged_at: string }[]): number[] {
  return logs
    .map(l => {
      try {
        return new Date(l.logged_at).getHours() + new Date(l.logged_at).getMinutes() / 60
      } catch {
        return 12
      }
    })
    .filter(h => !Number.isNaN(h))
}

export function formatTimelineHint(hours: number[]): string | null {
  if (hours.length < 2) return null
  const sorted = [...hours].sort((a, b) => a - b)
  const fmt = (h: number) => {
    const hh = Math.floor(h) % 24
    const mm = Math.round((h % 1) * 60)
    return `${hh}:${String(mm).padStart(2, '0')}`
  }
  return sorted.slice(-4).map(fmt).join(' · ')
}

export function slotLabel(slot: FoodSlot): string {
  return FOOD_SLOTS.find(s => s.id === slot)?.label ?? slot
}
