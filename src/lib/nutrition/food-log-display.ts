import type { FoodLogEntry, FoodNutritionStatus } from '@/lib/banks/types'

export function getFoodLogDisplayLabel(
  log: Pick<FoodLogEntry, 'name' | 'display_label'>
): string {
  const display = log.display_label?.trim()
  return display || log.name
}

export const NUTRITION_PENDING_LABEL = '營養待確認'
export const USER_ENTERED_LABEL = '使用者輸入'

const PENDING_STATUSES = new Set<FoodLogEntry['nutrition_status']>([
  'unknown',
  'pending_confirmation',
  'pending_review',
  'estimated_pending_confirmation',
])

export function isNutritionPendingConfirmation(
  log: Pick<FoodLogEntry, 'nutrition_status' | 'calories' | 'protein_g'>
): boolean {
  if (log.nutrition_status && PENDING_STATUSES.has(log.nutrition_status)) return true
  return log.calories == null && log.protein_g == null && log.nutrition_status !== 'user_entered'
}

/** @alias isNutritionPendingConfirmation */
export function isNutritionUnknown(log: Pick<FoodLogEntry, 'nutrition_status' | 'calories' | 'protein_g'>): boolean {
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

export const AUTO_RESOLVED_LABEL = 'BetterBit 已補齊'

export function isAutoResolvedNutrition(log: Pick<FoodLogEntry, 'nutrition_status'>): boolean {
  return log.nutrition_status === 'auto_resolved'
}

export function countsTowardDailyTotals(log: FoodLogEntry): boolean {
  if (isNutritionPendingConfirmation(log)) return false
  if (log.nutrition_status === 'pending_review') return false
  if (log.capture_status === 'photo_only' && log.nutrition_status !== 'user_entered' && log.nutrition_status !== 'auto_resolved') {
    return false
  }
  return log.calories != null && log.protein_g != null
}

export function formatMacroValue(value: number | null | undefined, unit: string): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value}${unit}`
}

export function formatLogCaloriesLine(
  log: Pick<FoodLogEntry, 'nutrition_status' | 'calories' | 'protein_g'>
): string {
  if (isNutritionPendingConfirmation(log)) return NUTRITION_PENDING_LABEL
  if (log.calories == null) return NUTRITION_PENDING_LABEL
  return `${log.calories} kcal`
}

export function formatLogProteinLine(
  log: Pick<FoodLogEntry, 'nutrition_status' | 'calories' | 'protein_g'>
): string {
  if (isNutritionPendingConfirmation(log)) return ''
  if (log.protein_g == null) return ''
  return `蛋白質 ${log.protein_g}g`
}

export function formatLogMacroSummary(
  log: Pick<FoodLogEntry, 'nutrition_status' | 'calories' | 'protein_g'>
): string {
  if (isNutritionPendingConfirmation(log)) return NUTRITION_PENDING_LABEL
  const cal = log.calories
  const pro = log.protein_g
  if (cal == null && pro == null) return NUTRITION_PENDING_LABEL
  if (cal == null) return `蛋白質 ${pro ?? '—'}g`
  if (pro == null) return `${cal} kcal`
  return `${cal} kcal · 蛋白質 ${pro}g`
}

export function nutritionStatusBadge(log: Pick<FoodLogEntry, 'nutrition_status'>): string | null {
  if (log.nutrition_status === 'user_entered') return USER_ENTERED_LABEL
  if (log.nutrition_status === 'auto_resolved') return AUTO_RESOLVED_LABEL
  if (log.nutrition_status === 'estimated_pending_confirmation') return '待確認'
  if (log.nutrition_status === 'pending_review') return '待審核'
  return null
}

export interface MacroDisplayItem {
  calories: number | null
  protein_g: number | null
  nutrition_status?: FoodNutritionStatus
}

export function formatItemMacroLine(item: MacroDisplayItem): string {
  if (isNutritionPendingConfirmation(item)) return NUTRITION_PENDING_LABEL
  const cal = item.calories
  const pro = item.protein_g
  if (cal == null && pro == null) return NUTRITION_PENDING_LABEL
  if (cal == null) return `蛋白質 ${pro ?? '—'}g`
  if (pro == null) return `${cal} kcal`
  return `${cal} kcal · 蛋白質 ${pro}g`
}

export function sumDisplayMacros(items: MacroDisplayItem[]): { calories: number | null; protein_g: number | null } {
  let calories = 0
  let protein_g = 0
  let hasCal = false
  let hasPro = false
  let hasUnknown = false

  for (const item of items) {
    if (isNutritionPendingConfirmation(item)) {
      hasUnknown = true
      continue
    }
    if (item.calories != null) {
      calories += item.calories
      hasCal = true
    }
    if (item.protein_g != null) {
      protein_g += item.protein_g
      hasPro = true
    }
  }

  if (!hasCal && !hasPro) {
    return { calories: hasUnknown ? null : 0, protein_g: hasUnknown ? null : 0 }
  }
  return {
    calories: hasCal ? calories : null,
    protein_g: hasPro ? protein_g : null,
  }
}

export function formatTotalsLine(items: MacroDisplayItem[]): string {
  const totals = sumDisplayMacros(items)
  if (totals.calories == null && totals.protein_g == null) return NUTRITION_PENDING_LABEL
  if (totals.calories == null) return `合計 蛋白質 ${totals.protein_g ?? '—'}g`
  if (totals.protein_g == null) return `合計 ${totals.calories} kcal`
  return `合計 ${totals.calories} kcal · ${Math.round(totals.protein_g)}g 蛋白`
}

/** Never coerce null → 0 for display or totals. */
export function nullSafeMacro(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null
  return value
}
