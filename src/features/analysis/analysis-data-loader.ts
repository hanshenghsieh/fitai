import type { SupabaseClient } from '@supabase/supabase-js'
import type { WeeklyPlanData } from '@/types'
import type { BodyMeasurement } from '@/types'
import type {
  AnalysisCheckinRow,
  AnalysisDayPlanHint,
  AnalysisTargets,
} from '@/lib/analytics/analysis-summary'
import {
  buildDayPlansByDate,
  loadAnalyticsBundle,
  loadBodyMeasurementsForUser,
  mapWeightRowsToMeasurements,
  PROGRESS_ANALYTICS_LOOKBACK_DAYS,
  resolveLatestWeightKg,
  seedMeasurementsWithVisibleWeight,
} from '@/lib/app/analytics-data'

export interface AnalysisPageData {
  todayStr: string
  measurements: BodyMeasurement[]
  checkins: AnalysisCheckinRow[]
  targets: AnalysisTargets
  dayPlansByDate: Record<string, AnalysisDayPlanHint>
  currentWeightKg: number | null
  profileWeightKg: number | null
}

export async function loadAnalysisPageData(
  supabase: SupabaseClient,
  userId: string
): Promise<AnalysisPageData> {
  const bundle = await loadAnalyticsBundle(supabase, userId, PROGRESS_ANALYTICS_LOOKBACK_DAYS)
  const dayPlansByDate = buildDayPlansByDate(bundle.weeklyPlans)

  let latestTargets = { calories: 1800, protein_g: 120, water_ml: 2000 }

  const currentWeekPlan = bundle.weeklyPlans.find(p => p.week_start === bundle.weekStart)
  const currentPlanData = currentWeekPlan?.plan_data as WeeklyPlanData | null
  const todayPlan =
    currentPlanData?.days?.find(d => d.date === bundle.todayStr) ?? currentPlanData?.days?.[0]

  if (todayPlan?.daily_targets) {
    latestTargets = {
      calories: todayPlan.daily_targets.calories,
      protein_g: todayPlan.daily_targets.protein_g,
      water_ml: todayPlan.daily_targets.water_ml,
    }
  } else if (currentPlanData?.weekly_targets) {
    latestTargets = {
      calories: currentPlanData.weekly_targets.avg_daily_calories,
      protein_g: currentPlanData.weekly_targets.avg_daily_protein_g,
      water_ml: 2000,
    }
  }

  const bodyMeasurements = await loadBodyMeasurementsForUser(
    supabase,
    userId,
    PROGRESS_ANALYTICS_LOOKBACK_DAYS
  )

  const latestWeight = resolveLatestWeightKg(
    bundle.measurements,
    bundle.profileWeightKg,
    bundle.todayStr
  )

  const measurements = seedMeasurementsWithVisibleWeight(
    bodyMeasurements.length > 0
      ? bodyMeasurements
      : mapWeightRowsToMeasurements(bundle.measurements, userId),
    latestWeight,
    userId,
    bundle.todayStr
  )

  return {
    todayStr: bundle.todayStr,
    measurements,
    checkins: bundle.checkins,
    targets: {
      calories: latestTargets.calories,
      protein_g: latestTargets.protein_g,
      water_ml: latestTargets.water_ml,
      target_weight_kg:
        bundle.activeGoal?.target_weight_kg ?? currentPlanData?.goal_snapshot?.target_weight ?? null,
      start_weight_kg: bundle.activeGoal?.start_weight_kg ?? null,
      start_date: bundle.activeGoal?.start_date ?? null,
    },
    dayPlansByDate,
    currentWeightKg: latestWeight,
    profileWeightKg: bundle.profileWeightKg,
  }
}
