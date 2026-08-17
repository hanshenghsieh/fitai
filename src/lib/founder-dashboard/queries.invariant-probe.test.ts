import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getFunnelCounts,
  getRetentionCurve,
  getTodaySnapshot,
  getLast7DaysSnapshot,
  getSubscriptionOverview,
} from './queries'

/**
 * Deterministic invariant probe — exercises the real I/O layer (queries.ts)
 * against a fake Supabase client, not just the pure calculation modules.
 * This is what actually proves the fix end-to-end: funnel.ts/retention.ts
 * being individually correct doesn't guarantee queries.ts wires the right
 * rows into them, which is exactly the class of bug the original production
 * report surfaced (correct-looking formulas fed non-cohort-intersected data).
 */

interface FakeEventRow {
  event_name: string
  user_id: string | null
  taipei_date: string
  properties: Record<string, unknown> | null
}

interface FakeSubscriptionRow {
  billing_period: string | null
  status: string
}

function createFakeSupabase(tables: {
  analytics_events: FakeEventRow[]
  subscriptions: FakeSubscriptionRow[]
}): SupabaseClient {
  const fake = {
    from(table: 'analytics_events' | 'subscriptions') {
      const rows: Record<string, unknown>[] = tables[table] as unknown as Record<string, unknown>[]
      const state: {
        inField?: string
        inValues?: string[]
        gteField?: string
        gteValue?: string
        lteField?: string
        lteValue?: string
      } = {}
      const builder = {
        select() {
          return builder
        },
        in(field: string, values: string[]) {
          state.inField = field
          state.inValues = values
          return builder
        },
        gte(field: string, value: string) {
          state.gteField = field
          state.gteValue = value
          return builder
        },
        lte(field: string, value: string) {
          state.lteField = field
          state.lteValue = value
          return builder
        },
        then(resolve: (result: { data: Record<string, unknown>[]; error: null }) => void) {
          let result = rows
          if (state.inField && state.inValues) {
            const values = state.inValues
            const field = state.inField
            result = result.filter(r => values.includes(r[field] as string))
          }
          if (state.gteField && state.gteValue) {
            const value = state.gteValue
            const field = state.gteField
            result = result.filter(r => (r[field] as string) >= value)
          }
          if (state.lteField && state.lteValue) {
            const value = state.lteValue
            const field = state.lteField
            result = result.filter(r => (r[field] as string) <= value)
          }
          resolve({ data: result, error: null })
        },
      }
      return builder
    },
  }
  return fake as unknown as SupabaseClient
}

// Fixed "now" so the probe is fully deterministic regardless of wall-clock
// date. Asia/Taipei 2026-08-17 12:00 -> dashboard day key '2026-08-17'.
const NOW = new Date('2026-08-17T12:00:00+08:00')

// 5 accounts created well in the past (2026-08-01) so D1/D3/D7 retention
// windows have all already elapsed by NOW.
const accountEvents: FakeEventRow[] = [1, 2, 3, 4, 5].map(i => ({
  event_name: 'account_created',
  user_id: `user-${i}`,
  taipei_date: '2026-08-01',
  properties: null,
}))

// Only user-1 completed onboarding -> reproduces the reported 5 -> 1 (20%).
const onboardingEvents: FakeEventRow[] = [
  { event_name: 'onboarding_completed', user_id: 'user-1', taipei_date: '2026-08-01', properties: null },
]

// user-1 and user-2 logged a first meal -> reproduces the reported 5 -> 2
// (must be 40%, not the 200% bug from dividing by onboardingCompleted=1).
const firstMealEvents: FakeEventRow[] = [
  { event_name: 'first_meal_logged', user_id: 'user-1', taipei_date: '2026-08-02', properties: null },
  { event_name: 'first_meal_logged', user_id: 'user-2', taipei_date: '2026-08-05', properties: null },
]

// All 5 cohort users started a trial, PLUS one legacy/non-cohort user
// (user-9, never fired account_created in this dataset) -> reproduces the
// reported 5 -> 5 (must be 100%, not 250%), and proves the legacy user does
// not leak into the cohort funnel numerator (invariant 2 / CASE4).
const trialEvents: FakeEventRow[] = [
  ...[1, 2, 3, 4, 5].map(i => ({ event_name: 'trial_started', user_id: `user-${i}`, taipei_date: '2026-08-01', properties: null })),
  { event_name: 'trial_started', user_id: 'user-9', taipei_date: '2026-08-10', properties: null },
]

// user-1 fires subscription_started TWICE (simulating the confirmed Stripe
// dual-webhook / Apple IAP dual-path double-fire), plus user-3 once, plus
// non-cohort user-9 once. Distinct-user-in-cohort count must be 2
// (user-1, user-3), not 3 raw rows and not 4 total rows.
const subscriptionEvents: FakeEventRow[] = [
  { event_name: 'subscription_started', user_id: 'user-1', taipei_date: '2026-08-16', properties: null },
  { event_name: 'subscription_started', user_id: 'user-1', taipei_date: '2026-08-16', properties: null },
  { event_name: 'subscription_started', user_id: 'user-3', taipei_date: '2026-08-17', properties: null },
  { event_name: 'subscription_started', user_id: 'user-9', taipei_date: '2026-08-17', properties: null },
]

