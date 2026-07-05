import type { FoodLogEntry } from '@/lib/banks/types'
import { getNutritionDayKey } from '@/lib/timezone'

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

export function writeFoodLogsSessionCache(logs: FoodLogEntry[], date = getNutritionDayKey()): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(cacheKey(date), JSON.stringify(logs))
  } catch {
    // sessionStorage full or private mode — ignore
  }
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
  const cached = readFoodLogsSessionCache(date)
  if (!cached) return serverLogs
  const serverFp = foodLogIdsFingerprint(serverLogs)
  const cachedFp = foodLogIdsFingerprint(cached)
  if (serverFp === cachedFp) return serverLogs
  return cached
}
