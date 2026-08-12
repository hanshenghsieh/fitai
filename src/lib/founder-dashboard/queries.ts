import type { SupabaseClient } from '@supabase/supabase-js'
import { addDaysToDayKey, dashboardDayKey } from './day-key'
import { calculateFunnel, type FunnelStageResult } from './funnel'
import {
  calculateRetentionCurve,
  type RetentionOffsetResult,
} from './retention'
import { summarizePhotoOutcomes, type PhotoOutcomeCounts } from './photo-outcomes'

interface AnalyticsEventRow {
  event_name: string
  user_id: string | null
  taipei_date: string
  properties: Record<string, unknown> | null
}

async function fetchEventsInRange(
  supabase: SupabaseClient,
  eventNames: string[],
  fromDayKey: string,
  toDayKey: string
): Promise<AnalyticsEventRow[]> {
  const { data, error } = await supabase
    .from('analytics_events')
    .select('event_name, user_id, taipei_date, properties')
    .in('event_name', eventNames)
    .gte('taipei_date', fromDayKey)
    .lte('taipei_date', toDayKey)
  if (error) {
    console.error('[founder-dashboard] fetchEventsInRange failed', { message: error.message })
    return []
  }
  return (data ?? []) as AnalyticsEventRow[]
}

function countDistinctUsers(rows: AnalyticsEventRow[]): number {
  return new Set(rows.filter(r => r.user_id).map(r => r.user_id)).size
}

export interface DashboardSnapshot {
  dayKey: string
  signups: number
  activeFoodLoggers: number
  mealsLogged: number
  photo: PhotoOutcomeCounts
  trialsStarted: number
  subscriptionsStarted: number
}

async function buildSnapshot(
  supabase: SupabaseClient,
  fromDayKey: string,
  toDayKey: string
): Promise<Omit<DashboardSnapshot, 'dayKey'>> {
  const rows = await fetchEventsInRange(
    supabase,
    [
      'account_created',
      'meal_log_started',
      'meal_log_succeeded',
      'meal_log_failed',
      'trial_started',
      'subscription_started',
    ],
    fromDayKey,
    toDayKey
  )

  const signups = rows.filter(r => r.event_name === 'account_created').length
  const succeededRows = rows.filter(r => r.event_name === 'meal_log_succeeded')
  const activeFoodLoggers = countDistinctUsers(succeededRows)
  const mealsLogged = succeededRows.length
  const trialsStarted = rows.filter(r => r.event_name === 'trial_started').length
  const subscriptionsStarted = rows.filter(r => r.event_name === 'subscription_started').length

  const photo = summarizePhotoOutcomes(
    rows
      .filter(r => ['meal_log_started', 'meal_log_succeeded', 'meal_log_failed'].includes(r.event_name))
      .map(r => ({
        eventName: r.event_name as 'meal_log_started' | 'meal_log_succeeded' | 'meal_log_failed',
        source: typeof r.properties?.source === 'string' ? r.properties.source : 'other',
        failureType: typeof r.properties?.failure_type === 'string' ? r.properties.failure_type : null,
      }))
  )

  return { signups, activeFoodLoggers, mealsLogged, photo, trialsStarted, subscriptionsStarted }
}

export async function getTodaySnapshot(supabase: SupabaseClient, now = new Date()): Promise<DashboardSnapshot> {
  const today = dashboardDayKey(now)
  const stats = await buildSnapshot(supabase, today, today)
  return { dayKey: today, ...stats }
}

export async function getLast7DaysSnapshot(
  supabase: SupabaseClient,
  now = new Date()
): Promise<DashboardSnapshot> {
  const today = dashboardDayKey(now)
  const from = addDaysToDayKey(today, -6)
  const stats = await buildSnapshot(supabase, from, today)
  return { dayKey: `${from}..${today}`, ...stats }
}

