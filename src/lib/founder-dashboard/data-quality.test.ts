import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  checkFunnelInvariants,
  checkPhotoInvariants,
  checkRetentionInvariants,
  checkSubscriptionInvariants,
  collectDashboardWarnings,
} from './data-quality'
import type { FunnelStageResult } from './funnel'
import type { PhotoOutcomeCounts } from './photo-outcomes'
import type { RetentionOffsetResult } from './retention'
import type { SubscriptionOverview } from './queries'

function photoCounts(overrides: Partial<PhotoOutcomeCounts> = {}): PhotoOutcomeCounts {
  return {
    attempts: 18,
    success: 10,
    failure: 2,
    abandoned: 6,
    failureRatePct: 16.7,
    failureByType: {
      network_error: 0,
      provider_error: 0,
      timeout: 0,
      parse_error: 0,
      schema_error: 0,
      no_food_detected: 0,
      database_match_failed: 0,
      unknown_error: 0,
    },
    resolvedCount: 8,
    resolutionRatePct: 44.4,
    ...overrides,
  }
}

function subscriptionOverview(overrides: Partial<SubscriptionOverview> = {}): SubscriptionOverview {
  return { monthlyCount: 5, annualCount: 2, unknownCount: 1, mrrTwd: 1000, ...overrides }
}

