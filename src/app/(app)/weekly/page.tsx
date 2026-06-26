export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { BB_V2 } from '@/lib/betterbit-v2'
import { getNutritionDayKey } from '@/lib/timezone'
import { buildWeekSummary } from '@/lib/analytics/week-summary'
import WeekScreen from '@/components/week/WeekScreen'
import WeekScreenSkeleton from '@/components/week/WeekScreenSkeleton'
import type { WeeklyPlanData } from '@/types'
import {
  buildDayPlansByDate,
  loadAnalyticsBundle,
  WEEK_ANALYTICS_LOOKBACK_DAYS,
} from '@/lib/app/analytics-data'
import { getAppUser } from '@/lib/supabase/app-session'

async function WeekContent() {
  const { supabase, user } = await getAppUser()
  if (!user) redirect('/login')

  const bundle = await loadAnalyticsBundle(supabase, user.id, WEEK_ANALYTICS_LOOKBACK_DAYS)
  const dayPlansByDate = buildDayPlansByDate(bundle.weeklyPlans)

  let latestTargets = { calories: 1800, protein_g: 120, water_ml: 2000, target_weight_kg: null as number | null }
  let workoutTarget = 4
  let fatTargetG = 60

  const currentWeekPlan = bundle.weeklyPlans.find(p => p.week_start === bundle.weekStart)
  const currentPlanData = currentWeekPlan?.plan_data as WeeklyPlanData | null
  const todayPlan = currentPlanData?.days?.find(d => d.date === bundle.todayStr) ?? currentPlanData?.days?.[0]
  if (todayPlan?.daily_targets) {
    latestTargets = {
      calories: todayPlan.daily_targets.calories,
      protein_g: todayPlan.daily_targets.protein_g,
      water_ml: todayPlan.daily_targets.water_ml,
      target_weight_kg:
        bundle.activeGoal?.target_weight_kg ?? currentPlanData?.goal_snapshot?.target_weight ?? null,
    }
    fatTargetG = todayPlan.daily_targets.fat_g
  } else if (currentPlanData?.weekly_targets) {
    latestTargets = {
      calories: currentPlanData.weekly_targets.avg_daily_calories,
      protein_g: currentPlanData.weekly_targets.avg_daily_protein_g,
      water_ml: 2000,
      target_weight_kg:
        bundle.activeGoal?.target_weight_kg ?? currentPlanData?.goal_snapshot?.target_weight ?? null,
    }
  }

  if (currentPlanData?.days) {
    workoutTarget = currentPlanData.days.filter(d => d.workout?.type !== 'rest').length || 4
  }

  const latestWeight =
    bundle.measurements[bundle.measurements.length - 1]?.weight_kg ?? bundle.profileWeightKg ?? null

  const summary = buildWeekSummary({
    anchorDate: new Date(),
    todayDate: bundle.todayStr,
    measurements: bundle.measurements,
    checkins: bundle.checkins,
    targets: {
      calories: latestTargets.calories,
      protein_g: latestTargets.protein_g,
      water_ml: latestTargets.water_ml,
      target_weight_kg: latestTargets.target_weight_kg,
    },
    dayPlansByDate,
    currentWeightKg: latestWeight,
    workoutTarget,
    fatTargetG,
  })

  return <WeekScreen summary={summary} />
}

export default function WeeklyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: BB_V2.bg.canvas }}>
      <Suspense fallback={<WeekScreenSkeleton />}>
        <WeekContent />
      </Suspense>
    </div>
  )
}
