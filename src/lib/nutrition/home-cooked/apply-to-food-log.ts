import type { FoodLogEntry } from '@/lib/banks/types'
import type {
  HomeCookedMealTotals,
  HomeCookedMeta,
  HomeCookedMealDraft,
  IngredientWeightMeta,
} from '@/lib/nutrition/home-cooked/types'

export function buildHomeCookedMeta(
  draft: HomeCookedMealDraft,
  totals: HomeCookedMealTotals
): HomeCookedMeta {
  const weightByLabel = new Map(
    (draft.ingredient_weights ?? []).map(w => [w.raw_label, w])
  )

  return {
    meal_label: draft.meal_label,
    meal_cooking_method: draft.meal_cooking_method,
    meal_oil_level: draft.meal_oil_level,
    sauce_level: draft.sauce_level,
    meal_oil_g: totals.meal_oil_g,
    quick_adjust: draft.quick_adjust,
    ingredients: totals.items.map((item, index) => {
      const draftLines = draft.ingredients.filter(l => l.food_id != null)
      const draftLine = draftLines[index]
      const weight = draftLine ? weightByLabel.get(draftLine.raw_label) : undefined
      return {
        food_id: item.food_id,
        name_zh: item.name_zh,
        amount: item.amount,
        unit: item.unit,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        estimated_weight_g: weight?.estimated_weight_g ?? item.amount,
        adjusted_weight_g: weight?.adjusted_weight_g ?? item.amount,
        confidence: weight?.confidence,
        source: weight?.source ?? 'photo_estimate',
      }
    }),
    resolved_at: new Date().toISOString(),
    source: 'home_cooked_portion',
    nutrition_model: 'BetterBit_whole_food_nutrition_model_expanded_5x',
  }
}

export function applyHomeCookedTotalsToLog(
  log: FoodLogEntry,
  draft: HomeCookedMealDraft,
  totals: HomeCookedMealTotals
): FoodLogEntry {
  const meta = buildHomeCookedMeta(draft, totals)
  return {
    ...log,
    calories: totals.calories,
    protein_g: totals.protein_g,
    carbs_g: totals.carbs_g,
    fat_g: totals.fat_g,
    nutrition_status: 'user_entered',
    nutrition_confidence: 'user_confirmed',
    capture_status: 'resolved',
    user_nutrition_meta: {
      source_type: 'user_input',
      portion: totals.items.map(i => `${i.name_zh} ${i.amount}${i.unit}`).join('、'),
      source_note: 'BetterBit_whole_food_nutrition_model_expanded_5x',
      entered_at: meta.resolved_at,
      partial: false,
      sodium_mg: totals.sodium_mg,
    },
    home_cooked_meta: meta,
  }
}
