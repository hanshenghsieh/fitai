import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  activationRateAlert,
  retentionAlert,
  photoResolutionRateAlert,
  photoFailureRateAlert,
  trialToPaidAlert,
  errorCountAlert,
  mostCommonFailureTypeAlert,
  dataQualityAlert,
} from './kpi-alerts'
import type { RetentionOffsetResult } from './retention'

function retention(overrides: Partial<RetentionOffsetResult> = {}): RetentionOffsetResult {
  return {
    offsetDays: 1,
    cohortSize: 20,
    activeCount: 5,
    retentionPct: 25,
    insufficientData: false,
    notYetEligibleCount: 0,
    ...overrides,
  }
}

describe('Founder Attention System — kpi-alerts', () => {
  it('CASE1: Activation 29.9% -> danger', () => {
    assert.equal(activationRateAlert({ conversionPct: 29.9 }), 'danger')
  })

  it('CASE2: Activation 30% -> normal', () => {
    assert.equal(activationRateAlert({ conversionPct: 30 }), 'normal')
  })

  it('CASE3: D1 24.9% -> danger, D1 25% -> normal', () => {
    assert.equal(retentionAlert(retention({ retentionPct: 24.9 }), 25), 'danger')
    assert.equal(retentionAlert(retention({ retentionPct: 25 }), 25), 'normal')
  })

  it('CASE4: D7 9.9% -> danger, D7 10% -> normal', () => {
    assert.equal(retentionAlert(retention({ offsetDays: 7, retentionPct: 9.9 }), 10), 'danger')
    assert.equal(retentionAlert(retention({ offsetDays: 7, retentionPct: 10 }), 10), 'normal')
  })

  it('CASE5: Photo resolution 79.9% -> danger, 80% -> normal', () => {
    assert.equal(photoResolutionRateAlert({ attempts: 10, resolutionRatePct: 79.9 }), 'danger')
    assert.equal(photoResolutionRateAlert({ attempts: 10, resolutionRatePct: 80 }), 'normal')
  })

  it('CASE6: Photo failure 10% -> normal, 10.1% -> danger', () => {
    assert.equal(photoFailureRateAlert({ failureRatePct: 10 }), 'normal')
    assert.equal(photoFailureRateAlert({ failureRatePct: 10.1 }), 'danger')
  })

  it('CASE7: Trial->Paid 4.9% -> danger, 5% -> normal', () => {
    assert.equal(trialToPaidAlert(4.9), 'danger')
    assert.equal(trialToPaidAlert(5), 'normal')
  })

  it('CASE8: attempts=0 -> insufficient_data, never danger', () => {
    const level = photoResolutionRateAlert({ attempts: 0, resolutionRatePct: null })
    assert.equal(level, 'insufficient_data')
    assert.notEqual(level, 'danger')
  })

  it('CASE9: trial denominator=0 (trialToPaidPct null) -> insufficient_data, never danger', () => {
    const level = trialToPaidAlert(null)
    assert.equal(level, 'insufficient_data')
    assert.notEqual(level, 'danger')
  })

  it('CASE10: retention insufficient data -> insufficient_data, never danger, even with a technically-high raw pct', () => {
    // Mirrors retention.test.ts's own case: a 1-user cohort hitting 100% is
    // still insufficientData=true — must never render as a green "100%"
    // nor (more importantly for this system) ever as danger either.
    const level = retentionAlert(retention({ cohortSize: 1, activeCount: 1, retentionPct: 100, insufficientData: true }), 25)
    assert.equal(level, 'insufficient_data')
    assert.notEqual(level, 'danger')
  })

  it('CASE10b: a cohort where every member is not-yet-eligible (cohortSize 0) is insufficient_data, not danger', () => {
    const level = retentionAlert(
      retention({ offsetDays: 7, cohortSize: 0, activeCount: 0, retentionPct: null, insufficientData: true, notYetEligibleCount: 3 }),
      10
    )
    assert.equal(level, 'insufficient_data')
  })

  it('D3 (no threshold defined) stays normal whenever data is valid, regardless of the value', () => {
    assert.equal(retentionAlert(retention({ offsetDays: 3, retentionPct: 1 }), null), 'normal')
    assert.equal(retentionAlert(retention({ offsetDays: 3, retentionPct: 99 }), null), 'normal')
  })

  it('CASE11: system error count 1 -> danger, 0 -> normal', () => {
    assert.equal(errorCountAlert(1), 'danger')
    assert.equal(errorCountAlert(0), 'normal')
  })

  it('CASE12: undefined/null percentage must never be coerced into a 0%-triggered danger', () => {
    // Activation: missing stage entirely (e.g. array lookup miss) must not
    // fall through to `0 < 30 -> danger`.
    assert.equal(activationRateAlert(undefined), 'insufficient_data')
    assert.equal(activationRateAlert({ conversionPct: null }), 'insufficient_data')
    // Photo failure rate: null (no attempts) must not become `null || 0`.
    assert.equal(photoFailureRateAlert({ failureRatePct: null }), 'insufficient_data')
    // Trial->Paid: null must not become `null || 0` -> `0 < 5 -> danger`.
    assert.equal(trialToPaidAlert(null), 'insufficient_data')
  })

  it('mostCommonFailureType: failure count 0 -> insufficient_data ("—"), never danger', () => {
    assert.equal(mostCommonFailureTypeAlert(0), 'insufficient_data')
  })

  it('mostCommonFailureType: failure count > 0 -> danger', () => {
    assert.equal(mostCommonFailureTypeAlert(1), 'danger')
    assert.equal(mostCommonFailureTypeAlert(5), 'danger')
  })

  it('dataQualityAlert: any invariant warning -> danger; zero warnings -> normal', () => {
    assert.equal(dataQualityAlert(1), 'danger')
    assert.equal(dataQualityAlert(3), 'danger')
    assert.equal(dataQualityAlert(0), 'normal')
  })
})
