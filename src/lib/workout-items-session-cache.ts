import type { WorkoutCheckinItem } from '@/types'
import { getNutritionDayKey } from '@/lib/timezone'

function cacheKey(date = getNutritionDayKey()): string {
  return `bb_workout_items_${date}`
}

export function workoutItemsFingerprint(items: WorkoutCheckinItem[]): string {
  return items
    .map(i => `${i.exercise_id}:${i.completed ? 1 : 0}`)
    .sort()
    .join('|')
}

export function readWorkoutItemsSessionCache(date = getNutritionDayKey()): WorkoutCheckinItem[] | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(cacheKey(date))
    if (!raw) return null
    const parsed = JSON.parse(raw) as WorkoutCheckinItem[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeWorkoutItemsSessionCache(items: WorkoutCheckinItem[], date = getNutritionDayKey()): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(cacheKey(date), JSON.stringify(items))
  } catch {
    // sessionStorage full or private mode — ignore
  }
}

export function clearWorkoutItemsSessionCache(date = getNutritionDayKey()): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(cacheKey(date))
  } catch {
    // ignore
  }
}

/** Prefer optimistic session cache when ahead of server (e.g. tab switch before PATCH completes). */
export function resolveWorkoutItemsFromSession(
  serverItems: WorkoutCheckinItem[],
  date = getNutritionDayKey()
): WorkoutCheckinItem[] {
  const cached = readWorkoutItemsSessionCache(date)
  if (!cached) return serverItems

  const serverFp = workoutItemsFingerprint(serverItems)
  const cachedFp = workoutItemsFingerprint(cached)
  if (serverFp === cachedFp) return serverItems

  const serverDone = serverItems.filter(i => i.completed).length
  const cachedDone = cached.filter(i => i.completed).length
  if (cachedDone > serverDone) return cached
  if (cachedDone === serverDone && cachedFp !== serverFp) return cached
  return serverItems
}
