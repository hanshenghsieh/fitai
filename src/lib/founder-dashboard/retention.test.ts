import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calculateRetentionCurve, calculateRetentionForOffset, formatRetentionResult, MIN_RETENTION_COHORT_SIZE } from './retention'
import { addDaysToDayKey } from './day-key'

const DAY0 = '2026-07-01'
// Far enough past DAY0 that D1/D3/D7 have all already happened for a
// DAY0-cohort user, unless a test deliberately picks an earlier asOf.
const FAR_FUTURE_ASOF = '2026-12-31'

function tenUserCohort() {
  const cohortDayByUser = new Map<string, string>()
  for (let i = 1; i <= 10; i++) cohortDayByUser.set(`user-${i}`, DAY0)
  return cohortDayByUser
}

describe('Phase 3 — retention calculation', () => {
  it('10 users Day0, 4 active Day1, 2 active Day7 -> D1 = 40%, D7 = 20%', () => {
    const cohortDayByUser = tenUserCohort()
    const activeDaysByUser = new Map<string, Set<string>>()

    const day1 = addDaysToDayKey(DAY0, 1)
    const day7 = addDaysToDayKey(DAY0, 7)

    // 4 users active on Day1 (users 1-4)
    for (let i = 1; i <= 4; i++) {
      activeDaysByUser.set(`user-${i}`, new Set([day1]))
    }
    // 2 of those (users 1-2) are also active on Day7
    activeDaysByUser.get('user-1')!.add(day7)
    activeDaysByUser.get('user-2')!.add(day7)

    const [d1, d7] = calculateRetentionCurve(
      { cohortDayByUser, activeDaysByUser },
      [1, 7],
      addDaysToDayKey,
      FAR_FUTURE_ASOF
    )

    assert.equal(d1!.cohortSize, 10)
    assert.equal(d1!.activeCount, 4)
    assert.equal(d1!.retentionPct, 40)
    assert.equal(d1!.insufficientData, false)

    assert.equal(d7!.cohortSize, 10)
    assert.equal(d7!.activeCount, 2)
    assert.equal(d7!.retentionPct, 20)
    assert.equal(d7!.insufficientData, false)
  })

  it('CASE5: a D7 cohort not yet 7 days old must not enter the denominator (not counted as churn)', () => {
    // First-meal on 2026-08-15, "today" (asOf) is 2026-08-17 — day0+7 is
    // 2026-08-22, which hasn't happened yet. This user must be excluded
    // entirely from D7's cohortSize, not counted as a non-retained user.
    const cohortDayByUser = new Map([['too-young-user', '2026-08-15']])
    const activeDaysByUser = new Map<string, Set<string>>()
    const result = calculateRetentionForOffset(
      { cohortDayByUser, activeDaysByUser },
      7,
      addDaysToDayKey,
      '2026-08-17'
    )
    assert.equal(result.cohortSize, 0)
    assert.equal(result.notYetEligibleCount, 1)
    assert.equal(result.retentionPct, null)
    assert.equal(formatRetentionResult(result), 'Insufficient data')
  })

  it('CASE6: D7 eligible 10 users, retained 3 -> 30%', () => {
    const cohortDayByUser = tenUserCohort()
    const day7 = addDaysToDayKey(DAY0, 7)
    const activeDaysByUser = new Map<string, Set<string>>([
      ['user-1', new Set([day7])],
      ['user-2', new Set([day7])],
      ['user-3', new Set([day7])],
    ])
    const result = calculateRetentionForOffset(
      { cohortDayByUser, activeDaysByUser },
      7,
      addDaysToDayKey,
      FAR_FUTURE_ASOF
    )
    assert.equal(result.cohortSize, 10)
    assert.equal(result.activeCount, 3)
    assert.equal(result.retentionPct, 30)
  })

  it('a mixed-age cohort splits correctly: eligible members are scored, too-young members are excluded from cohortSize', () => {
    const cohortDayByUser = new Map([
      ['old-user-1', '2026-08-01'], // day0+7 = 08-08, well before asOf
      ['old-user-2', '2026-08-01'],
      ['young-user', '2026-08-15'], // day0+7 = 08-22, after asOf
    ])
    const activeDaysByUser = new Map<string, Set<string>>([
      ['old-user-1', new Set([addDaysToDayKey('2026-08-01', 7)])],
    ])
    const result = calculateRetentionForOffset(
      { cohortDayByUser, activeDaysByUser },
      7,
      addDaysToDayKey,
      '2026-08-17'
    )
    assert.equal(result.cohortSize, 2)
    assert.equal(result.activeCount, 1)
    assert.equal(result.notYetEligibleCount, 1)
    assert.equal(result.retentionPct, 50)
  })

  it('cohort of 0 users -> retentionPct is null, not NaN or a divide-by-zero crash', () => {
    const result = calculateRetentionForOffset(
      { cohortDayByUser: new Map(), activeDaysByUser: new Map() },
      1,
      addDaysToDayKey,
      FAR_FUTURE_ASOF
    )
    assert.equal(result.cohortSize, 0)
    assert.equal(result.retentionPct, null)
    assert.equal(result.insufficientData, true)
  })

  it('CASE13: a cohort below MIN_RETENTION_COHORT_SIZE shows "Insufficient data", never a bare 0%/100%', () => {
    assert.ok(MIN_RETENTION_COHORT_SIZE > 1, 'sanity check on the threshold itself')
    const cohortDayByUser = new Map([['solo-user', DAY0]])
    const activeDaysByUser = new Map([['solo-user', new Set([addDaysToDayKey(DAY0, 1)])]])
    const result = calculateRetentionForOffset(
      { cohortDayByUser, activeDaysByUser },
      1,
      addDaysToDayKey,
      FAR_FUTURE_ASOF
    )

    assert.equal(result.cohortSize, 1)
    assert.equal(result.activeCount, 1)
    assert.equal(result.retentionPct, 100)
    assert.equal(result.insufficientData, true)
    // Must not silently present a 1/1 as a clean "100% retention" figure.
    assert.equal(formatRetentionResult(result), 'Insufficient data')
  })

  it('formatRetentionResult always shows cohort size alongside the percentage', () => {
    const cohortDayByUser = tenUserCohort()
    const day7 = addDaysToDayKey(DAY0, 7)
    const activeDaysByUser = new Map<string, Set<string>>([
      ['user-1', new Set([day7])],
      ['user-2', new Set([day7])],
    ])
    const result = calculateRetentionForOffset({ cohortDayByUser, activeDaysByUser }, 7, addDaysToDayKey, FAR_FUTURE_ASOF)
    assert.equal(formatRetentionResult(result), '20% (2 / 10)')
  })
})
