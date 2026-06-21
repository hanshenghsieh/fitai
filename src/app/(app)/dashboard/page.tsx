export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { format, startOfWeek, differenceInDays, subDays, parse } from 'date-fns'
import { redirect } from 'next/navigation'
import type { WeeklyPlanData, DayPlan, UserProfile } from '@/types'
import { colors } from '@/lib/design-system'
import NotificationPrompt from '@/components/dashboard/NotificationPrompt'
import BetterBitHome from '@/components/dashboard/BetterBitHome'
import GeneratePlanButton from '@/components/dashboard/GeneratePlanButton'
import ZaiJianPanel from '@/components/character/ZaiJianPanel'
import ZaiJian from '@/components/character/ZaiJian'
import { buildFoodDnaFromCheckins, extractRecentFoodLogsFromCheckins } from '@/lib/food-memory'
import { getNutritionDayKey } from '@/lib/timezone'
import { getAccessStatus } from '@/lib/subscription-access'
import {
  getCalorieBankRow,
  syncCalorieBankForUser,
  sumFoodLogCalories,
} from '@/lib/banks/calorie-bank-store'
import { userMemoryFromCheckin } from '@/lib/checkin-utils'
import type { CalorieBankRow } from '@/lib/banks/calorie-bank-types'
import { GENTLE_ERROR_MESSAGE } from '@/lib/copy/gentle-errors'

const PLAN_FAILED_LINE = {
  text: GENTLE_ERROR_MESSAGE,
  expression: 'normal' as const,
  subtext: '再試一次就好。',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
    supabase.from('weekly_plans').select('*').eq('user_id', user.id).eq('week_start', weekStart).single(),
    supabase.from('daily_checkins').select('*').eq('user_id', user.id).eq('checkin_date', todayStr).single(),
    supabase.from('user_profiles').select('*').eq('id', user.id).single(),
    supabase.from('daily_checkins')
      .select('notes, checkin_date, diet_items, workout_items')
      .eq('user_id', user.id)
      .gte('checkin_date', fourteenDaysAgo)
      .lt('checkin_date', todayStr)
      .order('checkin_date', { ascending: true }),
    supabase.from('subscriptions').select('status').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
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
    const done = diet.filter((i: { completed: boolean }) => i.completed).length +
      work.filter((i: { completed: boolean }) => i.completed).length
    return done / total < 0.3
  }).length

  let calorieBank: CalorieBankRow | null = null
  if (todayPlan && profile) {
    const todayLogs = userMemoryFromCheckin(checkin ?? null).food_logs_today ?? []
    const normalTargetKcal = todayPlan.daily_targets.calories
    const actualKcal = sumFoodLogCalories(todayLogs)

    calorieBank = await syncCalorieBankForUser({
      supabase,
      userId: user.id,
      date: todayStr,
      normalTargetKcal,
      actualKcal,
      profile,
    })

    if (!calorieBank?.persisted) {
      const fallback = await getCalorieBankRow(supabase, user.id, todayStr)
      if (fallback) calorieBank = fallback
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[calorie_bank] dashboard sync', {
        normalTargetKcal,
        foodLogCount: todayLogs.length,
        actualKcal,
        syncRan: true,
        calorieBankNull: calorieBank == null,
        persisted: calorieBank?.persisted ?? false,
        internal_target_kcal: calorieBank?.internal_target_kcal,
        recovery_balance_kcal: calorieBank?.recovery_balance_kcal,
      })
    }

    if (!calorieBank && process.env.NODE_ENV === 'development') {
      console.warn('[calorie_bank] dashboard: calorieBank is null after sync', {
        hasTodayPlan: !!todayPlan,
        hasProfile: !!profile,
        normalTargetKcal,
        foodLogCount: todayLogs.length,
      })
    }
  } else if (process.env.NODE_ENV === 'development') {
    console.warn('[calorie_bank] dashboard: sync skipped', {
      hasTodayPlan: !!todayPlan,
      hasProfile: !!profile,
    })
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen" style={{ backgroundColor: colors.bg.canvas }}>
      <NotificationPrompt />

      {weeklyPlan?.generation_status === 'generating' && (
        <ZaiJianPanel moment="loading" />
      )}

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
          calorieBank={calorieBank}
        />
      ) : (
        <ZaiJianPanel moment="empty">
          <GeneratePlanButton />
        </ZaiJianPanel>
      )}
    </div>
  )
}
