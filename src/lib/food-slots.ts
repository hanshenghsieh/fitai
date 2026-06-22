/** Phase 5 — 真實生活餐次，不強迫早午晚 */

export type FoodSlot = 'meal1' | 'meal2' | 'meal3' | 'other' | 'before_sleep'

export type LegacyMealSlot = 'breakfast' | 'lunch' | 'dinner'

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
  return 'meal3'
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

export function foodSlotForMealType(mealType: LegacyMealSlot): FoodSlot {
  if (mealType === 'breakfast') return 'meal1'
  if (mealType === 'lunch') return 'meal2'
  return 'meal3'
}

/** customEatOut 只對應第 1–3 餐；睡前 / 其他不共用 dinner 選擇 */
export function customEatOutMealTypeForSlot(slot: FoodSlot): LegacyMealSlot | null {
  if (slot === 'meal1') return 'breakfast'
  if (slot === 'meal2') return 'lunch'
  if (slot === 'meal3') return 'dinner'
  return null
}

function inferSlotFromHour(hour: number): FoodSlot {
  if (hour >= 22 || hour < 5) return 'before_sleep'
  if (hour < 10) return 'meal1'
  if (hour < 15) return 'meal2'
  return 'meal3'
}

/** 統一 slot 標籤 — 修正舊版 breakfast/lunch/dinner 或缺 slot 的紀錄 */
export function normalizeFoodLogSlot(log: {
  slot?: string
  logged_at?: string
}): FoodSlot {
  const raw = log.slot
  if (raw === 'meal1' || raw === 'meal2' || raw === 'meal3' || raw === 'before_sleep') {
    return raw
  }
  if (raw === 'other') {
    if (log.logged_at) {
      try {
        const d = new Date(log.logged_at)
        const hour = d.getHours() + d.getMinutes() / 60
        if (!Number.isNaN(hour)) return inferSlotFromHour(hour)
      } catch {
        /* fall through */
      }
    }
    return 'meal3'
  }
  if (raw === 'breakfast') return 'meal1'
  if (raw === 'lunch') return 'meal2'
  if (raw === 'dinner') return 'meal3'

  if (log.logged_at) {
    try {
      const d = new Date(log.logged_at)
      const hour = d.getHours() + d.getMinutes() / 60
      if (!Number.isNaN(hour)) return inferSlotFromHour(hour)
    } catch {
      /* fall through */
    }
  }

  return 'meal2'
}

export function logMatchesFoodSlot(
  log: { slot?: string; logged_at?: string },
  slot: FoodSlot
): boolean {
  return normalizeFoodLogSlot(log) === slot
}
