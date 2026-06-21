export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { format, subWeeks } from 'date-fns'
import { colors } from '@/lib/design-system'
import ProgressScreen from '@/components/progress/ProgressScreen'
import { buildPlateauStory } from '@/lib/plateau-story'
import { getAccessStatus } from '@/lib/subscription-access'

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const eightWeeksAgo = format(subWeeks(new Date(), 8), 'yyyy-MM-dd')

  const [{ data: profile }, { data: subscription }, { data: measurements }, { data: goal }, { data: weeklyPlan }] = await Promise.all([
    supabase.from('user_profiles').select('created_at, weight_kg').eq('id', user.id).single(),
    supabase.from('subscriptions').select('status').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('body_measurements').select('*').eq('user_id', user.id)
      .gte('measured_at', eightWeeksAgo).order('measured_at', { ascending: true }),
    supabase.from('goals').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(1),
    supabase.from('weekly_plans').select('plan_data, previous_completion_rate, previous_workout_rate').eq('user_id', user.id).order('week_start', { ascending: false }).limit(1),
  ])

  const latestWeeklyPlan = weeklyPlan?.[0] ?? null
  const goalSnapshot = (latestWeeklyPlan?.plan_data as { goal_snapshot?: Record<string, unknown> } | null)?.goal_snapshot ?? null
  const access = getAccessStatus(profile?.created_at ?? new Date().toISOString(), subscription)
  const activeGoal = goal?.[0] ?? null
  const latestWeight = measurements?.[measurements.length - 1]?.weight_kg ?? profile?.weight_kg ?? null

  const plateau = buildPlateauStory({
    measurements: measurements ?? [],
    mealAdherence: latestWeeklyPlan?.previous_completion_rate ?? null,
    workoutAdherence: latestWeeklyPlan?.previous_workout_rate ?? null,
  })

  return (
    <div className="max-w-lg mx-auto min-h-screen" style={{ backgroundColor: colors.bg.canvas }}>
      <ProgressScreen
        measurements={measurements ?? []}
        goal={activeGoal}
        goalSnapshot={goalSnapshot as {
          fat_to_lose_kg?: number
          weekly_fat_loss_g?: number
          weeks_remaining?: number
          target_weight?: number | null
        } | null}
        access={access}
        latestWeight={latestWeight}
        plateau={plateau}
      />
    </div>
  )
}
