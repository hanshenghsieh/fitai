import type { MealSuggestion, SuggestContext } from '@/lib/meal-engine-types'
import { computeNutritionGaps } from '@/lib/nutrition/nutrition-gap-filter'
import {
  attachRecommendationDebugReason,
  validateMealSuggestion,
} from '@/lib/nutrition/recommendation-validator'
import { formatNutritionTraceLine, resolveNutritionTrace } from '@/lib/nutrition/nutrition-source-trace'
import type { QaConfidenceGrade, RecommendationQaResult } from './types'

function gradeFromValidation(valid: boolean, issues: string[]): QaConfidenceGrade {
  if (!valid) return 'D'
  if (issues.some(r => /待驗證|placeholder|不完整/.test(r))) return 'C'
  if (issues.length) return 'B'
  return 'A'
}

export function buildRecommendationExplanation(
  suggestion: MealSuggestion,
  ctx: SuggestContext
): string {
  const gaps = computeNutritionGaps(ctx)
  const names = suggestion.lines.map(l => l.item.name).join('、')
  const store = suggestion.stores[0] ?? suggestion.lines[0]?.item.store ?? '—'
  const proteinDelta = Math.round(suggestion.totals.protein_g)
  const calDelta = Math.round(suggestion.totals.calories)

  const reasons: string[] = []
  if (gaps.remainingProtein >= 20) {
    reasons.push(`今天蛋白質還少約 ${Math.round(gaps.remainingProtein)}g，所以推薦高蛋白組合`)
  }
  if (gaps.fatNearOrOver) {
    reasons.push('脂肪已接近上限，優先低脂選項')
  }
  if (gaps.carbNearOrOver) {
    reasons.push('碳水已接近上限，降低飯量/麵量/含糖飲料')
  }
  if (gaps.caloriesOverTarget) {
    reasons.push('今日熱量已足，僅補低熱量高蛋白')
  }
  if (!reasons.length) {
    reasons.push('符合今日剩餘熱量與巨量營養目標')
  }

  const traceLines = suggestion.lines.map(l => formatNutritionTraceLine(resolveNutritionTrace(l.item)))

  return [
    reasons.join('；'),
    `推薦：${store} · ${names}`,
    `此餐 +${proteinDelta}g 蛋白質、+${calDelta} kcal，脂肪 ${Math.round(suggestion.totals.fat_g)}g、碳水 ${Math.round(suggestion.totals.carbs_g)}g。`,
    ...traceLines,
  ].join(' ')
}

export function auditRecommendation(
  suggestion: MealSuggestion | null,
  ctx: SuggestContext,
  scenario: string
): RecommendationQaResult {
  if (!suggestion) {
    return {
      scenario,
      meal_type: ctx.meal_type,
      suggestion_id: null,
      valid: false,
      confidence: 'D',
      recommendable: false,
      explainability_ok: false,
      explanation: '',
      issues: ['無法產生推薦'],
    }
  }

  const enriched = attachRecommendationDebugReason(suggestion, ctx)
  const validation = validateMealSuggestion(enriched, ctx)
  const explanation = buildRecommendationExplanation(enriched, ctx)
  const explainability_ok = explanation.trim().length > 20 && !/推薦原因為空/.test(explanation)

  const confidence = gradeFromValidation(validation.valid, validation.reasons)

  return {
    scenario,
    meal_type: ctx.meal_type,
    suggestion_id: enriched.id,
    valid: validation.valid,
    confidence,
    recommendable: confidence === 'A' || confidence === 'B',
    explainability_ok,
    explanation,
    issues: validation.reasons,
    totals: enriched.totals,
  }
}
