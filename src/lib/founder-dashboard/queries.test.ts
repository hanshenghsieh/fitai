import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { countDistinctUsers, countDistinctUsersInCohort, mealsPerActiveUser } from './queries'

function row(eventName: string, userId: string | null, properties: Record<string, unknown> | null = null) {
  return { event_name: eventName, user_id: userId, taipei_date: '2026-08-17', properties }
}

describe('Phase 3 — queries.ts pure helpers', () => {
  it('CASE11: the same user logging 5 meals in one day counts as 1 active user, not 5', () => {
    const rows = Array(5).fill(0).map(() => row('meal_log_succeeded', 'user-1'))
    assert.equal(countDistinctUsers(rows), 1)
  })

  it('CASE11b: distinct users across different user_ids are all counted', () => {
    const rows = [row('meal_log_succeeded', 'user-1'), row('meal_log_succeeded', 'user-2'), row('meal_log_succeeded', 'user-1')]
    assert.equal(countDistinctUsers(rows), 2)
  })

  it('CASE12: 12 meals logged by 2 active users -> 6.0 meals per active user', () => {
    assert.equal(mealsPerActiveUser({ mealsLogged: 12, activeFoodLoggers: 2 }), 6)
  })

  it('mealsPerActiveUser is null (not NaN/Infinity) when there are no active loggers', () => {
    assert.equal(mealsPerActiveUser({ mealsLogged: 0, activeFoodLoggers: 0 }), null)
  })

  describe('CASE4: period-activity users outside the registration cohort must not be mixed into the acquisition funnel', () => {
    it('countDistinctUsersInCohort only counts users present in the accountCreated cohort set', () => {
      // legacy-user-9 started a trial this period but registered before
      // analytics tracking existed (or via a path with no account_created
      // row) — they must not inflate the cohort funnel's trialStarted count.
      const accountUserIds = new Set(['user-1', 'user-2', 'user-3'])
      const trialRows = [
        row('trial_started', 'user-1'),
        row('trial_started', 'user-2'),
        row('trial_started', 'legacy-user-9'),
      ]
      const trialInCohort = countDistinctUsersInCohort(trialRows, accountUserIds)
      assert.equal(trialInCohort, 2)
      assert.equal(countDistinctUsers(trialRows), 3, 'raw period count is still 3 — the two numbers answer different questions')
    })

    it('a user who fires the same event twice is still only counted once against the cohort', () => {
      const accountUserIds = new Set(['user-1'])
      const rows = [row('trial_started', 'user-1'), row('trial_started', 'user-1')]
      assert.equal(countDistinctUsersInCohort(rows, accountUserIds), 1)
    })

    it('rows with a null user_id are never counted', () => {
      const accountUserIds = new Set(['user-1'])
      const rows = [row('trial_started', null)]
      assert.equal(countDistinctUsersInCohort(rows, accountUserIds), 0)
    })
  })
})