// Photo pipeline events for the "today" (2026-08-17) snapshot: 6 attempts,
// 3 succeeded (2 official, 1 unknown-nutrition), 1 failed -> 2 abandoned.
const photoEventsToday: FakeEventRow[] = [
  ...Array(6).fill(0).map((_, i) => ({
    event_name: 'meal_log_started',
    user_id: `photo-user-${i}`,
    taipei_date: '2026-08-17',
    properties: { source: 'photo' },
  })),
  { event_name: 'meal_log_succeeded', user_id: 'photo-user-0', taipei_date: '2026-08-17', properties: { source: 'photo', nutrition_status: 'official' } },
  { event_name: 'meal_log_succeeded', user_id: 'photo-user-1', taipei_date: '2026-08-17', properties: { source: 'photo', nutrition_status: 'estimated' } },
  { event_name: 'meal_log_succeeded', user_id: 'photo-user-2', taipei_date: '2026-08-17', properties: { source: 'photo', nutrition_status: 'unknown' } },
  { event_name: 'meal_log_failed', user_id: 'photo-user-3', taipei_date: '2026-08-17', properties: { source: 'photo', failure_type: 'timeout' } },
]

const subscriptionRows: FakeSubscriptionRow[] = [
  { billing_period: 'monthly', status: 'active' },
  { billing_period: 'monthly', status: 'active' },
  { billing_period: 'annual', status: 'trialing' },
  { billing_period: 'unknown', status: 'active' },
  { billing_period: 'unknown', status: 'active' },
  { billing_period: 'unknown', status: 'active' },
  { billing_period: 'monthly', status: 'canceled' }, // must be excluded by the status filter entirely
]

const supabase = createFakeSupabase({
  analytics_events: [
    ...accountEvents,
    ...onboardingEvents,
    ...firstMealEvents,
    ...trialEvents,
    ...subscriptionEvents,
    ...photoEventsToday,
  ],
  subscriptions: subscriptionRows,
})

// A dedicated, isolated dataset for invariant 9 (timezone boundary) so its
// account_created rows can't leak into the funnel cohort tested above. One
// event at 2026-08-16 23:59 Taipei (must land on 08-16, outside
// "today"=08-17) and one at 2026-08-17 00:01 Taipei (must land on 08-17,
// inside "today"). taipei_date is precomputed at write time in the real
// system (see day-key.ts / getTaipeiDateKey) — this probe supplies it
// directly, matching how the real column is written.
const boundarySupabase = createFakeSupabase({
  analytics_events: [
    { event_name: 'account_created', user_id: 'boundary-user-late-prev-day', taipei_date: '2026-08-16', properties: null },
    { event_name: 'account_created', user_id: 'boundary-user-early-today', taipei_date: '2026-08-17', properties: null },
  ],
  subscriptions: [],
})

