import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { dashboardDayKey, addDaysToDayKey } from './day-key'

describe('Phase 2 TASK 8 — dashboard day-key timezone handling', () => {
  it('23:30 Taipei and the following 00:30 Taipei fall on different dashboard days', () => {
    // 2026-07-15 23:30 Taipei (+08:00) and 2026-07-16 00:30 Taipei — one hour
    // apart in real time, but must not be merged into the same UTC calendar
    // day the way naive UTC-midnight bucketing would (15:30 UTC and 16:30
    // UTC on 2026-07-15 both fall on the same UTC day, which is exactly the
    // bug this guards against).
    const late = dashboardDayKey('2026-07-15T23:30:00+08:00')
    const early = dashboardDayKey('2026-07-16T00:30:00+08:00')
    assert.notEqual(late, early)
    assert.equal(late, '2026-07-15')
    assert.equal(early, '2026-07-16')
  })

  it('does not use UTC midnight to cut the day — a Taipei-morning UTC-previous-day timestamp stays on the Taipei day', () => {
    // 2026-07-16 07:00 Taipei is 2026-07-15 23:00 UTC — UTC-midnight
    // bucketing would incorrectly put this on 07-15.
    const key = dashboardDayKey('2026-07-16T07:00:00+08:00')
    assert.equal(key, '2026-07-16')
  })

  it('addDaysToDayKey stays correct across a month boundary', () => {
    assert.equal(addDaysToDayKey('2026-07-31', 1), '2026-08-01')
  })

  it('addDaysToDayKey stays correct across a year boundary', () => {
    assert.equal(addDaysToDayKey('2026-12-31', 1), '2027-01-01')
  })

  it('addDaysToDayKey supports negative offsets', () => {
    assert.equal(addDaysToDayKey('2026-08-01', -1), '2026-07-31')
  })
})
