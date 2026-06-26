import type { HighlightKey, MealSuggestion, SuggestContext } from '@/lib/meal-engine-types'
import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import {
  computeNutritionGaps,
  passesNutritionGapFilter,
  type RecommendationTotals,
} from '@/lib/nutrition/nutrition-gap-filter'

export type RecommendationReasonCode =
  | 'protein_gap'
  | 'low_calorie'
  | 'high_satiety'
  | 'nearby'
  | 'preferred_brand'
  | 'weight_loss'
  | 'budget'
  | 'time_limit'
  | 'post_workout'
  | 'calorie_fit'
  | 'balanced'

export interface RecommendationReason {
  code: RecommendationReasonCode
  label: string
}

const REASON_LABELS: Record<RecommendationReasonCode, string> = {
  protein_gap: '補足今日蛋白質缺口',
  low_calorie: '熱量控制在剩餘預算內',
  high_satiety: '飽足感較高',
  nearby: '距離你較近',
  preferred_brand: '你常吃的品牌',
  weight_loss: '適合減重目標',
  budget: '符合預算',
  time_limit: '準備時間短',
  post_workout: '訓練後補充蛋白質',
  calorie_fit: '熱量與今日目標相符',
  balanced: '營養均衡',
}

const HIGHLIGHT_TO_CODE: Partial<Record<HighlightKey, RecommendationReasonCode>> = {
  high_protein: 'protein_gap',
  budget_friendly: 'budget',
  calorie_fit: 'calorie_fit',
  light_meal: 'low_calorie',
  preferred_store: 'preferred_brand',
  nearby: 'nearby',
  balanced: 'balanced',
}

export function buildRecommendationReasons(
  suggestion: MealSuggestion,
  ctx: SuggestContext,
  opts?: { max?: number }
): RecommendationReason[] {
  const max = opts?.max ?? 5
  const gaps = computeNutritionGaps(ctx)
  const gapCheck = passesNutritionGapFilter(suggestion.totals, gaps, ctx)
  const codes = new Set<RecommendationReasonCode>()

  const highlightCode = HIGHLIGHT_TO_CODE[suggestion.highlight_key]
  if (highlightCode) codes.add(highlightCode)

  if (gaps.remainingProtein > 25 && suggestion.totals.protein_g >= 20) codes.add('protein_gap')
  if (suggestion.totals.calories <= gaps.remainingCalories * 1.05) codes.add('low_calorie')
  if (suggestion.distance_m != null && suggestion.distance_m < 800) codes.add('nearby')
  if (ctx.memory?.favorite_brands?.some(b => suggestion.stores.includes(b))) codes.add('preferred_brand')
  if (ctx.profile?.goal_type === 'lose_weight') codes.add('weight_loss')
  if (suggestion.totals.protein_g >= 25 && gaps.remainingProtein > 30) codes.add('post_workout')

  for (const r of gapCheck.reasons) {
    if (r.includes('蛋白質')) codes.add('protein_gap')
    if (r.includes('熱量')) codes.add('calorie_fit')
    if (r.includes('補救')) codes.add('low_calorie')
  }

  if (codes.size === 0) codes.add('balanced')

  return [...codes]
    .slice(0, max)
    .map(code => ({ code, label: REASON_LABELS[code] }))
}

export function attachRecommendationReasons(
  suggestion: MealSuggestion,
  ctx: SuggestContext
): MealSuggestion {
  return {
    ...suggestion,
    recommendation_reason: buildRecommendationReasons(suggestion, ctx),
  }
}

export function reasonsToDebugString(reasons: RecommendationReason[]): string {
  return reasons.map(r => r.label).join('、')
}

export function buildRecommendationDebugReason(
  totals: RecommendationTotals,
  gaps: ReturnType<typeof computeNutritionGaps>,
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
