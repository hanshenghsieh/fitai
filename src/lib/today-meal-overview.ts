import type { FoodLogEntry } from '@/lib/banks/types'
import { normalizeFoodLogSlot, type FoodSlot } from '@/lib/food-slots'

export const TODAY_MEAL_OVERVIEW_SLOTS: readonly FoodSlot[] = [
  'meal1',
  'meal2',
  'meal3',
  'before_sleep',
  'other',
]

export function groupTodayMealOverviewLogs(
  logs: FoodLogEntry[]
): Record<FoodSlot, FoodLogEntry[]> {
  const grouped: Record<FoodSlot, FoodLogEntry[]> = {
    meal1: [],
    meal2: [],
    meal3: [],
    before_sleep: [],
    other: [],
  }
  for (const log of logs) {
    grouped[normalizeFoodLogSlot(log)].push(log)
  }
  return grouped
}

export function visibleTodayMealLogs(logs: FoodLogEntry[]): FoodLogEntry[] {
  const grouped = groupTodayMealOverviewLogs(logs)
  return TODAY_MEAL_OVERVIEW_SLOTS.flatMap(slot => grouped[slot])
}

export function moveTodayMealLogSlot<T extends FoodLogEntry>(
  logs: T[],
  logId: string,
  slot: FoodSlot
): T[] {
  return logs.map(log => (log.id === logId ? ({ ...log, slot } as T) : log))
}