export async function getFunnelCounts(
  supabase: SupabaseClient,
  now = new Date()
): Promise<FunnelStageResult[]> {
  const today = dashboardDayKey(now)
  // Funnel is all-time (not windowed) — a 7-day window would hide most of
  // the D7/trial/paid stages for a young product with few users so far.
  const epoch = '2000-01-01'

  const [accountRows, onboardingRows, firstMealRows, trialRows, subRows] = await Promise.all([
    fetchEventsInRange(supabase, ['account_created'], epoch, today),
    fetchEventsInRange(supabase, ['onboarding_completed'], epoch, today),
    fetchEventsInRange(supabase, ['first_meal_logged'], epoch, today),
    fetchEventsInRange(supabase, ['trial_started'], epoch, today),
    fetchEventsInRange(supabase, ['subscription_started'], epoch, today),
  ])

  const cohort = await buildRetentionCohort(supabase, epoch, today)
  const [d1, d7] = calculateRetentionCurve(cohort, [1, 7], addDaysToDayKey)

  return calculateFunnel({
    accountCreated: countDistinctUsers(accountRows),
    onboardingCompleted: countDistinctUsers(onboardingRows),
    firstMealLogged: countDistinctUsers(firstMealRows),
    d1Active: d1!.activeCount,
    d7Active: d7!.activeCount,
    trialStarted: countDistinctUsers(trialRows),
    subscriptionStarted: countDistinctUsers(subRows),
  })
}

async function buildRetentionCohort(supabase: SupabaseClient, fromDayKey: string, toDayKey: string) {
  const [firstMealRows, succeededRows] = await Promise.all([
    fetchEventsInRange(supabase, ['first_meal_logged'], fromDayKey, toDayKey),
    fetchEventsInRange(supabase, ['meal_log_succeeded'], fromDayKey, toDayKey),
  ])

  const cohortDayByUser = new Map<string, string>()
  for (const row of firstMealRows) {
    if (row.user_id) cohortDayByUser.set(row.user_id, row.taipei_date)
  }

  const activeDaysByUser = new Map<string, Set<string>>()
  for (const row of succeededRows) {
    if (!row.user_id) continue
    const set = activeDaysByUser.get(row.user_id) ?? new Set<string>()
    set.add(row.taipei_date)
    activeDaysByUser.set(row.user_id, set)
  }

  return { cohortDayByUser, activeDaysByUser }
}

export async function getRetentionCurve(
  supabase: SupabaseClient,
  now = new Date()
): Promise<RetentionOffsetResult[]> {
  const today = dashboardDayKey(now)
  const epoch = '2000-01-01'
  const cohort = await buildRetentionCohort(supabase, epoch, today)
  return calculateRetentionCurve(cohort, [1, 3, 7], addDaysToDayKey)
}

export interface SubscriptionOverview {
  monthlyCount: number
  annualCount: number
  unknownCount: number
  mrrTwd: number
}

// Sourced from the single canonical pricing copy (src/lib/subscription-pricing.ts)
// rather than a separately-guessed number — NT$190/mo, NT$990/yr.
const MONTHLY_PRICE_TWD = 190
const ANNUAL_PRICE_TWD_PER_MONTH = 990 / 12

export async function getSubscriptionOverview(supabase: SupabaseClient): Promise<SubscriptionOverview> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('billing_period, status')
    .in('status', ['active', 'trialing'])

  if (error) {
    console.error('[founder-dashboard] getSubscriptionOverview failed', { message: error.message })
    return { monthlyCount: 0, annualCount: 0, unknownCount: 0, mrrTwd: 0 }
  }

  const rows = (data ?? []) as { billing_period: string | null; status: string }[]
  const monthlyCount = rows.filter(r => r.billing_period === 'monthly').length
  const annualCount = rows.filter(r => r.billing_period === 'annual').length
  const unknownCount = rows.length - monthlyCount - annualCount

  return {
    monthlyCount,
    annualCount,
    unknownCount,
    mrrTwd: monthlyCount * MONTHLY_PRICE_TWD + annualCount * ANNUAL_PRICE_TWD_PER_MONTH,
  }
}
