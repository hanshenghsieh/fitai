import type { AnalysisSummary } from './analysis-summary'

export interface WeeklyMetrics {
  calorieMetDays: number
  calorieTotalDays: number
  proteinMetDays: number
  proteinTotalDays: number
  workoutCompleted: number
  workoutTarget: number
  waterMetDays: number
  waterTotalDays: number
  waterTotalLiters: number
  dinnerUnder700Days: number
}

export interface WeeklyChallengeItem {
  id: string
  label: string
  current: number
  target: number
  unit: string
  done: boolean
}

export function generateWeeklyChallenges(
  summary: AnalysisSummary,
  metrics: WeeklyMetrics
): WeeklyChallengeItem[] {
  if (summary.insufficient_data) return []

  return [
    {
      id: 'protein-5',
      label: '蛋白質達標 5 天以上',
      current: metrics.proteinMetDays,
      target: 5,
      unit: '天',
      done: metrics.proteinMetDays >= 5,
    },
    {
      id: 'water-14l',
      label: '喝水 14L',
      current: metrics.waterTotalLiters,
      target: 14,
      unit: 'L',
      done: metrics.waterTotalLiters >= 14,
    },
    {
      id: 'workout-4',
      label: '運動 4 次',
      current: metrics.workoutCompleted,
      target: metrics.workoutTarget,
      unit: '次',
      done: metrics.workoutCompleted >= metrics.workoutTarget,
    },
    {
      id: 'dinner-700',
      label: '晚餐 700 kcal 以下',
      current: metrics.dinnerUnder700Days,
      target: 5,
      unit: '天',
      done: metrics.dinnerUnder700Days >= 5,
    },
  ]
}
