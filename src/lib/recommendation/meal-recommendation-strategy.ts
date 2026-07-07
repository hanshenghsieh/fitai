import type { AnalysisSummary } from '@/lib/analytics/analysis-summary'
import { isRapidWeightLoss } from '@/lib/analytics/weight-pace'
import { pickDishHintForMealSlot } from '@/lib/recommendation/dish-first/weekly-plan'

export interface RecommendedMeal {
  name: string
  calories: number
  protein: number
  reason: string
  based_on_insight: string
  dishTemplate?: string
}

function dishFirstMealRec(summary: AnalysisSummary, reason: string, insight: string): RecommendedMeal | null {
  const dish = pickDishHintForMealSlot({
    mealSlot: 'lunch',
    dailyCalories: summary.calorieTrend.target ?? 1800,
    proteinGrams: summary.proteinTrend.target ?? 120,
    proteinGap: summary.proteinGapAvg ?? 0,
    seed: (summary.proteinGapAvg ?? 0) * 17 + (summary.calorieTrend.target ?? 1800),
  })
  if (!dish) return null
  return {
    name: dish,
    calories: 0,
    protein: 0,
    reason,
    based_on_insight: insight,
    dishTemplate: dish,
  }
}

export function buildMealRecommendationStrategy(summary: AnalysisSummary): RecommendedMeal | null {
  if (summary.insufficient_data) return null

  if (isRapidWeightLoss(summary.weightTrend.deltaKg)) {
    return (
      dishFirstMealRec(summary, '本週體重降得偏快，建議維持足量蛋白與穩定份量，避免再壓低熱量。', '體重下降過快') ?? {
        name: '雞胸便當 + 無糖豆漿',
        calories: 520,
        protein: 32,
        reason: '本週體重降得偏快，建議維持足量蛋白與穩定份量，避免再壓低熱量。',
        based_on_insight: '體重下降過快',
      }
    )
  }

  const parts: string[] = []
  const reasons: string[] = []
  const insights: string[] = []

  if ((summary.proteinGapAvg ?? 0) >= 15) {
    parts.push('舒肥雞胸', '茶葉蛋', '無糖豆漿')
    reasons.push('補足蛋白質缺口')
    insights.push('蛋白質不足')
  }

  if ((summary.dinnerCaloriesRatio ?? 0) > 0.42) {
    parts.push('蒸魚', '豆腐')
    reasons.push('晚餐熱量偏高，選低熱量高蛋白')
    insights.push('晚餐熱量偏高')
  }

  if ((summary.fatRatioAvg ?? 0) > 0.38) {
    parts.push('水煮蔬菜')
    reasons.push('脂肪比例偏高，避開油炸')
    insights.push('脂肪偏高')
  }

  if (summary.sugarDrinkCount >= 2) {
    parts.push('無糖茶')
    reasons.push('減少含糖飲料')
    insights.push('手搖飲偏多')
  }

  if ((summary.fiberGapScore ?? 1) < 0.2) {
    parts.push('花椰菜', '毛豆')
    reasons.push('纖維攝取偏低')
    insights.push('纖維不足')
  }

  if (!parts.length) {
    if ((summary.calorieTrend.deltaFromTarget ?? 0) > 0) {
      return (
        dishFirstMealRec(summary, '平均熱量略高，推薦清爽高蛋白餐', '熱量略高') ?? {
          name: '雞胸沙拉碗',
          calories: 420,
          protein: 35,
          reason: '平均熱量略高，推薦清爽高蛋白餐',
          based_on_insight: '熱量略高',
        }
      )
    }
    return null
  }

  const unique = [...new Set(parts)].slice(0, 4)
  const name = unique.join(' + ')
  const calories = unique.length * 180
  const protein = unique.length * 12 + ((summary.proteinGapAvg ?? 0) > 20 ? 10 : 0)

  return {
    name,
    calories,
    protein,
    reason: reasons.join('；'),
    based_on_insight: insights.join('、'),
  }
}
