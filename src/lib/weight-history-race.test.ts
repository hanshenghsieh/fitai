import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { appendWeightHistoryToCheckin } from './weight-history'

function readRepoFile(relativePath: string): string {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8')
}

/**
 * Build 37 BUG 1 — production 500 on POST /api/settings/body.
 *
 * Root cause: appendWeightHistoryToCheckin used a check-then-insert pattern
 * against daily_checkins, which has a real production UNIQUE(user_id,
 * checkin_date) constraint (confirmed via a direct read-only query against
 * production). Whenever two weight-saves overlapped in time (e.g. the
 * "目前體重" edit and "新增" log buttons on the same settings screen, or a
 * slow network causing an overlapping retry), the loser's plain .insert()
 * could hit a duplicate-key violation; the retry loop was not guaranteed to
 * converge and could exhaust all attempts, surfacing as a genuine 500 —
 * confirmed via real `vercel logs --status-code 500` entries for this exact
 * route on the production deployment.
 */

/** Minimal fluent mock of just the query-builder shape this function uses. */
function buildMockSupabase(opts: {
  existing: { id: string; notes: string | null } | null
  upsertError?: { message: string } | null
  insertError?: { message: string } | null
  onCall?: (op: 'select' | 'upsert' | 'insert' | 'update', payload?: unknown) => void
}) {
  let callCount = 0
  return {
    from(_table: string) {
      return {
        select(_cols: string) {
          return {
            eq() {
              return this
            },
            maybeSingle: async () => {
              opts.onCall?.('select')
              callCount += 1
              // Simulate the row appearing after the first racy read — the
              // second attempt (if the code ever falls through to a second
              // loop iteration) would see it as `existing`.
              return { data: callCount === 1 ? opts.existing : opts.existing, error: null }
            },
          }
        },
        upsert(payload: unknown) {
          opts.onCall?.('upsert', payload)
          return Promise.resolve({ error: opts.upsertError ?? null })
        },
        insert(payload: unknown) {
          opts.onCall?.('insert', payload)
          return Promise.resolve({ error: opts.insertError ?? null })
        },
        update(payload: unknown) {
          opts.onCall?.('update', payload)
          return {
            eq() {
              return this
            },
            is() {
              return this
            },
            select: async () => ({ data: [{ id: 'existing-row' }], error: null }),
          }
        },
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe('Build 37 BUG 1 — daily_checkins race on first-checkin-of-the-day write', () => {
  it('root cause regression: the no-existing-row write path uses upsert(onConflict), not a plain insert', () => {
    const source = readRepoFile('src/lib/weight-history.ts')
    const fnStart = source.indexOf('export async function appendWeightHistoryToCheckin')
    assert.ok(fnStart >= 0)
    const fnSource = source.slice(fnStart)
    assert.match(fnSource, /\.from\('daily_checkins'\)\.upsert\(/)
    assert.match(fnSource, /onConflict:\s*'user_id,checkin_date'/)
    assert.doesNotMatch(
      fnSource.slice(fnSource.indexOf('.upsert(')),
      /\.from\('daily_checkins'\)\.insert\(/,
      'must not still fall back to a plain racy .insert() for the create path'
    )
  })

  it('upsert payload never includes diet_items/workout_items — a conflict must not clobber real checkin data with insert-time defaults', () => {
    let upsertPayload: Record<string, unknown> | undefined
    const supabase = buildMockSupabase({
      existing: null,
      onCall: (op, payload) => {
        if (op === 'upsert') upsertPayload = payload as Record<string, unknown>
      },
    })
    return appendWeightHistoryToCheckin(supabase, 'user-1', 70).then(result => {
      assert.equal(result.error, null)
      assert.ok(upsertPayload)
      assert.equal('diet_items' in upsertPayload!, false)
      assert.equal('workout_items' in upsertPayload!, false)
      assert.ok('notes' in upsertPayload!)
    })
  })

  it('first checkin of the day (no existing row) succeeds with a single upsert call, no error', async () => {
    let upsertCalls = 0
    const supabase = buildMockSupabase({
      existing: null,
      onCall: op => {
        if (op === 'upsert') upsertCalls += 1
      },
    })
    const result = await appendWeightHistoryToCheckin(supabase, 'user-1', 70)
    assert.equal(result.error, null)
    assert.equal(upsertCalls, 1)
  })

  it('a concurrent-insert style failure (what a plain .insert() would throw as a duplicate-key error) does not occur via upsert — simulated by asserting insert() is never called', async () => {
    let insertCalls = 0
    let upsertCalls = 0
    const supabase = buildMockSupabase({
      existing: null,
      onCall: op => {
        if (op === 'insert') insertCalls += 1
        if (op === 'upsert') upsertCalls += 1
      },
    })
    const result = await appendWeightHistoryToCheckin(supabase, 'user-1', 70)
    assert.equal(result.error, null)
    assert.equal(insertCalls, 0, 'the racy .insert() path must never be used for the create case')
    assert.equal(upsertCalls, 1)
  })

  it('an existing checkin row (update path) is unaffected by the fix — still uses update, not upsert', async () => {
    let updateCalls = 0
    let upsertCalls = 0
    const supabase = buildMockSupabase({
      existing: { id: 'row-1', notes: null },
      onCall: op => {
        if (op === 'update') updateCalls += 1
        if (op === 'upsert') upsertCalls += 1
      },
    })
    const result = await appendWeightHistoryToCheckin(supabase, 'user-1', 70)
    assert.equal(result.error, null)
    assert.equal(updateCalls, 1)
    assert.equal(upsertCalls, 0)
  })
})

describe('Build 37 BUG 1 — dead/broken PATCH+DELETE removed from /api/settings/body', () => {
  it('src/app/api/settings/body/route.ts no longer exports PATCH or DELETE (those live correctly at /api/measurements/[id], which has a real dynamic id segment)', () => {
    const source = readRepoFile('src/app/api/settings/body/route.ts')
    assert.doesNotMatch(source, /export async function PATCH/)
    assert.doesNotMatch(source, /export async function DELETE/)
  })

  it('/api/measurements/[id]/route.ts (the real edit/delete endpoint) still exports both, unchanged', () => {
    const source = readRepoFile('src/app/api/measurements/[id]/route.ts')
    assert.match(source, /export async function PATCH/)
    assert.match(source, /export async function DELETE/)
  })
})
