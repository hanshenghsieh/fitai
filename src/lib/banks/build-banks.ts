import type { CalorieBankRow } from '@/lib/banks/calorie-bank-types'
import type { FoodLogEntry, UserBanks } from './types'
import type { AdherenceState } from '@/lib/engines/adherence-types'
import { effectiveDailyTargetFromBank } from '@/lib/engines/calorie-bank-engine'
import type { DayPlan } from '@/types'

interface GoalSnap {
  daily_deficit?: number
  total_deficit_kcal?: number
  weeks_remaining?: number
  lean_mass_kg?: number
}

function logCountsTowardTotals(log: FoodLogEntry): boolean {
  if (log.nutrition_status === 'unknown') return false
  if (log.capture_status === 'photo_only') return false
  return log.calories != null && log.protein_g != null
}

export function buildUserBanks(
  todayPlan: DayPlan,
  goalSnapshot: GoalSnap | null | undefined,
  foodLogs: FoodLogEntry[],
  workoutCompleted: number,
  workoutTotal: number,
  adherence?: AdherenceState | null,
  calorieBank?: CalorieBankRow | null
): UserBanks {
  const todayTargetKcal = todayPlan.daily_targets.calories
  const dailyPace =
    goalSnapshot?.daily_deficit ??
    Math.max(200, Math.round((goalSnapshot?.total_deficit_kcal ?? 0) / Math.max(1, (goalSnapshot?.weeks_remaining ?? 12) * 7)))

  const todayLoggedKcal = foodLogs.reduce((s, f) => s + (logCountsTowardTotals(f) ? (f.calories ?? 0) : 0), 0)
  const todayLoggedProtein = foodLogs.reduce((s, f) => s + (logCountsTowardTotals(f) ? (f.protein_g ?? 0) : 0), 0)
  const proteinTarget = todayPlan.daily_targets.protein_g

  const weeklyTarget = todayPlan.workout?.type === 'rest' ? 0 : Math.max(3, workoutTotal > 0 ? 5 : 3)

  const spreadAdjust = adherence?.spread.dailyAdjustKcal ?? 0
  const internalTarget =
    calorieBank?.internal_target_kcal ??
    effectiveDailyTargetFromBank(todayTargetKcal, calorieBank) ??
    todayTargetKcal + spreadAdjust

  return {
    calorie: {
      dailyPaceKcal: dailyPace,
      todayTargetKcal,
      todayLoggedKcal,
      runningBalanceKcal: internalTarget - todayLoggedKcal,
      totalBudgetKcal: goalSnapshot?.total_deficit_kcal ?? dailyPace * 90,
      daysRemaining: (goalSnapshot?.weeks_remaining ?? 12) * 7,
    },
    protein: {
      dailyTargetG: proteinTarget,
      todayLoggedG: todayLoggedProtein,
      gapG: Math.max(0, proteinTarget - todayLoggedProtein),
    },
    exercise: {
      weeklyTargetSessions: weeklyTarget,
      completedSessions: workoutCompleted,
      remainingSessions: Math.max(0, weeklyTarget - workoutCompleted),
    },
  }
}
