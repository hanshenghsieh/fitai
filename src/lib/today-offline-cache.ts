import type { FoodLogEntry } from '@/lib/banks/types'
import { getNutritionDayKey } from '@/lib/timezone'

export interface TodayOfflineSnapshot {
  date: string
  food_logs_today: FoodLogEntry[]
  calorie_target?: number
  protein_target?: number
  water_ml?: number
  updated_at: string
}

const STORAGE_KEY = 'bb_today_offline_v1'

function readStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export function writeTodayOfflineSnapshot(snapshot: TodayOfflineSnapshot): void {
  const storage = readStorage()
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // quota / private mode
  }
}

export function readTodayOfflineSnapshot(date = getNutritionDayKey()): TodayOfflineSnapshot | null {
  const storage = readStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TodayOfflineSnapshot
    if (!parsed?.date || parsed.date !== date) return null
    if (!Array.isArray(parsed.food_logs_today)) return null
    return parsed
  } catch {
    return null
  }
}

export function hasTodayOfflineSnapshot(date = getNutritionDayKey()): boolean {
  return readTodayOfflineSnapshot(date) != null
}

export function mergeFoodLogsPreferComplete(
  ...sources: (FoodLogEntry[] | null | undefined)[]
): FoodLogEntry[] {
  const byId = new Map<string, FoodLogEntry>()
  for (const source of sources) {
    if (!source?.length) continue
    for (const log of source) {
      if (!byId.has(log.id)) byId.set(log.id, log)
    }
  }
  return [...byId.values()].sort((a, b) => a.logged_at.localeCompare(b.logged_at))
}
