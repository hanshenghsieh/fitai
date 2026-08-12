import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { recordFirstMealLoggedOnce, trackServer } from './track-server'

/**
 * Minimal in-memory fake of the Supabase query surface recordFirstMealLoggedOnce
 * and trackServer actually call, faithfully reproducing the DB-level
 * invariant enforced by idx_analytics_events_first_meal_once (a unique
 * partial index on user_id WHERE event_name = 'first_meal_logged') — an
 * insert that would violate it fails with Postgres error code 23505,
 * exactly like the real table would.
 */
function createFakeAnalyticsTable() {
  const rows: { id: string; event_name: string; user_id: string; properties: unknown }[] = []
  let nextId = 1

  const supabase = {
    from(table: string) {
      assert.equal(table, 'analytics_events')
      return {
        select() {
          return this
        },
        eq(this: { _userId?: string; _eventName?: string }, column: string, value: string) {
          if (column === 'user_id') this._userId = value
          if (column === 'event_name') this._eventName = value
          return this
        },
        async maybeSingle(this: { _userId?: string; _eventName?: string }) {
          const found = rows.find(
            r => r.user_id === this._userId && r.event_name === this._eventName
          )
          return { data: found ? { id: found.id } : null, error: null }
        },
        async insert(row: { event_name: string; user_id: string; properties: unknown }) {
          if (
            row.event_name === 'first_meal_logged' &&
            rows.some(r => r.event_name === 'first_meal_logged' && r.user_id === row.user_id)
          ) {
            return { error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
          }
          rows.push({ id: String(nextId++), ...row })
          return { error: null }
        },
      }
    },
  }

  return { supabase: supabase as never, rows }
}

describe('Phase 2 TASK 8 — first_meal_logged fires at most once per user', () => {
  it('logging 10 meals in a row for the same user only records first_meal_logged once', async () => {
    const { supabase, rows } = createFakeAnalyticsTable()
    const userId = 'user-1'

    const results: boolean[] = []
    for (let i = 0; i < 10; i++) {
      results.push(await recordFirstMealLoggedOnce({ supabase, userId }))
    }

    assert.deepEqual(results, [true, false, false, false, false, false, false, false, false, false])
    assert.equal(rows.filter(r => r.event_name === 'first_meal_logged').length, 1)
  })

  it('a "reinstall" (fresh call with no prior in-memory state) does not create a second row when the DB already has one', async () => {
    const { supabase, rows } = createFakeAnalyticsTable()
    const userId = 'user-2'

    const first = await recordFirstMealLoggedOnce({ supabase, userId })
    assert.equal(first, true)

    // Simulates a brand-new client session (app reinstall) calling again —
    // the function has no memory of the earlier call; only the DB row does.
    const second = await recordFirstMealLoggedOnce({ supabase, userId })
    assert.equal(second, false)
    assert.equal(rows.filter(r => r.event_name === 'first_meal_logged').length, 1)
  })

  it('different users each get their own first_meal_logged row', async () => {
    const { supabase, rows } = createFakeAnalyticsTable()
    assert.equal(await recordFirstMealLoggedOnce({ supabase, userId: 'user-a' }), true)
    assert.equal(await recordFirstMealLoggedOnce({ supabase, userId: 'user-b' }), true)
    assert.equal(rows.filter(r => r.event_name === 'first_meal_logged').length, 2)
  })

  it('trackServer sanitizes properties before insert (defense in depth even server-side)', async () => {
    const { supabase, rows } = createFakeAnalyticsTable()
    await trackServer(
      {
        name: 'account_created',
        properties: { auth_method: 'email', platform: 'ios', email: 'leaked@example.com' } as never,
      },
      { supabase, userId: 'user-3' }
    )
    const row = rows.find(r => r.event_name === 'account_created')
    assert.ok(row)
    assert.deepEqual(row!.properties, { auth_method: 'email', platform: 'ios' })
  })
})
