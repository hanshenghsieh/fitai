/** 菜單外品項 — 先查 food-kb / runtime；無命中才用當餐目標粗估 */

import { resolveMenuFromQuery } from '@/lib/food-menu-lookup'

export function estimateFreeTextMeal(
  name: string,
  mealTargetKcal: number,
  mealTargetProteinG: number
) {
  const trimmed = name.trim()
  const calories = Math.max(200, Math.round(mealTargetKcal))
  const protein_g = Math.max(8, Math.round(mealTargetProteinG * 0.65))
  const remaining = Math.max(0, calories - protein_g * 4)
  return {
    id: `free-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: trimmed,
    calories,
    protein_g,
    carbs_g: Math.round((remaining * 0.55) / 4),
    fat_g: Math.round((remaining * 0.45) / 9),
    source: 'free_text' as const,
    estimated: true,
  }
}

export function resolveOrEstimateFreeTextMeal(
  name: string,
  mealTargetKcal: number,
  mealTargetProteinG: number
) {
  const verified = resolveMenuFromQuery(name)
  if (verified) {
    return {
      id: verified.id,
      name: verified.name,
      store: verified.store,
      calories: verified.calories,
      protein_g: verified.protein_g,
      carbs_g: verified.carbs_g,
      fat_g: verified.fat_g,
      source: 'search' as const,
      estimated: false,
    }
  }
  return estimateFreeTextMeal(name, mealTargetKcal, mealTargetProteinG)
}
