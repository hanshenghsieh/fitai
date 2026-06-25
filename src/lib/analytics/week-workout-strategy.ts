import type { AnalysisSummary } from './analysis-summary'

export interface WorkoutStrategyRow {
  type: 'strength' | 'cardio' | 'neat' | 'rest'
  typeLabel: string
  instruction: string
}

export function generateWorkoutStrategy(summary: AnalysisSummary): WorkoutStrategyRow[] {
  if (summary.insufficient_data) return []

  const calOver =
    summary.calorieTrend.average != null &&
    summary.calorieTrend.average > summary.calorieTrend.target * 1.05
  const proteinLow = (summary.proteinGapAvg ?? 0) >= 20
  const plateau =
    summary.weightTrend.deltaKg != null &&
    Math.abs(summary.weightTrend.deltaKg) < 0.2 &&
    summary.calorieTrend.metDays >= 4
  const workoutDone = summary.nextActions.find(a => a.id === 'workout-3')?.done

  return [
    {
      type: 'strength',
      typeLabel: '重訓',
      instruction: proteinLow ? '降低重量，維持低中強度' : '按課表進行，穩定推進',
    },
    {
      type: 'cardio',
      typeLabel: '有氧',
      instruction: calOver ? '增加 Zone 2 有氧 20~30 分' : '每週 1~2 次即可',
    },
    {
      type: 'neat',
      typeLabel: 'NEAT',
      instruction: plateau ? '每天多走 2,000 步' : '日常活動維持',
    },
    {
      type: 'rest',
      typeLabel: '休息',
      instruction: workoutDone ? '本週已夠，安排恢復與伸展' : '疲勞時優先休息',
    },
  ]
}
