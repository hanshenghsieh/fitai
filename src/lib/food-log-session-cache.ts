import type { FoodLogEntry } from '@/lib/banks/types'
import { getNutritionDayKey } from '@/lib/timezone'
import { filterFoodLogsForNutritionDay } from '@/lib/nutrition-day-food-logs'
import {
  mergeFoodLogsPreferComplete,
  readTodayOfflineSnapshot,
  writeTodayOfflineSnapshot,
  type TodayOfflineSnapshot,
} from '@/lib/today-offline-cache'

export type { TodayOfflineSnapshot }

function cacheKey(date = getNutritionDayKey()): string {
  return `bb_food_logs_${date}`
}

export function foodLogIdsFingerprint(logs: FoodLogEntry[]): string {
  return logs
    .map(l => l.id)
    .sort()
    .join('|')
}

export function readFoodLogsSessionCache(date = getNutritionDayKey()): FoodLogEntry[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(cacheKey(date))
    if (!raw) return null
    const parsed = JSON.parse(raw) as FoodLogEntry[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeFoodLogsSessionCache(
  logs: FoodLogEntry[],
  date = getNutritionDayKey(),
  snapshot?: Omit<TodayOfflineSnapshot, 'date' | 'food_logs_today' | 'updated_at'>
): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(cacheKey(date), JSON.stringify(logs))
  } catch {
    // sessionStorage full or private mode — ignore
  }
  writeTodayOfflineSnapshot({
    date,
    food_logs_today: logs,
    calorie_target: snapshot?.calorie_target,
    protein_target: snapshot?.protein_target,
    water_ml: snapshot?.water_ml,
    updated_at: new Date().toISOString(),
  })
}

export function clearFoodLogsSessionCache(date = getNutritionDayKey()): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(cacheKey(date))
  } catch {
    // ignore
  }
}

export function resolveFoodLogsFromSession(
  serverLogs: FoodLogEntry[],
  date = getNutritionDayKey()
): FoodLogEntry[] {
  const serverForDay = filterFoodLogsForNutritionDay(serverLogs, date)
  const cached = readFoodLogsSessionCache(date)
  const durable = readTodayOfflineSnapshot(date)?.food_logs_today ?? null
  const cachedForDay = cached ? filterFoodLogsForNutritionDay(cached, date) : null
  const durableForDay = durable ? filterFoodLogsForNutritionDay(durable, date) : null
  const merged = mergeFoodLogsPreferComplete(serverForDay, cachedForDay, durableForDay)
  if (merged.length === serverForDay.length) {
    const serverFp = foodLogIdsFingerprint(serverForDay)
    const mergedFp = foodLogIdsFingerprint(merged)
    if (mergedFp === serverFp) return serverForDay
  }
  return merged.length >= serverForDay.length ? merged : serverForDay
}
