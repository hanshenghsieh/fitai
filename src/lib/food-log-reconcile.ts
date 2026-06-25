import type { FoodLogEntry } from '@/lib/banks/types'
import { normalizeFoodLogSlot } from '@/lib/food-slots'
import { enrichFoodLog } from '@/lib/food-log-macros'

/** 只修正 slot 標籤（舊版 breakfast/dinner、缺 slot、other），不新增、不搬移紀錄 */
export function reconcileFoodLogsToday(foodLogs: FoodLogEntry[]): FoodLogEntry[] {
  return foodLogs.map(log => {
    const slot = normalizeFoodLogSlot(log)
    const withSlot = log.slot === slot ? log : { ...log, slot }
    return enrichFoodLog(withSlot)
  })
}

export function foodLogsNeedSync(before: FoodLogEntry[], after: FoodLogEntry[]): boolean {
  if (before.length !== after.length) return true
  return after.some((l, i) => {
    const orig = before[i]
    return (
      !orig ||
      l.id !== orig.id ||
      l.slot !== orig.slot ||
      l.carbs_g !== orig.carbs_g ||
      l.fat_g !== orig.fat_g
    )
  })
}
