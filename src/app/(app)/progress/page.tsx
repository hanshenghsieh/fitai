export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { BB_V2 } from '@/lib/betterbit-v2'
import AnalyticsScreen from '@/components/analytics/AnalyticsScreen'
import ProgressLoading from './loading'
import type { WeeklyPlanData } from '@/types'
import {
  buildDayPlansByDate,
  loadAnalyticsBundle,
  PROGRESS_ANALYTICS_LOOKBACK_DAYS,
} from '@/lib/app/analytics-data'
import { getAppUser } from '@/lib/supabase/app-session'

async function ProgressContent() {
  const { supabase, user } = await getAppUser()
  if (!user) redirect('/login')

  const bundle = await loadAnalyticsBundle(supabase, user.id, PROGRESS_ANALYTICS_LOOKBACK_DAYS)
  const dayPlansByDate = buildDayPlansByDate(bundle.weeklyPlans)

  let latestTargets = { calories: 1800, protein_g: 120, water_ml: 2000 }
  let plannedWorkoutTitle: string | undefined

  const currentWeekPlan = bundle.weeklyPlans.find(p => p.week_start === bundle.weekStart)
  const currentPlanData = currentWeekPlan?.plan_data as WeeklyPlanData | null
  const todayPlan = currentPlanData?.days?.find(d => d.date === bundle.todayStr) ?? currentPlanData?.days?.[0]
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

  if (todayPlan?.workout?.type_zh) {
    plannedWorkoutTitle = todayPlan.workout.type_zh
  }

  const latestWeight =
    bundle.measurements[bundle.measurements.length - 1]?.weight_kg ?? bundle.profileWeightKg ?? null

  return (
    <div className="max-w-lg mx-auto min-h-screen" style={{ backgroundColor: BB_V2.bg.canvas }}>
      <AnalyticsScreen
        measurements={bundle.measurements}
        checkins={bundle.checkins}
        targets={{
          calories: latestTargets.calories,
          protein_g: latestTargets.protein_g,
          water_ml: latestTargets.water_ml,
          target_weight_kg:
            bundle.activeGoal?.target_weight_kg ?? currentPlanData?.goal_snapshot?.target_weight ?? null,
        }}
        dayPlansByDate={dayPlansByDate}
        currentWeightKg={latestWeight}
        plannedWorkoutTitle={plannedWorkoutTitle}
      />
    </div>
  )
}

export default function ProgressPage() {
  return (
    <Suspense fallback={<ProgressLoading />}>
      <ProgressContent />
    </Suspense>
  )
}
