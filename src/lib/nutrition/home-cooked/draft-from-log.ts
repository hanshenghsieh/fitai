import type { FoodLogEntry } from '@/lib/banks/types'
import { parseMealLabelToDraft } from '@/lib/nutrition/home-cooked/parse-meal-label'
import type { HomeCookedMealDraft } from '@/lib/nutrition/home-cooked/types'
import { resolveWholeFoodLabel } from '@/lib/nutrition/home-cooked/whole-food-registry'

export function homeCookedDraftFromLog(log: FoodLogEntry): HomeCookedMealDraft {
  const meta = log.home_cooked_meta
  if (meta) {
    return {
      meal_label: meta.meal_label,
      meal_cooking_method: meta.meal_cooking_method,
      meal_oil_level: meta.meal_oil_level,
      sauce_level: meta.sauce_level,
      ingredients: meta.ingredients.map(item => {
        const { food } = resolveWholeFoodLabel(item.name_zh)
        return {
          raw_label: item.name_zh,
          food_id: item.food_id,
          name_zh: item.name_zh,
          category: food?.category ?? 'other',
          confidence: 'high' as const,
          amount: item.amount,
          unit: item.unit,
        }
      }),
    }
  }
  return parseMealLabelToDraft(log.display_label ?? log.name)
}