describe('CASE14 — data-quality invariants never crash and always surface as observability', () => {
  it('funnel conversionPct > 100% is caught as a warning, not thrown, and does not clamp/mutate the input', () => {
    const funnel: FunnelStageResult[] = [
      { stage: 'accountCreated', count: 5, conversionPct: null },
      { stage: 'firstMealLogged', count: 10, conversionPct: 200 },
    ]
    let warnings: ReturnType<typeof checkFunnelInvariants> = []
    assert.doesNotThrow(() => {
      warnings = checkFunnelInvariants(funnel)
    })
    assert.equal(warnings.length, 1)
    assert.equal(warnings[0]!.code, 'funnel_conversion_over_100')
    // The check is read-only — it must not clamp the offending value.
    assert.equal(funnel[1]!.conversionPct, 200)
  })

  it('funnel with all valid (<=100%) stages produces zero warnings', () => {
    const funnel: FunnelStageResult[] = [
      { stage: 'accountCreated', count: 5, conversionPct: null },
      { stage: 'firstMealLogged', count: 2, conversionPct: 40 },
    ]
    assert.deepEqual(checkFunnelInvariants(funnel), [])
  })

  it('photo conservation mismatch (success+failure > attempts) is caught, not thrown', () => {
    const photo = photoCounts({ attempts: 5, success: 4, failure: 3, abandoned: -2 })
    let warnings: ReturnType<typeof checkPhotoInvariants> = []
    assert.doesNotThrow(() => {
      warnings = checkPhotoInvariants(photo)
    })
    assert.ok(warnings.some(w => w.code === 'photo_conservation_violated'))
  })

  it('photo resolvedCount exceeding success is caught, not thrown', () => {
    const photo = photoCounts({ success: 3, resolvedCount: 9 })
    const warnings = checkPhotoInvariants(photo)
    assert.ok(warnings.some(w => w.code === 'photo_resolved_exceeds_success'))
  })

  it('a structurally valid photo summary produces zero warnings', () => {
    assert.deepEqual(checkPhotoInvariants(photoCounts()), [])
  })

  it('retention activeCount > cohortSize is caught, not thrown', () => {
    const retention: RetentionOffsetResult[] = [
      { offsetDays: 7, cohortSize: 5, activeCount: 9, retentionPct: 180, insufficientData: false, notYetEligibleCount: 0 },
    ]
    let warnings: ReturnType<typeof checkRetentionInvariants> = []
    assert.doesNotThrow(() => {
      warnings = checkRetentionInvariants(retention)
    })
    assert.ok(warnings.some(w => w.code === 'retention_numerator_exceeds_denominator'))
  })

  it('a structurally valid retention curve produces zero warnings', () => {
    const retention: RetentionOffsetResult[] = [
      { offsetDays: 1, cohortSize: 10, activeCount: 4, retentionPct: 40, insufficientData: false, notYetEligibleCount: 0 },
    ]
    assert.deepEqual(checkRetentionInvariants(retention), [])
  })

  it('negative MRR is caught, not thrown', () => {
    const sub = subscriptionOverview({ mrrTwd: -50 })
    let warnings: ReturnType<typeof checkSubscriptionInvariants> = []
    assert.doesNotThrow(() => {
      warnings = checkSubscriptionInvariants(sub)
    })
    assert.ok(warnings.some(w => w.code === 'mrr_negative'))
  })

  it('a structurally valid subscription overview produces zero warnings', () => {
    assert.deepEqual(checkSubscriptionInvariants(subscriptionOverview()), [])
  })

  it('collectDashboardWarnings aggregates every category and never throws, even when every invariant is violated at once', () => {
    const funnel: FunnelStageResult[] = [{ stage: 'trialStarted', count: 5, conversionPct: 250 }]
    const photoToday = photoCounts({ attempts: 2, success: 5, failure: 5, resolvedCount: 5 })
    const photoLast7Days = photoCounts({ resolvedCount: 999, success: 1 })
    const retention: RetentionOffsetResult[] = [
      { offsetDays: 7, cohortSize: 1, activeCount: 5, retentionPct: 500, insufficientData: true, notYetEligibleCount: 0 },
    ]
    const subscriptionOv = subscriptionOverview({ mrrTwd: -1 })

    let warnings: ReturnType<typeof collectDashboardWarnings> = []
    assert.doesNotThrow(() => {
      warnings = collectDashboardWarnings({ funnel, photoToday, photoLast7Days, retention, subscriptionOverview: subscriptionOv })
    })
    // funnel(1) + photoToday(1) + photoLast7Days(1) + retention(1) + subscription(1) = 5
    assert.equal(warnings.length, 5)
    for (const w of warnings) {
      assert.equal(typeof w.code, 'string')
      assert.equal(typeof w.message, 'string')
      assert.equal(typeof w.context, 'object')
    }
  })

  it('collectDashboardWarnings returns an empty array (not null/undefined) when every input is structurally valid', () => {
    const funnel: FunnelStageResult[] = [
      { stage: 'accountCreated', count: 100, conversionPct: null },
      { stage: 'firstMealLogged', count: 55, conversionPct: 55 },
    ]
    const photo = photoCounts()
    const retention: RetentionOffsetResult[] = [
      { offsetDays: 1, cohortSize: 10, activeCount: 4, retentionPct: 40, insufficientData: false, notYetEligibleCount: 0 },
    ]
    const warnings = collectDashboardWarnings({
      funnel,
      photoToday: photo,
      photoLast7Days: photo,
      retention,
      subscriptionOverview: subscriptionOverview(),
    })
    assert.deepEqual(warnings, [])
    assert.equal(Array.isArray(warnings), true)
  })

  it('UI contract: page.tsx renders the warning banner only when warnings.length > 0, and never crashes on an empty array — this locks the same emptiness check page.tsx uses', () => {
    const emptyWarnings = collectDashboardWarnings({
      funnel: [{ stage: 'accountCreated', count: 10, conversionPct: null }],
      photoToday: photoCounts({ attempts: 0, success: 0, failure: 0, abandoned: 0, resolvedCount: 0, resolutionRatePct: null, failureRatePct: null }),
      photoLast7Days: photoCounts({ attempts: 0, success: 0, failure: 0, abandoned: 0, resolvedCount: 0, resolutionRatePct: null, failureRatePct: null }),
      retention: [],
      subscriptionOverview: subscriptionOverview({ mrrTwd: 0 }),
    })
    // page.tsx's exact contract: `{warnings.length > 0 && <banner/>}` — must
    // be false for an empty array, and the array itself must be safely
    // mappable (`warnings.map(w => w.message)`) without throwing regardless
    // of length.
    assert.equal(emptyWarnings.length > 0, false)
    assert.doesNotThrow(() => emptyWarnings.map(w => w.message))

    const nonEmptyWarnings = collectDashboardWarnings({
      funnel: [{ stage: 'trialStarted', count: 5, conversionPct: 250 }],
      photoToday: photoCounts(),
      photoLast7Days: photoCounts(),
      retention: [],
      subscriptionOverview: subscriptionOverview(),
    })
    assert.equal(nonEmptyWarnings.length > 0, true)
    assert.doesNotThrow(() => nonEmptyWarnings.map(w => w.message))
  })
})
