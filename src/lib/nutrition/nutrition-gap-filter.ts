import type { SuggestContext } from '@/lib/meal-engine-types'
import type { ConvenienceItem } from '@/lib/convenience-store-menu'

export interface NutritionGaps {
  remainingCalories: number
  remainingProtein: number
  remainingCarbs: number
  remainingFat: number
  consumedCalories: number
  consumedProtein: number
  consumedCarbs: number
  consumedFat: number
  caloriesOverTarget: boolean
  fatNearOrOver: boolean
  carbNearOrOver: boolean
}

export interface RecommendationTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

const HIGH_FAT_MEAL_G = 28
const HIGH_CARB_MEAL_G = 90
const RESCUE_MAX_KCAL = 350
const RESCUE_MIN_PROTEIN = 15

export function computeNutritionGaps(ctx: SuggestContext): NutritionGaps {
  const daily = ctx.daily_targets
  const dayState = ctx.day_state
  const consumedCalories = dayState?.alreadyCalories ?? 0
  const consumedProtein = dayState?.alreadyProtein ?? 0
  const ratio = daily.calories > 0 ? consumedCalories / daily.calories : 0
  const consumedCarbs = Math.round(daily.carbs_g * ratio)
  const consumedFat = Math.round(daily.fat_g * ratio)

  const remainingCalories = dayState?.remainingCalories ?? Math.max(0, daily.calories - consumedCalories)
  const remainingProtein = dayState?.proteinGap ?? Math.max(0, daily.protein_g - consumedProtein)
  const remainingCarbs = Math.max(0, daily.carbs_g - consumedCarbs)
  const remainingFat = Math.max(0, daily.fat_g - consumedFat)

  return {
    remainingCalories,
    remainingProtein,
    remainingCarbs,
    remainingFat,
    consumedCalories,
    consumedProtein,
    consumedCarbs,
    consumedFat,
    caloriesOverTarget: remainingCalories <= 0,
    fatNearOrOver: remainingFat <= 12,
    carbNearOrOver: remainingCarbs <= 25,
  }
}

export function passesNutritionGapFilter(
  totals: RecommendationTotals,
  gaps: NutritionGaps,
  ctx: SuggestContext
): { pass: boolean; reasons: string[] } {
  const reasons: string[] = []
  const highProteinPriority = ctx.day_state?.highProteinPriority ?? gaps.remainingProtein > 40

  if (!hasCompleteTotals(totals)) {
    return { pass: false, reasons: ['營養資料不完整'] }
  }

  if (gaps.caloriesOverTarget) {
    const rescueOk = totals.calories <= RESCUE_MAX_KCAL && totals.protein_g >= RESCUE_MIN_PROTEIN
    if (!rescueOk) {
      return { pass: false, reasons: ['今日熱量已足夠，僅允許低熱量高蛋白補救餐'] }
    }
    reasons.push('補救型低熱量高蛋白')
    return { pass: true, reasons }
  }

  if (totals.calories > gaps.remainingCalories * 1.15 && gaps.remainingCalories > 0) {
    return { pass: false, reasons: ['超過剩餘熱量'] }
  }

  if (gaps.fatNearOrOver && totals.fat_g > HIGH_FAT_MEAL_G) {
    return { pass: false, reasons: ['脂肪已接近或超標，排除高脂餐'] }
  }

  if (gaps.carbNearOrOver && totals.carbs_g > HIGH_CARB_MEAL_G) {
    return { pass: false, reasons: ['碳水已接近或超標，排除高碳水餐'] }
  }

  if (highProteinPriority && totals.protein_g < Math.min(20, gaps.remainingProtein * 0.35)) {
    return { pass: false, reasons: ['蛋白質缺口大，此餐蛋白質不足'] }
  }

  if (totals.protein_g >= gaps.remainingProtein * 0.5) reasons.push('蛋白質足夠')
  if (totals.calories <= gaps.remainingCalories * 1.05) reasons.push('熱量在範圍內')
  if (!gaps.fatNearOrOver || totals.fat_g <= HIGH_FAT_MEAL_G) reasons.push('脂肪未超標')

  return { pass: true, reasons }
}

function hasCompleteTotals(totals: RecommendationTotals): boolean {
  return [totals.calories, totals.protein_g, totals.carbs_g, totals.fat_g].every(
    v => v != null && !Number.isNaN(v)
  )
}

export function buildRecommendationDebugReason(
  totals: RecommendationTotals,
  gaps: NutritionGaps,
  items: ConvenienceItem[],
  matchReasons: string[]
): string {
  const store = items[0]?.store ?? '—'
  const names = items.map(i => i.name).join('、')
  return [
    '推薦原因：',
    `剩餘熱量 ${Math.max(0, Math.round(gaps.remainingCalories))} kcal，蛋白質缺口 ${Math.round(gaps.remainingProtein)}g。`,
    `此餐點 ${Math.round(totals.calories)} kcal / 蛋白質 ${Math.round(totals.protein_g)}g / 脂肪 ${Math.round(totals.fat_g)}g / 碳水 ${Math.round(totals.carbs_g)}g。`,
    `店家：${store} · ${names}`,
    `符合原因：${matchReasons.length ? matchReasons.join('、') : '通過資料與營養驗證'}`,
  ].join('\n')
}

export { RESCUE_MAX_KCAL, RESCUE_MIN_PROTEIN, HIGH_FAT_MEAL_G }
