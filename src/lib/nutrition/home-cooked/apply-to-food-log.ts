import type { FoodLogEntry } from '@/lib/banks/types'
import type { HomeCookedMealTotals, HomeCookedMeta, HomeCookedMealDraft } from '@/lib/nutrition/home-cooked/types'

export function buildHomeCookedMeta(
  draft: HomeCookedMealDraft,
  totals: HomeCookedMealTotals
): HomeCookedMeta {
  return {
    meal_label: draft.meal_label,
    meal_oil_level: draft.meal_oil_level,
    meal_prep_method: draft.meal_prep_method,
    has_sauce: draft.has_sauce,
    sauce_amount_ml: draft.has_sauce ? draft.sauce_amount_ml : null,
    ingredients: totals.items.map(item => ({
      food_id: item.food_id,
      name_zh: item.name_zh,
      amount: item.amount,
      unit: item.unit,
      prep_method: item.prep_method,
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
    })),
    resolved_at: new Date().toISOString(),
    source: 'home_cooked_portion',
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
      source_note: 'home_cooked_portion',
      entered_at: meta.resolved_at,
      partial: false,
      fiber_g: totals.fiber_g,
      sodium_mg: totals.sodium_mg,
    },
    home_cooked_meta: meta,
  }
}