describe('Deterministic invariant probe — real queries.ts I/O layer', () => {
  it('invariant 1+2+3(funnel): every stage denominator is the accountCreated cohort, cohort-intersected, and reproduces the exact previously-reported bug numbers as correct percentages', async () => {
    const { stages, trialToPaidPct } = await getFunnelCounts(supabase, NOW)
    const byStage = Object.fromEntries(stages.map(s => [s.stage, s]))

    assert.equal(byStage.accountCreated!.count, 5)
    assert.equal(byStage.accountCreated!.conversionPct, null)

    assert.equal(byStage.onboardingCompleted!.count, 1)
    assert.equal(byStage.onboardingCompleted!.conversionPct, 20)

    // The exact previously-reported production bug: 2 first-meal-loggers
    // against 5 accounts must read 40%, never 200% (dividing by
    // onboardingCompleted=1 was the root cause).
    assert.equal(byStage.firstMealLogged!.count, 2)
    assert.equal(byStage.firstMealLogged!.conversionPct, 40)

    // The exact previously-reported production bug: 5 trial starts against
    // 5 accounts must read 100%, never 250% (dividing by
    // firstMealLogged=2 was the root cause) — and the legacy non-cohort
    // user-9 trial must not have leaked into the numerator.
    assert.equal(byStage.trialStarted!.count, 5)
    assert.equal(byStage.trialStarted!.conversionPct, 100)

    // subscription_started: user-1 (deduped from 2 rows) + user-3 = 2
    // in-cohort distinct users; user-9 excluded (not in accountCreated cohort).
    assert.equal(byStage.subscriptionStarted!.count, 2)
    assert.equal(byStage.subscriptionStarted!.conversionPct, 40)

    for (const stage of stages) {
      if (stage.conversionPct != null) {
        assert.ok(stage.conversionPct <= 100, `${stage.stage} conversionPct ${stage.conversionPct} exceeds 100%`)
      }
    }

    // invariant 7: Trial -> Paid = subInCohort(2) / trialInCohort(5) = 40%.
    assert.equal(trialToPaidPct, 40)
  })

  it('invariant 3(retention): D1/D3/D7 denominators only include cohort members old enough to be eligible', async () => {
    const retention = await getRetentionCurve(supabase, NOW)
    const byOffset = Object.fromEntries(retention.map(r => [r.offsetDays, r]))

    // Cohort = users with first_meal_logged: user-1 (day0 2026-08-02),
    // user-2 (day0 2026-08-05). Both day0+7 (08-09, 08-12) are <= NOW's day
    // key (08-17), so both are eligible for D1/D3/D7 -> cohortSize 2 at
    // every offset, nobody excluded as "not yet eligible".
    assert.equal(byOffset[1]!.cohortSize, 2)
    assert.equal(byOffset[1]!.notYetEligibleCount, 0)
    assert.equal(byOffset[3]!.cohortSize, 2)
    assert.equal(byOffset[7]!.cohortSize, 2)

    for (const r of retention) {
      assert.ok(r.activeCount <= r.cohortSize, `offset ${r.offsetDays}: activeCount ${r.activeCount} exceeds cohortSize ${r.cohortSize}`)
    }
  })

  it('invariant 3b(retention): a cohort member not yet old enough for D7 is excluded from the denominator, not counted as churn', async () => {
    const youngCohortSupabase = createFakeSupabase({
      analytics_events: [
        { event_name: 'first_meal_logged', user_id: 'brand-new-user', taipei_date: '2026-08-15', properties: null },
      ],
      subscriptions: [],
    })
    // NOW is 2026-08-17 — day0(08-15) + 7 = 08-22, still in the future.
    const retention = await getRetentionCurve(youngCohortSupabase, NOW)
    const d7 = retention.find(r => r.offsetDays === 7)!
    assert.equal(d7.cohortSize, 0)
    assert.equal(d7.notYetEligibleCount, 1)
    assert.equal(d7.retentionPct, null)
  })

  it('invariant 4+5(photo): attempts = success + failure + abandoned, and unknown nutrition_status is excluded from resolvedCount', async () => {
    const today = await getTodaySnapshot(supabase, NOW)
    assert.equal(today.photo.attempts, 6)
    assert.equal(today.photo.success, 3)
    assert.equal(today.photo.failure, 1)
    assert.equal(today.photo.abandoned, 2)
    assert.equal(today.photo.success + today.photo.failure + today.photo.abandoned, today.photo.attempts)

    // 2 of the 3 successes resolved real nutrition data (official +
    // estimated); the 'unknown' one must not count.
    assert.equal(today.photo.resolvedCount, 2)
    assert.equal(today.photo.resolutionRatePct, Math.round((2 / 6) * 1000) / 10)
  })

  it('invariant 6(subscription): subscriptionsStarted on the daily snapshot is a distinct-user count, not a raw event-row count', async () => {
    const last7Days = await getLast7DaysSnapshot(supabase, NOW)
    // Raw rows in the 7-day window: user-1 x2, user-3 x1, user-9 x1 = 4 rows.
    // Distinct users: user-1, user-3, user-9 = 3.
    assert.equal(last7Days.subscriptionsStarted, 3)
    assert.notEqual(last7Days.subscriptionsStarted, 4, 'must not be the raw row count, which double-counts the duplicate-fired user-1 event')
  })

  it('invariant 8(MRR): unknown/legacy billing_period rows contribute zero to MRR, and canceled subscriptions are excluded entirely', async () => {
    const overview = await getSubscriptionOverview(supabase)
    assert.equal(overview.monthlyCount, 2) // 2 active monthly rows; the canceled monthly row is excluded by the status filter
    assert.equal(overview.annualCount, 1)
    assert.equal(overview.unknownCount, 3)
    const expectedMrr = 2 * 190 + 1 * (990 / 12)
    assert.equal(overview.mrrTwd, expectedMrr)
    assert.ok(overview.mrrTwd >= 0)
  })

  it('invariant 9(timezone): taipei_date day-boundary rows land in the correct day\'s snapshot, not merged across the boundary', async () => {
    const today = await getTodaySnapshot(boundarySupabase, NOW) // dashboard day key '2026-08-17'
    assert.equal(today.signups, 1, 'only boundary-user-early-today (taipei_date 08-17) should count as a signup in today\'s snapshot')

    const yesterdaySnapshot = await getTodaySnapshot(boundarySupabase, new Date('2026-08-16T12:00:00+08:00'))
    assert.equal(yesterdaySnapshot.signups, 1, 'only boundary-user-late-prev-day (taipei_date 08-16) should count as a signup in the previous day\'s snapshot')
  })
})
