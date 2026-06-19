export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { format, startOfWeek, differenceInDays, subDays } from 'date-fns'
import { redirect } from 'next/navigation'
import type { WeeklyPlanData, DayPlan, UserProfile } from '@/types'
import { colors } from '@/lib/design-system'
import NotificationPrompt from '@/components/dashboard/NotificationPrompt'
import BetterBitHome from '@/components/dashboard/BetterBitHome'
import GeneratePlanButton from '@/components/dashboard/GeneratePlanButton'
import ZaiJianPanel from '@/components/character/ZaiJianPanel'
import { pickZaiJianLine } from '@/lib/copy/zaijian'
import ZaiJian from '@/components/character/ZaiJian'
import { buildFoodDnaFromCheckins } from '@/lib/food-memory'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const fourteenDaysAgo = format(subDays(today, 14), 'yyyy-MM-dd')
  const dayOfWeek = differenceInDays(today, new Date(weekStart))

  const [
    { data: weeklyPlan },
    { data: checkin },
    { data: profileRow },
    { data: recentCheckins },
  ] = await Promise.all([
    supabase.from('weekly_plans').select('*').eq('user_id', user.id).eq('week_start', weekStart).single(),
    supabase.from('daily_checkins').select('*').eq('user_id', user.id).eq('checkin_date', todayStr).single(),
    supabase.from('user_profiles').select('*').eq('id', user.id).single(),
    supabase.from('daily_checkins')
      .select('notes, checkin_date, diet_items, workout_items')
      .eq('user_id', user.id)
      .gte('checkin_date', fourteenDaysAgo)
      .lt('checkin_date', todayStr)
      .order('checkin_date', { ascending: true }),
  ])

  const planData = weeklyPlan?.plan_data as WeeklyPlanData | null
  const goalSnapshot = planData?.goal_snapshot
  const safeDayIndex = Math.min(Math.max(0, dayOfWeek), Math.max(0, (planData?.days?.length ?? 1) - 1))
  const todayPlan: DayPlan | null = planData?.days?.[safeDayIndex] ?? planData?.days?.[0] ?? null
  const profile = profileRow as UserProfile | null

  const foodDna = buildFoodDnaFromCheckins(recentCheckins ?? [])
  const recentMissedDays = (recentCheckins ?? []).filter(c => {
    const diet = c.diet_items ?? []
    const work = c.workout_items ?? []
    const total = diet.length + work.length
    if (total === 0) return true
    const done = diet.filter((i: { completed: boolean }) => i.completed).length +
      work.filter((i: { completed: boolean }) => i.completed).length
    return done / total < 0.3
  }).length

  return (
    <div className="max-w-lg mx-auto min-h-screen" style={{ backgroundColor: colors.bg.canvas }}>
      <NotificationPrompt />

      {weeklyPlan?.generation_status === 'generating' && (
        <ZaiJianPanel moment="loading" />
      )}

      {weeklyPlan?.generation_status === 'failed' && (
        <div className="m-4">
          <ZaiJian size="md" line={pickZaiJianLine('error')} layout="bubble" />
        </div>
      )}

      {!weeklyPlan || !planData?.days?.length ? (
        <ZaiJianPanel moment="empty">
          <GeneratePlanButton />
        </ZaiJianPanel>
      ) : todayPlan ? (
        <BetterBitHome
          todayPlan={todayPlan}
          checkin={checkin}
          weeklyPlanId={weeklyPlan?.id ?? null}
          goalSnapshot={goalSnapshot}
          dayIndex={safeDayIndex}
          profile={profile}
          foodDna={foodDna}
          dayOfWeek={dayOfWeek}
          recentMissedDays={recentMissedDays}
        />
      ) : (
        <ZaiJianPanel moment="empty">
          <GeneratePlanButton />
        </ZaiJianPanel>
      )}
    </div>
  )
}
