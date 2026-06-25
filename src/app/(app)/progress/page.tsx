export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { format, startOfWeek, subDays } from 'date-fns'
import { BB_V2 } from '@/lib/betterbit-v2'
import AnalyticsScreen from '@/components/analytics/AnalyticsScreen'
import type { WeeklyPlanData } from '@/types'
import type { AnalysisDayPlanHint } from '@/lib/analytics/analysis-summary'

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const ninetyDaysAgo = format(subDays(now, 90), 'yyyy-MM-dd')
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const [
    { data: profile },
    { data: measurements },
    { data: goal },
    { data: checkins },
    { data: weeklyPlans },
  ] = await Promise.all([
    supabase.from('user_profiles').select('weight_kg').eq('id', user.id).single(),
    supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', user.id)
      .gte('measured_at', ninetyDaysAgo)
      .order('measured_at', { ascending: true }),
    supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('daily_checkins')
      .select('checkin_date, notes, water_ml, workout_items')
      .eq('user_id', user.id)
      .gte('checkin_date', ninetyDaysAgo)
      .order('checkin_date', { ascending: true }),
    supabase
      .from('weekly_plans')
      .select('plan_data, week_start')
      .eq('user_id', user.id)
      .gte('week_start', ninetyDaysAgo)
      .order('week_start', { ascending: false }),
  ])

  const activeGoal = goal?.[0] ?? null
  const latestWeight = measurements?.[measurements.length - 1]?.weight_kg ?? profile?.weight_kg ?? null

  const dayPlansByDate: Record<string, AnalysisDayPlanHint> = {}
  let latestTargets = { calories: 1800, protein_g: 120, water_ml: 2000 }
  let plannedWorkoutTitle: string | undefined

  for (const row of weeklyPlans ?? []) {
    const plan = row.plan_data as WeeklyPlanData | null
    if (!plan?.days) continue
    for (const day of plan.days) {
      dayPlansByDate[day.date] = {
        calories_burned_est: day.workout?.calories_burned_est,
        daily_targets: day.daily_targets,
      }
    }
  }

  const currentWeekPlan = (weeklyPlans ?? []).find(p => p.week_start === weekStart)
  const currentPlanData = currentWeekPlan?.plan_data as WeeklyPlanData | null
  const todayStr = format(now, 'yyyy-MM-dd')
  const todayPlan = currentPlanData?.days?.find(d => d.date === todayStr) ?? currentPlanData?.days?.[0]
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

  return (
    <div className="max-w-lg mx-auto min-h-screen" style={{ backgroundColor: BB_V2.bg.canvas }}>
      <AnalyticsScreen
        measurements={measurements ?? []}
        checkins={checkins ?? []}
        targets={{
          calories: latestTargets.calories,
          protein_g: latestTargets.protein_g,
          water_ml: latestTargets.water_ml,
          target_weight_kg: activeGoal?.target_weight_kg ?? currentPlanData?.goal_snapshot?.target_weight ?? null,
        }}
        dayPlansByDate={dayPlansByDate}
        currentWeightKg={latestWeight}
        plannedWorkoutTitle={plannedWorkoutTitle}
      />
    </div>
  )
}
