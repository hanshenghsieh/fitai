import type { FoodLogEntry } from '@/lib/banks/types'
import { calculateFoodRecordNutrition } from './calculate'
import type { CommonFoodItem, FoodRecordDraft } from './types'

export function applyFoodRecordToLog(
  item: CommonFoodItem,
  draft: FoodRecordDraft,
  base?: Partial<FoodLogEntry>
): Partial<FoodLogEntry> {
  const totals = calculateFoodRecordNutrition(item, draft)
  const sourceType = draft.sourceType

  return {
    ...base,
    id: base?.id ?? `p0-${item.id}-${Date.now()}`,
    name: item.name,
    display_label: base?.display_label ?? item.name,
    calories: totals.calories,
    protein_g: totals.protein_g,
    carbs_g: totals.carbs_g,
    fat_g: totals.fat_g,
    source: base?.source ?? 'search',
    nutrition_status: sourceType === 'official' ? 'official' : 'estimated',
    nutrition_confidence: sourceType === 'official' ? 'A' : sourceType === 'user_custom' ? 'C' : 'B',
    capture_status: 'resolved',
    food_record_meta: draft,
  }
}

function hasManualOverride(draft: FoodRecordDraft): boolean {
  const m = draft.manualOverride
  if (!m) return false
  return (
    m.calories != null ||
    m.protein_g != null ||
    m.carbs_g != null ||
    m.fat_g != null ||
    m.sodium_mg != null
  )
}

function resolvedNutritionStatus(
  item: CommonFoodItem,
  draft: FoodRecordDraft
): FoodLogEntry['nutrition_status'] {
  const sourceType = draft.sourceType ?? item.sourceType
  if (sourceType === 'official') return 'official'
  if (hasManualOverride(draft) || sourceType === 'user_custom') return 'user_entered'
  return 'estimated'
}

export function patchFoodRecordOnLog(
  log: FoodLogEntry,
  item: CommonFoodItem,
  draft: FoodRecordDraft
): Partial<FoodLogEntry> {
  const totals = calculateFoodRecordNutrition(item, draft)
  const sourceType = draft.sourceType ?? item.sourceType
  const manual = hasManualOverride(draft)

  return {
    calories: totals.calories,
    protein_g: totals.protein_g,
    carbs_g: totals.carbs_g,
    fat_g: totals.fat_g,
    food_record_meta: {
      ...draft,
      p0_food_id: item.id,
      foodType: item.foodType,
      sourceType,
    },
    nutrition_status: resolvedNutritionStatus(item, draft),
    nutrition_confidence:
      manual || sourceType === 'user_custom' ? 'C' : sourceType === 'official' ? 'A' : 'B',
    capture_status: 'resolved',
    learning: false,
    needs_name: false,
  }
}
