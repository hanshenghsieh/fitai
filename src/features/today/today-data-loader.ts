import { format, startOfWeek, differenceInDays, subDays, parse } from 'date-fns'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { DayPlan, DailyCheckin, UserProfile, WeeklyPlanData } from '@/types'
import type { FoodDna } from '@/lib/food-memory'
import type { FoodLogEntry } from '@/lib/banks/types'
import type { AccessStatus } from '@/lib/subscription-access'
import { buildFoodDnaFromCheckins, extractRecentFoodLogsFromCheckins } from '@/lib/food-memory'
import { getNutritionDayKey } from '@/lib/timezone'
import { getAccessStatus } from '@/lib/subscription-access'
import { SUBSCRIPTION_ACCESS_FIELDS } from '@/lib/subscription-types'
import { userMemoryFromCheckin } from '@/lib/checkin-utils'
import { messageForGeneratePlanError } from '@/lib/generate-plan-errors'
import { apiFetch } from '@/lib/api/client'
import { isCapacitorNative } from '@/lib/capacitor-native'

export interface TodayWeeklyPlanRow {
  id: string
  week_start: string
  generation_status: string | null
  plan_data: WeeklyPlanData | null
}

export interface TodayPageData {
  userId: string
  userEmail: string | null
  todayStr: string
  dayOfWeek: number
  safeDayIndex: number
  weeklyPlan: TodayWeeklyPlanRow | null
  planData: WeeklyPlanData | null
  todayPlan: DayPlan | null
  checkin: DailyCheckin | null
  profile: UserProfile | null
  foodDna: FoodDna
  recentFoodLogs: FoodLogEntry[]
  recentMissedDays: number
  goalSnapshot: WeeklyPlanData['goal_snapshot'] | null | undefined
  access: AccessStatus
  trialDaysLeft: number | null
  initialFoodLogs: FoodLogEntry[]
  planGenerateError: string | null
}

function computeRecentMissedDays(
  recentCheckins: { diet_items?: unknown; workout_items?: unknown }[]
): number {
  return recentCheckins.filter(c => {
    const diet = (c.diet_items ?? []) as { completed: boolean }[]
    const work = (c.workout_items ?? []) as { completed: boolean }[]
    const total = diet.length + work.length
    if (total === 0) return true
    const done =
      diet.filter(i => i.completed).length + work.filter(i => i.completed).length
    return done / total < 0.3
  }).length
}

async function maybeAutoGeneratePlan(
  profile: UserProfile | null,
  weeklyPlan: TodayWeeklyPlanRow | null,
  planData: WeeklyPlanData | null
): Promise<{ planGenerateError: string | null; generated: boolean }> {
  if (weeklyPlan && planData?.days?.length) {
    return { planGenerateError: null, generated: false }
  }
  if (!profile?.onboarding_completed) {
    return { planGenerateError: null, generated: false }
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (isCapacitorNative()) {
    headers['x-betterbit-platform'] = 'ios'
  }

  const res = await apiFetch('/api/generate-plan', {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  })

  const json = (await res.json().catch(() => ({}))) as {
    error?: string
    code?: string
  }

  if (!res.ok) {
    return {
      planGenerateError: messageForGeneratePlanError({
        error: json.error,
        code: json.code,
      }),
      generated: false,
    }
  }

  return { planGenerateError: null, generated: true }
}

export async function loadTodayPageData(
  supabase: SupabaseClient,
  user: User
): Promise<TodayPageData> {
  const now = new Date()
  const todayStr = getNutritionDayKey(now)
  const nutritionDate = parse(todayStr, 'yyyy-MM-dd', now)
  const weekStart = format(startOfWeek(nutritionDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const fourteenDaysAgo = format(subDays(nutritionDate, 14), 'yyyy-MM-dd')
  const dayOfWeek = differenceInDays(nutritionDate, parse(weekStart, 'yyyy-MM-dd', now))

  let planGenerateError: string | null = null

  const [
    weeklyPlanResult,
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
      .maybeSingle(),
    supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', user.id)
      .eq('checkin_date', todayStr)
      .maybeSingle(),
    supabase
      .from('user_profiles')
      .select(
        'id, display_name, weight_kg, body_fat_pct, created_at, gender, age, height_cm, goal_type, activity_level, is_vegetarian, is_vegan, is_halal, is_gluten_free, allergens, disliked_foods, food_budget, onboarding_completed'
      )
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
      .select(SUBSCRIPTION_ACCESS_FIELDS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  let weeklyPlan = weeklyPlanResult.data as TodayWeeklyPlanRow | null
  let planData = (weeklyPlan?.plan_data ?? null) as WeeklyPlanData | null
  const profile = profileRow as UserProfile | null

  const autoGen = await maybeAutoGeneratePlan(profile, weeklyPlan, planData)
  planGenerateError = autoGen.planGenerateError

  if (autoGen.generated) {
    const refreshed = await supabase
      .from('weekly_plans')
      .select('id, week_start, generation_status, plan_data')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .maybeSingle()
    weeklyPlan = refreshed.data as TodayWeeklyPlanRow | null
    planData = (weeklyPlan?.plan_data ?? null) as WeeklyPlanData | null
  }

  const goalSnapshot = planData?.goal_snapshot
  const safeDayIndex = Math.min(
    Math.max(0, dayOfWeek),
    Math.max(0, (planData?.days?.length ?? 1) - 1)
  )
  const todayPlan: DayPlan | null =
    planData?.days?.[safeDayIndex] ?? planData?.days?.[0] ?? null

  const access = getAccessStatus(profile?.created_at ?? new Date().toISOString(), subscription, {
    userEmail: user.email,
  })

  const foodDna = buildFoodDnaFromCheckins(recentCheckins ?? [])
  const recentFoodLogs = extractRecentFoodLogsFromCheckins(recentCheckins ?? [])
  const recentMissedDays = computeRecentMissedDays(recentCheckins ?? [])
  const initialFoodLogs = userMemoryFromCheckin(checkin ?? null).food_logs_today ?? []

  return {
    userId: user.id,
    userEmail: user.email ?? null,
    todayStr,
    dayOfWeek,
    safeDayIndex,
    weeklyPlan,
    planData,
    todayPlan,
    checkin: (checkin as DailyCheckin | null) ?? null,
    profile,
    foodDna,
    recentFoodLogs,
    recentMissedDays,
    goalSnapshot,
    access,
    trialDaysLeft: access.isTrial ? access.trialDaysLeft : null,
    initialFoodLogs,
    planGenerateError,
  }
}
