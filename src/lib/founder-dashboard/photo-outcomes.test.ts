import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { summarizePhotoOutcomes, mostCommonFailureType, type PhotoOutcomeEventRow } from './photo-outcomes'

describe('Phase 2 TASK 1/6 — photo outcome aggregation', () => {
  it('answers "how many photo attempts today, how many succeeded, how many failed, failure rate"', () => {
    const rows: PhotoOutcomeEventRow[] = [
      ...Array(100).fill(0).map(() => ({ eventName: 'meal_log_started' as const, source: 'photo' })),
      ...Array(80).fill(0).map(() => ({ eventName: 'meal_log_succeeded' as const, source: 'photo' })),
      ...Array(20).fill(0).map(
        (): PhotoOutcomeEventRow => ({ eventName: 'meal_log_failed', source: 'photo', failureType: 'provider_error' })
      ),
    ]
    const summary = summarizePhotoOutcomes(rows)
    assert.equal(summary.attempts, 100)
    assert.equal(summary.success, 80)
    assert.equal(summary.failure, 20)
    assert.equal(summary.failureRatePct, 20)
  })

  it('ignores non-photo source rows entirely', () => {
    const rows: PhotoOutcomeEventRow[] = [
      { eventName: 'meal_log_started', source: 'manual' },
      { eventName: 'meal_log_succeeded', source: 'manual' },
      { eventName: 'meal_log_started', source: 'photo' },
      { eventName: 'meal_log_succeeded', source: 'photo' },
    ]
    const summary = summarizePhotoOutcomes(rows)
    assert.equal(summary.attempts, 1)
    assert.equal(summary.success, 1)
  })

  it('failureRatePct is null (not NaN/Infinity/0) when there is no data at all', () => {
    const summary = summarizePhotoOutcomes([])
    assert.equal(summary.failureRatePct, null)
  })

  it('mostCommonFailureType picks the highest-count category', () => {
    const rows: PhotoOutcomeEventRow[] = [
      { eventName: 'meal_log_failed', source: 'photo', failureType: 'timeout' },
      { eventName: 'meal_log_failed', source: 'photo', failureType: 'provider_error' },
      { eventName: 'meal_log_failed', source: 'photo', failureType: 'provider_error' },
      { eventName: 'meal_log_failed', source: 'photo', failureType: 'provider_error' },
    ]
    const summary = summarizePhotoOutcomes(rows)
    assert.equal(mostCommonFailureType(summary), 'provider_error')
  })

  it('mostCommonFailureType is null when there are no failures', () => {
    const summary = summarizePhotoOutcomes([{ eventName: 'meal_log_succeeded', source: 'photo' }])
    assert.equal(mostCommonFailureType(summary), null)
  })

  it('CASE7: attempts=18, success=10, failure=2 -> abandoned=6, and attempts = success + failure + abandoned', () => {
    const rows: PhotoOutcomeEventRow[] = [
      ...Array(18).fill(0).map(() => ({ eventName: 'meal_log_started' as const, source: 'photo' })),
      ...Array(10).fill(0).map(() => ({ eventName: 'meal_log_succeeded' as const, source: 'photo', nutritionStatus: 'official' })),
      ...Array(2).fill(0).map((): PhotoOutcomeEventRow => ({ eventName: 'meal_log_failed', source: 'photo', failureType: 'timeout' })),
    ]
    const summary = summarizePhotoOutcomes(rows)
    assert.equal(summary.attempts, 18)
    assert.equal(summary.success, 10)
    assert.equal(summary.failure, 2)
    assert.equal(summary.abandoned, 6)
    assert.equal(summary.success + summary.failure + summary.abandoned, summary.attempts)
  })

  it('CASE8: a photo-only/unknown nutrition result is not counted as a resolved nutrition success', () => {
    const rows: PhotoOutcomeEventRow[] = [
      { eventName: 'meal_log_started', source: 'photo' },
      { eventName: 'meal_log_succeeded', source: 'photo', nutritionStatus: 'unknown' },
    ]
    const summary = summarizePhotoOutcomes(rows)
    // The log was still saved (success=1), but it did not resolve real
    // nutrition data, so it must not count toward resolvedCount.
    assert.equal(summary.success, 1)
    assert.equal(summary.resolvedCount, 0)
    assert.equal(summary.resolutionRatePct, 0)
  })

  it('CASE9: a confirmed AI estimate counts as a resolved photo result', () => {
    const rows: PhotoOutcomeEventRow[] = [
      { eventName: 'meal_log_started', source: 'photo' },
      { eventName: 'meal_log_started', source: 'photo' },
      { eventName: 'meal_log_succeeded', source: 'photo', nutritionStatus: 'official' },
      { eventName: 'meal_log_succeeded', source: 'photo', nutritionStatus: 'estimated' },
    ]
    const summary = summarizePhotoOutcomes(rows)
    assert.equal(summary.success, 2)
    assert.equal(summary.resolvedCount, 2)
    assert.equal(summary.resolutionRatePct, 100)
  })

  it('resolutionRatePct is null (not NaN/Infinity) when there are no attempts at all', () => {
    const summary = summarizePhotoOutcomes([])
    assert.equal(summary.resolutionRatePct, null)
  })
})
