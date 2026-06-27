import type { AnalysisSummary } from './analysis-summary'
import { weeklyWaterTargetLiters } from '@/lib/water-log'

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
  metrics: WeeklyMetrics,
  dailyWaterGoalMl = 2000
): WeeklyChallengeItem[] {
  if (summary.insufficient_data) return []

  const weeklyWaterTargetL = weeklyWaterTargetLiters(dailyWaterGoalMl)

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
      label: `喝水 ${weeklyWaterTargetL}L`,
      current: metrics.waterTotalLiters,
      target: weeklyWaterTargetL,
      unit: 'L',
      done: metrics.waterTotalLiters >= weeklyWaterTargetL,
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
