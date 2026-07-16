import type { FoodLogEntry } from '@/lib/banks/types'

export const NUTRITION_PENDING_LABEL = '待確認'

const PENDING_STATUSES = new Set<FoodLogEntry['nutrition_status']>([
  'unknown',
  'pending_confirmation',
  'pending_review',
  'estimated_pending_confirmation',
])

/** True when a log has no usable nutrition yet and should show as「待確認」. */
export function isNutritionPendingConfirmation(
  log: Pick<FoodLogEntry, 'nutrition_status' | 'calories' | 'protein_g'>
): boolean {
  if (log.nutrition_status && PENDING_STATUSES.has(log.nutrition_status)) return true
  return log.calories == null && log.protein_g == null && log.nutrition_status !== 'user_entered'
}

/** @alias isNutritionPendingConfirmation */
export function isNutritionUnknown(
  log: Pick<FoodLogEntry, 'nutrition_status' | 'calories' | 'protein_g'>
): boolean {
  return isNutritionPendingConfirmation(log)
}

export function countPendingNutritionLogs(logs: FoodLogEntry[]): number {
  return logs.filter(isNutritionPendingConfirmation).length
}

export function filterPendingNutritionLogs(logs: FoodLogEntry[]): FoodLogEntry[] {
  return logs.filter(isNutritionPendingConfirmation)
}

export function isUserEnteredNutrition(log: Pick<FoodLogEntry, 'nutrition_status'>): boolean {
  return log.nutrition_status === 'user_entered'
}

export function isAutoResolvedNutrition(log: Pick<FoodLogEntry, 'nutrition_status'>): boolean {
  return log.nutrition_status === 'auto_resolved'
}

export function countsTowardDailyTotals(log: FoodLogEntry): boolean {
  if (isNutritionPendingConfirmation(log)) return false
  if (log.nutrition_status === 'pending_review') return false
  if (
    log.capture_status === 'photo_only' &&
    log.nutrition_status !== 'user_entered' &&
    log.nutrition_status !== 'auto_resolved'
  ) {
    return false
  }
  return log.calories != null && log.protein_g != null
}
