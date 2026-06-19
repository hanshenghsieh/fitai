/** 菜單外品項 — 用當餐目標粗估，背後再校正 */

export function estimateFreeTextMeal(
  name: string,
  mealTargetKcal: number,
  mealTargetProteinG: number
) {
  const trimmed = name.trim()
  return {
    id: `free-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: trimmed,
    calories: Math.max(200, Math.round(mealTargetKcal)),
    protein_g: Math.max(8, Math.round(mealTargetProteinG * 0.65)),
    source: 'free_text' as const,
  }
}
