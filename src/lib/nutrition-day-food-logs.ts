import type { FoodLogEntry } from '@/lib/banks/types'
import { getNutritionDayKey } from '@/lib/timezone'

export function foodLogNutritionDayKey(log: FoodLogEntry): string {
  return getNutritionDayKey(new Date(log.logged_at))
}

export function filterFoodLogsForNutritionDay(
  logs: FoodLogEntry[],
  date = getNutritionDayKey()
): FoodLogEntry[] {
  return logs.filter(log => foodLogNutritionDayKey(log) === date)
}
