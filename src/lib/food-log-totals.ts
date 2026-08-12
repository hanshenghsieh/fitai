import type { FoodLogEntry } from '@/lib/banks/types'

/**
 * Single source of truth for "does this food log count toward a user-facing
 * calorie/macro total". Before this file existed, build-banks.ts and
 * next-meal-engine.ts each carried their own copy of this same status gate
 * (P0-4) — any screen built on top of a third copy could silently drift out
 * of sync with what Today/Record/Analysis show.
 */
const EXCLUDED_NUTRITION_STATUSES = new Set([
  'unknown',
  'pending_confirmation',
  'pending_review',
  'estimated_pending_confirmation',
])

export function isFoodLogCountedTowardTotals(log: FoodLogEntry): boolean {
  if (EXCLUDED_NUTRITION_STATUSES.has(log.nutrition_status as string)) {
    return false
  }
  if (
    log.capture_status === 'photo_only' &&
    log.nutrition_status !== 'user_entered' &&
    log.nutrition_status !== 'auto_resolved'
  ) {
    return false
  }
  return true
}

export function sumCountedCalories(logs: FoodLogEntry[]): number {
  return logs.reduce(
    (s, l) => (isFoodLogCountedTowardTotals(l) && l.calories != null ? s + l.calories : s),
    0
  )
}

export function sumCountedProtein(logs: FoodLogEntry[]): number {
  return logs.reduce(
    (s, l) => (isFoodLogCountedTowardTotals(l) && l.protein_g != null ? s + l.protein_g : s),
    0
  )
}

export function sumCountedCarbs(logs: FoodLogEntry[]): number {
  return logs.reduce(
    (s, l) => (isFoodLogCountedTowardTotals(l) && l.carbs_g != null ? s + l.carbs_g : s),
    0
  )
}

export function sumCountedFat(logs: FoodLogEntry[]): number {
  return logs.reduce(
    (s, l) => (isFoodLogCountedTowardTotals(l) && l.fat_g != null ? s + l.fat_g : s),
    0
  )
}
