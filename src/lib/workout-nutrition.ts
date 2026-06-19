import type { NutritionTargets } from '@/lib/goal-calculator'

export interface WorkoutBurnInfo {
  type: string
  calories_burned_est?: number
}

export interface DayNutritionTargets extends NutritionTargets {
  exercise_burn_kcal: number
  intake_adjustment_kcal: number
  net_deficit_kcal: number
}

/** 運動日適度吃回消耗（40%），維持淨赤字同時支持恢復 */
const EAT_BACK_RATIO = 0.4

export function adjustDayNutritionForWorkout(
  base: NutritionTargets,
  workout: WorkoutBurnInfo,
  baseDeficit: number
): DayNutritionTargets {
  const burn = workout.calories_burned_est ?? 0
  if (workout.type === 'rest' || burn <= 0) {
    return {
      ...base,
      exercise_burn_kcal: 0,
      intake_adjustment_kcal: 0,
      net_deficit_kcal: baseDeficit,
    }
  }

  const eatBack = Math.round(burn * EAT_BACK_RATIO)
  const dailyCalories = base.dailyCalories + eatBack
  const carbsGrams = Math.max(
    50,
    Math.round((dailyCalories - base.proteinGrams * 4 - base.fatGrams * 9) / 4)
  )

  return {
    dailyCalories,
    proteinGrams: base.proteinGrams,
    fatGrams: base.fatGrams,
    carbsGrams,
    exercise_burn_kcal: burn,
    intake_adjustment_kcal: eatBack,
    net_deficit_kcal: Math.max(0, baseDeficit - Math.round(burn * (1 - EAT_BACK_RATIO))),
  }
}

export function estimateWeeklyWorkoutBurn(
  workouts: WorkoutBurnInfo[]
): { totalBurn: number; activeDays: number; avgBurn: number } {
  const burns = workouts.map(w => w.calories_burned_est ?? 0).filter(b => b > 0)
  const totalBurn = burns.reduce((s, b) => s + b, 0)
  return {
    totalBurn,
    activeDays: burns.length,
    avgBurn: burns.length ? Math.round(totalBurn / burns.length) : 0,
  }
}

export function formatWorkoutNutritionNote(targets: DayNutritionTargets): string {
  if (targets.exercise_burn_kcal <= 0) return ''
  return `今日運動約 ${targets.exercise_burn_kcal} kcal，已吃回 ${targets.intake_adjustment_kcal} kcal，淨赤字約 ${targets.net_deficit_kcal} kcal。`
}
