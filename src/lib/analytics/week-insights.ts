import type { AnalysisSummary } from './analysis-summary'

export interface CoachInsightCard {
  id: string
  tone: 'success' | 'warning' | 'neutral'
  icon: 'trend' | 'droplet' | 'check' | 'workout' | 'water'
  title: string
  body: string
  suggestion: string
}

export interface WeeklyInsightContext {
  todayWaterMl: number
  waterTargetMl: number
}

export function generateWeeklyInsights(
  summary: AnalysisSummary,
  ctx?: WeeklyInsightContext
): CoachInsightCard[] {
  if (summary.insufficient_data) return []

  const cards: CoachInsightCard[] = []
  const avgDinner =
    summary.calorieDistribution.dinnerKcal > 0 && summary.dietRecordSummary.totalMeals > 0
      ? Math.round(summary.calorieDistribution.dinnerKcal / Math.max(1, summary.calorieTrend.metDays || 1))
      : null

  if ((summary.dinnerCaloriesRatio ?? 0) > 0.42) {
    cards.push({
      id: 'dinner-high',
      tone: 'warning',
      icon: 'trend',
      title: '晚餐熱量偏高',
      body: avgDinner
        ? `晚餐平均 ${avgDinner} kcal，佔每日熱量 ${Math.round((summary.dinnerCaloriesRatio ?? 0) * 100)}%`
        : `晚餐佔每日熱量 ${Math.round((summary.dinnerCaloriesRatio ?? 0) * 100)}%`,
      suggestion: '建議：把炸物換成烤雞或清蒸，一週約少 1800 kcal',
    })
  }

  if ((summary.proteinGapAvg ?? 0) >= 15) {
    cards.push({
      id: 'protein-low',
      tone: 'warning',
      icon: 'droplet',
      title: '蛋白質不足',
      body: `本週平均少 ${Math.round(summary.proteinGapAvg ?? 0)}g，影響肌肉保留`,
      suggestion: '建議：每天補充 25~30g 優質蛋白質（雞胸、豆腐、鮭魚）',
    })
  }

  const workoutDone = summary.nextActions.find(a => a.id === 'workout-3')
  if (workoutDone && !workoutDone.done) {
    cards.push({
      id: 'workout-low',
      tone: 'warning',
      icon: 'workout',
      title: '運動不足',
      body: '本週運動次數未達標，代謝與恢復都會受影響',
      suggestion: '建議：本週再安排 1~2 次低中強度訓練或快走',
    })
  }

  const waterDone = summary.nextActions.find(a => a.id === 'water-2000')
  const todayWaterMet =
    ctx != null && ctx.waterTargetMl > 0 && ctx.todayWaterMl >= ctx.waterTargetMl * 0.9
  if (waterDone && !waterDone.done && !todayWaterMet) {
    const targetMl = ctx?.waterTargetMl ?? 2000
    cards.push({
      id: 'water-low',
      tone: 'warning',
      icon: 'water',
      title: '水喝太少',
      body: `喝水達標 ${summary.dietRecordSummary.waterMetDays} / ${summary.dietRecordSummary.waterTotalDays} 天`,
      suggestion: `建議：每天固定喝滿 ${targetMl}ml，分次完成`,
    })
  }

  if (summary.calorieTrend.deltaFromTarget != null && summary.calorieTrend.deltaFromTarget <= 0) {
    cards.push({
      id: 'cal-good',
      tone: 'success',
      icon: 'check',
      title: '整體表現不錯',
      body: '熱量控制穩定，已經有在進步！',
      suggestion: '繼續保持，你會越來越接近目標！',
    })
  }

  return cards.slice(0, 3)
}
