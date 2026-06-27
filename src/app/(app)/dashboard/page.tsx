export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { format, startOfWeek, differenceInDays, subDays, parse } from 'date-fns'
import { redirect } from 'next/navigation'
import type { WeeklyPlanData, DayPlan, UserProfile } from '@/types'
import { colors } from '@/lib/design-system'
import NotificationPrompt from '@/components/dashboard/NotificationPrompt'
import BetterBitHome from '@/components/dashboard/BetterBitHome'
import GeneratePlanButton from '@/components/dashboard/GeneratePlanButton'
import ZaiJianPanel from '@/components/character/ZaiJianPanel'
import ZaiJian from '@/components/character/ZaiJian'
import TodayDashboardSkeleton from '@/components/dashboard/TodayDashboardSkeleton'
import { buildFoodDnaFromCheckins, extractRecentFoodLogsFromCheckins } from '@/lib/food-memory'
import { getNutritionDayKey } from '@/lib/timezone'
import { getAccessStatus } from '@/lib/subscription-access'
import { getAppUser } from '@/lib/supabase/app-session'
import { userMemoryFromCheckin } from '@/lib/checkin-utils'
import { GENTLE_ERROR_MESSAGE } from '@/lib/copy/gentle-errors'

const PLAN_FAILED_LINE = {
  text: GENTLE_ERROR_MESSAGE,
  expression: 'normal' as const,
  subtext: '再試一次就好。',
}

async function DashboardContent() {
  const { supabase, user } = await getAppUser()
  if (!user) redirect('/login')

  const now = new Date()
  const todayStr = getNutritionDayKey(now)
  const nutritionDate = parse(todayStr, 'yyyy-MM-dd', now)
  const weekStart = format(startOfWeek(nutritionDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const fourteenDaysAgo = format(subDays(nutritionDate, 14), 'yyyy-MM-dd')
  const dayOfWeek = differenceInDays(nutritionDate, parse(weekStart, 'yyyy-MM-dd', now))

  const [
    { data: weeklyPlan },
    { data: checkin },
    { data: profileRow },
    { data: recentCheckins },
    { data: subscription },
  ] = await Promise.all([
    supabase
      .from('weekly_plans')
      .select('id, week_start, generation_status, plan_data')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .single(),
    supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', user.id)
      .eq('checkin_date', todayStr)
      .single(),
    supabase
      .from('user_profiles')
      .select('id, display_name, weight_kg, body_fat_pct, created_at, gender, age, height_cm, goal_type, activity_level, is_vegetarian, is_vegan, is_halal, is_gluten_free, allergens, disliked_foods, food_budget, onboarding_completed')
      .eq('id', user.id)
      .single(),
    supabase
      .from('daily_checkins')
      .select('notes, checkin_date, diet_items, workout_items')
      .eq('user_id', user.id)
      .gte('checkin_date', fourteenDaysAgo)
      .lt('checkin_date', todayStr)
      .order('checkin_date', { ascending: true }),
    supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  const planData = weeklyPlan?.plan_data as WeeklyPlanData | null
  const goalSnapshot = planData?.goal_snapshot
  const safeDayIndex = Math.min(Math.max(0, dayOfWeek), Math.max(0, (planData?.days?.length ?? 1) - 1))
  const todayPlan: DayPlan | null = planData?.days?.[safeDayIndex] ?? planData?.days?.[0] ?? null
  const profile = profileRow as UserProfile | null
  const access = getAccessStatus(profile?.created_at ?? new Date().toISOString(), subscription)

  const foodDna = buildFoodDnaFromCheckins(recentCheckins ?? [])
  const recentFoodLogs = extractRecentFoodLogsFromCheckins(recentCheckins ?? [])
  const recentMissedDays = (recentCheckins ?? []).filter(c => {
    const diet = c.diet_items ?? []
    const work = c.workout_items ?? []
    const total = diet.length + work.length
    if (total === 0) return true
    const done =
      diet.filter((i: { completed: boolean }) => i.completed).length +
      work.filter((i: { completed: boolean }) => i.completed).length
    return done / total < 0.3
  }).length

  return (
    <div className="max-w-lg mx-auto" style={{ backgroundColor: colors.bg.canvas }}>
      <NotificationPrompt />

      {weeklyPlan?.generation_status === 'generating' && <ZaiJianPanel moment="loading" />}

      {weeklyPlan?.generation_status === 'failed' && (
        <div className="m-4">
          <ZaiJian size="md" line={PLAN_FAILED_LINE} layout="bubble" />
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
          recentFoodLogs={recentFoodLogs}
          trialDaysLeft={access.isTrial ? access.trialDaysLeft : null}
          initialFoodLogs={userMemoryFromCheckin(checkin ?? null).food_logs_today ?? []}
        />
      ) : (
        <ZaiJianPanel moment="empty">
          <GeneratePlanButton />
        </ZaiJianPanel>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<TodayDashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
