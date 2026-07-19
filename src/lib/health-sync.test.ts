import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  canQueryHealthData,
  classifyHealthKitError,
  localDayRange,
  recentWorkoutRange,
} from './health-sync'

describe('HealthKit TypeScript layer', () => {
  it('distinguishes authorization denial from native failures', () => {
    assert.equal(classifyHealthKitError({ code: 'AUTHORIZATION_DENIED' }), 'denied')
    assert.equal(classifyHealthKitError({ code: 'HEALTHKIT_UNAVAILABLE' }), 'unavailable')
    assert.equal(classifyHealthKitError({ code: 'QUERY_FAILED' }), 'nativeFailure')
    assert.equal(classifyHealthKitError(new Error('unexpected')), 'unknown')
  })

  it('only queries after HealthKit says no request is needed', () => {
    assert.equal(canQueryHealthData({
      available: true,
      requestStatus: 'unnecessary',
      readAuthorizationIsPrivate: true,
    }), true)
    assert.equal(canQueryHealthData({
      available: true,
      requestStatus: 'should_request',
      readAuthorizationIsPrivate: true,
    }), false)
  })

  it('creates a local-day query range ending at the supplied time', () => {
    const now = new Date(2026, 6, 19, 12, 30)
    const range = localDayRange(now)
    const start = new Date(range.startDate)
    const end = new Date(range.endDate)
    assert.equal(start.getHours(), 0)
    assert.equal(start.getMinutes(), 0)
    assert.equal(end.getTime(), now.getTime())
  })

  it('creates a bounded recent-workout range', () => {
    const now = new Date('2026-07-19T04:00:00.000Z')
    const range = recentWorkoutRange(now, 14)
    assert.equal(new Date(range.endDate).getTime(), now.getTime())
    assert.equal(
      new Date(range.endDate).getTime() - new Date(range.startDate).getTime(),
      14 * 24 * 60 * 60 * 1000
    )
  })
})
