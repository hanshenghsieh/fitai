import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  canQueryHealthData,
  classifyHealthKitError,
  localDayRange,
  recentWorkoutRange,
  startOfDayInTimeZone,
} from './health-sync'

describe('HealthKit TypeScript layer', () => {
  it('distinguishes authorization denial from native failures', () => {
    assert.equal(classifyHealthKitError({ code: 'AUTHORIZATION_DENIED' }), 'denied')
    assert.equal(classifyHealthKitError({ code: 'HEALTHKIT_UNAVAILABLE' }), 'unavailable')
    assert.equal(classifyHealthKitError({ code: 'HEALTHKIT_INVALID_START_DATE' }), 'invalidDateRange')
    assert.equal(classifyHealthKitError({ code: 'HEALTHKIT_INVALID_END_DATE' }), 'invalidDateRange')
    assert.equal(classifyHealthKitError({ code: 'HEALTHKIT_START_AFTER_END' }), 'invalidDateRange')
    assert.equal(classifyHealthKitError({ code: 'HEALTHKIT_RANGE_TOO_LARGE' }), 'invalidDateRange')
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

  it('creates an Asia/Taipei local-day UTC range ending at the supplied time', () => {
    const now = new Date('2026-07-19T16:30:00.000Z')
    const range = localDayRange(now, 'Asia/Taipei')
    const start = new Date(range.startDate)
    const end = new Date(range.endDate)
    assert.equal(start.toISOString(), '2026-07-19T16:00:00.000Z')
    assert.ok(start < end)
    assert.equal(end.getTime(), now.getTime())
    assert.equal(range.timeZone, 'Asia/Taipei')
  })

  it('does not reverse the range when local midnight crosses the UTC date', () => {
    const now = new Date('2026-07-20T00:15:00.000Z')
    const start = startOfDayInTimeZone(now, 'America/Los_Angeles')
    assert.equal(start.toISOString(), '2026-07-19T07:00:00.000Z')
    assert.ok(start < now)
  })

  it('adds a minimal safe interval when now equals local start of day', () => {
    const now = new Date('2026-07-19T16:00:00.000Z')
    const range = localDayRange(now, 'Asia/Taipei')
    assert.equal(
      new Date(range.endDate).getTime() - new Date(range.startDate).getTime(),
      1
    )
  })

  it('creates a bounded recent-workout range', () => {
    const now = new Date('2026-07-19T04:00:00.000Z')
    const range = recentWorkoutRange(now, 14, 'Asia/Taipei')
    assert.equal(new Date(range.endDate).getTime(), now.getTime())
    assert.equal(
      new Date(range.endDate).getTime() - new Date(range.startDate).getTime(),
      14 * 24 * 60 * 60 * 1000
    )
  })

  it('uses strict ISO bridge parsing, structured errors, and latest body samples', () => {
    const native = readFileSync(
      new URL('../../ios/App/App/NativeIntegrationsPlugins.swift', import.meta.url),
      'utf8'
    )
    assert.match(native, /\.withInternetDateTime, \.withFractionalSeconds/)
    assert.match(native, /HEALTHKIT_INVALID_START_DATE/)
    assert.match(native, /HEALTHKIT_INVALID_END_DATE/)
    assert.match(native, /HEALTHKIT_START_AFTER_END/)
    assert.match(native, /HEALTHKIT_RANGE_TOO_LARGE/)
    const parseDate = native.slice(
      native.indexOf('private static func parseDate'),
      native.indexOf('private static func isoDate')
    )
    assert.doesNotMatch(parseDate, /let \w+ = DateFormatter\(|yyyy-MM-dd/)
    assert.match(
      native,
      /getLatestBodyMetrics[\s\S]*HKSampleSortIdentifierEndDate[\s\S]*limit: 1/
    )
  })

  it('isolates query failures, recalculates refresh ranges, and blocks web native queries', () => {
    const view = readFileSync(
      new URL(
        '../components/betterbit-v2/settings/subpages/HealthSettingsView.tsx',
        import.meta.url
      ),
      'utf8'
    )
    assert.match(view, /const now = new Date\(\)/)
    assert.match(view, /Promise\.allSettled/)
    assert.match(view, /results\[0\]\.status === 'fulfilled'[\s\S]*setBodyMetrics/)
    assert.match(view, /results\[1\]\.status === 'fulfilled'[\s\S]*setActivity/)
    assert.match(view, /results\[2\]\.status === 'fulfilled'[\s\S]*setWorkouts/)
    assert.match(view, /queryErrors\.bodyMeasurements/)
    assert.match(view, /queryErrors\.todayActivity/)
    assert.match(view, /queryErrors\.workouts/)
    assert.match(view, /尚無資料/)
    assert.match(view, /if \(!isNativeIOS\(\)\)/)
  })

  it('never creates local midnight from a bare YYYY-MM-DD string or logs health values', () => {
    const health = readFileSync(new URL('./health-sync.ts', import.meta.url), 'utf8')
    assert.doesNotMatch(health, /new Date\(['"`]\d{4}-\d{2}-\d{2}['"`]\)/)
    const diagnosticStart = health.indexOf('export function logHealthKitQueryRange')
    const diagnosticEnd = health.indexOf('export function clearLegacyHealthStorage')
    const diagnostics = health.slice(diagnosticStart, diagnosticEnd)
    assert.doesNotMatch(
      diagnostics,
      /\b(?:weight|bodyFat|steps|activeEnergy|workouts?)\b\s*:/
    )
  })
})
