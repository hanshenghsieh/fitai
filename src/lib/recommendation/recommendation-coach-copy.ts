/** Warm AI-coach bullets for recommendation cards — no guilt language. */

export function buildRecommendationCoachBullets(params: {
  proteinGap: number
  remainingCalories: number
  effectiveMealCalTarget: number
  mealCalories: number
  mealProtein: number
  mealFat?: number
  existingLabels?: string[]
}): string[] {
  const bullets: string[] = []
  const { proteinGap, remainingCalories, effectiveMealCalTarget, mealCalories, mealProtein, mealFat } =
    params

  if (params.existingLabels?.length) {
    bullets.push(...params.existingLabels.slice(0, 2))
  }

  if (proteinGap > 12) {
    bullets.push(`你今天蛋白質還差約 ${Math.round(proteinGap)}g，這餐可以補上。`)
  } else if (proteinGap > 0) {
    bullets.push('蛋白質還有一點空間，這餐可以溫和補足。')
  }

  if (remainingCalories > 0 && mealCalories <= effectiveMealCalTarget * 1.15) {
    bullets.push('熱量落在下一餐可接受範圍。')
  } else if (remainingCalories <= 80) {
    bullets.push('今天熱量快滿了，這餐屬於低負擔選擇。')
    bullets.push('建議避開含糖飲料與加點。')
    bullets.push('如果還餓，優先加蛋白質，不要加炸物。')
  }

  if (mealFat != null && mealFat > 28 && remainingCalories > 0) {
    bullets.push('脂肪略高，建議醬料少一點。')
  }

  if (proteinGap > 20 && mealProtein >= 25) {
    bullets.push('你今天蛋白質偏低，這餐可以補足一部分。')
    bullets.push('熱量仍可控。')
    bullets.push('建議不要再加澱粉或甜飲。')
  }

  if (bullets.length < 2) {
    bullets.push('這餐符合你今天的節奏，不用硬撐也不必節食。')
  }
  if (bullets.length < 2) {
    bullets.push('Betterbit 幫你把外食選擇算清楚，照常吃就好。')
  }

  return [...new Set(bullets)].slice(0, 3)
}
