import { format, startOfWeek, subDays } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getNutritionDayKey } from '@/lib/timezone'
import type { WeeklyPlanData } from '@/types'
import type { AnalysisDayPlanHint } from '@/lib/analytics/analysis-summary'

/** Week view only needs ~4 weeks of check-ins; analytics month nav needs ~10 weeks. */
export const WEEK_ANALYTICS_LOOKBACK_DAYS = 28
export const PROGRESS_ANALYTICS_LOOKBACK_DAYS = 70

export interface AnalyticsBundle {
  profileWeightKg: number | null
  measurements: { measured_at: string; weight_kg: number }[]
  activeGoal: { target_weight_kg: number | null } | null
  checkins: {
    checkin_date: string
    notes?: string | null
    water_ml?: number | null
    workout_items?: { completed: boolean }[] | null
    diet_items?: unknown
  }[]
  weeklyPlans: { plan_data: unknown; week_start: string }[]
  todayStr: string
  weekStart: string
}

/** Prefer today's body log, then profile (settings save), then latest historical row. */
export function resolveLatestWeightKg(
  measurements: { measured_at: string; weight_kg: number }[],
  profileWeightKg: number | null,
  todayStr: string
): number | null {
  const todayRow = measurements.find(m => m.measured_at.slice(0, 10) === todayStr)
  if (todayRow) return todayRow.weight_kg
  if (profileWeightKg != null) return profileWeightKg
  return measurements.at(-1)?.weight_kg ?? null
}

/** Keep measurements in sync with the resolved latest weight (e.g. profile saved but log lagged). */
export function mergeTodayWeightMeasurement(
  measurements: { measured_at: string; weight_kg: number }[],
  latestWeightKg: number | null,
  todayStr: string
): { measured_at: string; weight_kg: number }[] {
  if (latestWeightKg == null) return measurements
  const idx = measurements.findIndex(m => m.measured_at.slice(0, 10) === todayStr)
  if (idx >= 0) {
    const next = [...measurements]
    next[idx] = { ...next[idx]!, weight_kg: latestWeightKg }
    return next
  }
  return [...measurements, { measured_at: todayStr, weight_kg: latestWeightKg }]
}

export async function loadAnalyticsBundle(
  supabase: SupabaseClient,
  userId: string,
  lookbackDays: number
): Promise<AnalyticsBundle> {
  const now = new Date()
  const todayStr = getNutritionDayKey(now)
  const since = format(subDays(now, lookbackDays), 'yyyy-MM-dd')
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const [
    { data: profile },
    { data: measurements },
    { data: goal },
    { data: checkins },
    { data: weeklyPlans },
  ] = await Promise.all([
    supabase.from('user_profiles').select('weight_kg').eq('id', userId).single(),
    supabase
      .from('body_measurements')
      .select('measured_at, weight_kg')
      .eq('user_id', userId)
      .gte('measured_at', since)
      .order('measured_at', { ascending: true }),
    supabase
      .from('goals')
      .select('target_weight_kg')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('daily_checkins')
      .select('checkin_date, notes, water_ml, workout_items, diet_items')
      .eq('user_id', userId)
      .gte('checkin_date', since)
      .order('checkin_date', { ascending: true }),
    supabase
      .from('weekly_plans')
      .select('plan_data, week_start')
      .eq('user_id', userId)
      .gte('week_start', since)
      .order('week_start', { ascending: false }),
  ])

  return {
    profileWeightKg: profile?.weight_kg ?? null,
    measurements: measurements ?? [],
    activeGoal: goal?.[0] ?? null,
    checkins: checkins ?? [],
    weeklyPlans: weeklyPlans ?? [],
    todayStr,
    weekStart,
  }
}

export function buildDayPlansByDate(
  weeklyPlans: { plan_data: unknown; week_start: string }[]
): Record<string, AnalysisDayPlanHint> {
  const dayPlansByDate: Record<string, AnalysisDayPlanHint> = {}
  for (const row of weeklyPlans) {
    const plan = row.plan_data as WeeklyPlanData | null
    if (!plan?.days) continue
    for (const day of plan.days) {
      dayPlansByDate[day.date] = {
        calories_burned_est: day.workout?.calories_burned_est,
        daily_targets: day.daily_targets,
      }
    }
  }
  return dayPlansByDate
}
