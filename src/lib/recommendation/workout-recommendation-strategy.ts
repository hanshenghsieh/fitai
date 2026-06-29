import type { AnalysisSummary } from '@/lib/analytics/analysis-summary'
import { isRapidWeightLoss } from '@/lib/analytics/weight-pace'

export interface RecommendedWorkout {
  title: string
  duration: number
  estimatedCalories: number
  intensity: 'low' | 'medium' | 'high'
  reason: string
  based_on_insight: string
}

export function buildWorkoutRecommendationStrategy(
  summary: AnalysisSummary,
  plannedWorkoutTitle?: string
): RecommendedWorkout | null {
  if (summary.insufficient_data) return null

  const avgCal = summary.calorieTrend.average
  const calTarget = summary.calorieTrend.target
  const proteinGap = summary.proteinGapAvg ?? 0
  const weightDelta = summary.weightTrend.deltaKg

  if (isRapidWeightLoss(weightDelta)) {
    return {
      title: '輕度伸展 + 散步',
      duration: 20,
      estimatedCalories: 80,
      intensity: 'low',
      reason: '本週體重降得偏快，先以恢復與低強度活動為主，避免額外透支。',
      based_on_insight: '體重下降過快',
    }
  }

  if (avgCal != null && avgCal > calTarget * 1.08) {
    return {
      title: '中低強度有氧',
      duration: 25,
      estimatedCalories: 180,
      intensity: 'low',
      reason: '本週熱量略高，加一段有氧幫助回到目標範圍。',
      based_on_insight: '熱量超標',
    }
  }

  if (proteinGap >= 20) {
    return {
      title: plannedWorkoutTitle ? `低中強度${plannedWorkoutTitle}` : '低中強度重訓',
      duration: 35,
      estimatedCalories: 220,
      intensity: 'medium',
      reason: '蛋白質不足時不建議加大重量，維持低中強度並記得補 25g 蛋白質。',
      based_on_insight: '蛋白質不足',
    }
  }

  if (weightDelta != null && Math.abs(weightDelta) < 0.2 && summary.calorieTrend.metDays >= 4) {
    return {
      title: 'Zone 2 快走 + 日常活動',
      duration: 30,
      estimatedCalories: 150,
      intensity: 'low',
      reason: '體重停滯但熱量控制不錯，增加 NEAT 與每週 1 次 Zone 2 有氧。',
      based_on_insight: '體重停滯',
    }
  }

  const workoutDone = summary.nextActions.find(a => a.id === 'workout-3')?.done
  if (workoutDone) {
    return {
      title: '主動恢復 / 伸展',
      duration: 20,
      estimatedCalories: 60,
      intensity: 'low',
      reason: '本週運動量已足夠，今天適合恢復與伸展。',
      based_on_insight: '運動量充足',
    }
  }

  if (plannedWorkoutTitle) {
    return {
      title: plannedWorkoutTitle,
      duration: 40,
      estimatedCalories: 260,
      intensity: 'medium',
      reason: '依本週分析調整為中等強度，穩定推進課表。',
      based_on_insight: '分析達標',
    }
  }

  return null
}
