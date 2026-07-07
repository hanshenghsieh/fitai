import { format, startOfWeek, subDays } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getNutritionDayKey } from '@/lib/timezone'
import type { WeeklyPlanData } from '@/types'
import type { BodyMeasurement } from '@/types'
import type { AnalysisDayPlanHint } from '@/lib/analytics/analysis-summary'
import {
  extractWeightHistoryFromCheckins,
  mergeWeightMeasurementSources,
  type WeightMeasurementRow,
} from '@/lib/weight-history'

/** Week view only needs ~4 weeks of check-ins; analytics month nav needs ~10 weeks. */
export const WEEK_ANALYTICS_LOOKBACK_DAYS = 28
export const PROGRESS_ANALYTICS_LOOKBACK_DAYS = 70

export interface AnalyticsBundle {
  profileWeightKg: number | null
  measurements: { id?: string; measured_at: string; weight_kg: number; created_at?: string }[]
  activeGoal: { target_weight_kg: number | null; start_weight_kg: number | null; start_date: string | null } | null
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

/** Prefer today's latest body log, then profile (settings save), then latest historical row. */
export function resolveLatestWeightKg(
  measurements: { id?: string; measured_at: string; weight_kg: number; created_at?: string }[],
  profileWeightKg: number | null,
  todayStr: string
): number | null {
  const todayRows = measurements.filter(m => m.measured_at.slice(0, 10) === todayStr)
  if (todayRows.length) return todayRows.at(-1)!.weight_kg
  if (profileWeightKg != null) return profileWeightKg
  return measurements.at(-1)?.weight_kg ?? null
}

/** Ensure the weight shown in UI exists as a chart row (profile-only readings). */
export function seedMeasurementsWithVisibleWeight(
  measurements: BodyMeasurement[],
  visibleWeightKg: number | null | undefined,
  userId: string,
  anchorDay?: string
): BodyMeasurement[] {
  if (visibleWeightKg == null || !Number.isFinite(visibleWeightKg)) return measurements
  const hasWeight = measurements.some(
    m => m.weight_kg != null && Math.abs(m.weight_kg - visibleWeightKg) < 0.05
  )
  if (hasWeight) return measurements

  const day =
    measurements.filter(m => m.measured_at).at(-1)?.measured_at.slice(0, 10) ??
    anchorDay ??
    format(new Date(), 'yyyy-MM-dd')

  return [
    ...measurements,
    {
      id: `visible-weight-${day}-${visibleWeightKg}`,
      user_id: userId,
      measured_at: day,
      weight_kg: visibleWeightKg,
      body_fat_pct: null,
      muscle_mass_kg: null,
      waist_cm: null,
      hip_cm: null,
      chest_cm: null,
      created_at: `${day}T11:59:00.000Z`,
    },
  ]
}

/** Keep measurements in sync with the resolved latest weight (e.g. profile saved but log lagged). */
export function mergeTodayWeightMeasurement(
  measurements: { id?: string; measured_at: string; weight_kg: number; created_at?: string }[],
  latestWeightKg: number | null,
  todayStr: string
): { measured_at: string; weight_kg: number; created_at?: string }[] {
  if (latestWeightKg == null) return measurements
  const todayRows = measurements.filter(m => m.measured_at.slice(0, 10) === todayStr)
  if (todayRows.some(m => Math.abs(m.weight_kg - latestWeightKg) < 0.05)) return measurements
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
      .select('id, measured_at, weight_kg, created_at')
      .eq('user_id', userId)
      .gte('measured_at', since)
      .order('measured_at', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('goals')
      .select('target_weight_kg, start_weight_kg, start_date')
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
    measurements: mergeWeightMeasurementSources(
      measurements ?? [],
      extractWeightHistoryFromCheckins(checkins ?? [])
    ),
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

export async function loadBodyMeasurementsForUser(
  supabase: SupabaseClient,
  userId: string,
  lookbackDays: number = PROGRESS_ANALYTICS_LOOKBACK_DAYS
): Promise<BodyMeasurement[]> {
  const since = format(subDays(new Date(), lookbackDays), 'yyyy-MM-dd')

  const [{ data: dbRows }, { data: checkins }] = await Promise.all([
    supabase
      .from('body_measurements')
      .select('id, measured_at, weight_kg, body_fat_pct, muscle_mass_kg, waist_cm, hip_cm, chest_cm, created_at')
      .eq('user_id', userId)
      .gte('measured_at', since)
      .order('measured_at', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(52),
    supabase
      .from('daily_checkins')
      .select('checkin_date, notes')
      .eq('user_id', userId)
      .gte('checkin_date', since)
      .order('checkin_date', { ascending: true }),
  ])

  const merged = mergeWeightMeasurementSources(
    dbRows ?? [],
    extractWeightHistoryFromCheckins(checkins ?? [])
  )

  return mapWeightRowsToMeasurements(merged, userId)
}

export function mapWeightRowsToMeasurements(
  rows: WeightMeasurementRow[],
  userId: string
): BodyMeasurement[] {
  return rows.map((row, idx) => ({
    id: row.id ?? `weight-${row.measured_at}-${row.created_at ?? 'na'}-${row.weight_kg}-${idx}`,
    user_id: userId,
    measured_at: row.measured_at,
    weight_kg: row.weight_kg,
    body_fat_pct: null,
    muscle_mass_kg: null,
    waist_cm: null,
    hip_cm: null,
    chest_cm: null,
    created_at: row.created_at ?? `${row.measured_at}T12:00:00.000Z`,
  }))
}

export function mergeClientBodyMeasurements(
  apiMeasurements: BodyMeasurement[],
  checkins: { checkin_date: string; notes?: string | null }[]
): BodyMeasurement[] {
  const dbRows: WeightMeasurementRow[] = apiMeasurements
    .filter(m => m.weight_kg != null)
    .map(m => ({
      id: m.id,
      measured_at: m.measured_at,
      weight_kg: m.weight_kg!,
      created_at: m.created_at,
    }))
  const checkinRows = extractWeightHistoryFromCheckins(checkins)
  const merged = mergeWeightMeasurementSources(dbRows, checkinRows)

  return merged.map((row, idx) => {
    const existing = apiMeasurements.find(
      m =>
        m.id && row.id && m.id === row.id
    ) ?? apiMeasurements.find(
      m =>
        m.measured_at.slice(0, 10) === row.measured_at.slice(0, 10) &&
        m.weight_kg != null &&
        Math.abs(m.weight_kg - row.weight_kg) < 0.05 &&
        (!row.created_at || m.created_at === row.created_at)
    )
    if (existing) return existing
    return {
      id: row.id ?? `checkin-weight-${row.measured_at}-${row.weight_kg}-${idx}`,
      user_id: apiMeasurements[0]?.user_id ?? 'local',
      measured_at: row.measured_at,
      weight_kg: row.weight_kg,
      body_fat_pct: null,
      muscle_mass_kg: null,
      waist_cm: null,
      hip_cm: null,
      chest_cm: null,
      created_at: row.created_at ?? `${row.measured_at}T12:00:00.000Z`,
    }
  })
}
