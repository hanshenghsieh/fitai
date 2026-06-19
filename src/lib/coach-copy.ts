/** 教練軌文案 — 白話科學，不含術語堆砌 */

export function formatDeficitPlain(deficit: number): string {
  if (deficit <= 0) return '維持目前熱量'
  const bowls = Math.max(1, Math.round(deficit / 280))
  return `每日約少吃 ${deficit} 大卡（約 ${bowls} 碗飯）`
}

export function formatProteinPlain(grams: number, leanMassKg?: number | null): string {
  if (leanMassKg) {
    return `蛋白質 ${grams}g（保護肌肉，約 ${leanMassKg} kg 瘦體重）`
  }
  return `蛋白質 ${grams}g`
}

export function formatWeeklyFatLoss(grams: number | null | undefined): string {
  if (grams == null || grams <= 0) return '維持體態'
  return `每週約減脂 ${(grams / 1000).toFixed(1)} kg`
}

export function formatMealTarget(
  mealLabel: string,
  calories: number,
  protein: number,
  dailyCalories: number
): string {
  const pct = Math.round((calories / dailyCalories) * 100)
  return `${mealLabel}目標 ${calories} kcal · 蛋白 ${protein}g（約全日 ${pct}%）`
}

export function formatSwapReason(calories: number, targetCal: number, protein: number, targetPro: number): string {
  const calOk = Math.abs(calories - targetCal) <= targetCal * 0.12
  const proOk = protein >= targetPro * 0.85
  if (calOk && proOk) return '仍符合這餐的熱量與蛋白質目標'
  if (!calOk) return `熱量 ${calories} kcal，目標約 ${targetCal} kcal`
  return `蛋白質 ${Math.round(protein)}g，目標約 ${targetPro}g`
}

export const SWAP_BUTTON = '換一個同熱量的'
export const PLAN_FIRST_HINT = '照這個吃。不想吃再換，系統會找同熱量的組合。'
