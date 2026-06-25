/** 菜單外品項 — 用當餐目標粗估，背後再校正 */

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
  }
}
