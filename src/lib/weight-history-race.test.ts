import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { appendWeightHistoryToCheckin, isTransientSupabaseError, type SupabaseWriteError } from './weight-history'

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
  /** Build 38 — records every .eq()/.is() call made on the UPDATE chain, so tests can assert on the filter shape. */
  onUpdateFilter?: (method: 'eq' | 'is', column: string, value: unknown) => void
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
            eq(column: string, value: unknown) {
              opts.onUpdateFilter?.('eq', column, value)
              return this
            },
            is(column: string, value: unknown) {
              opts.onUpdateFilter?.('is', column, value)
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

/**
 * Build 38 BUG 1 — a real device still hit a 500 after Build 37's upsert
 * fix was deployed (confirmed via a live production Vercel log entry).
 * Exhaustive investigation (schema, RLS, constraints, a ROLLBACK-wrapped
 * transaction replaying the exact write under the real authenticated-role
 * RLS context, and a local replay of the real production `notes` merge
 * logic) found no deterministic reproducible bug — the write itself is
 * healthy. The only remaining honest explanation is a transient
 * connection-class failure, which the code had zero resilience against:
 * ANY Postgrest error (transient or permanent) failed immediately, and only
 * `.message` ever reached logs — losing `code`/`details`/`hint`, which is
 * exactly why two builds in a row couldn't diagnose this from Vercel logs.
 * These tests lock in the fix: transient errors retry, permanent errors
 * fail fast with full detail preserved.
 */
function buildTransientThenSuccessSupabase(failCount: number, error: SupabaseWriteError) {
  let upsertAttempts = 0
  return {
    from(_table: string) {
      return {
        select() {
          return {
            eq() {
              return this
            },
            maybeSingle: async () => ({ data: null, error: null }),
          }
        },
        upsert() {
          upsertAttempts += 1
          if (upsertAttempts <= failCount) {
            return Promise.resolve({ error })
          }
          return Promise.resolve({ error: null })
        },
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    },
  } as any
}

describe('Build 38 BUG 1 — transient vs permanent Postgrest errors', () => {
  it('isTransientSupabaseError recognizes connection-class codes as transient', () => {
    assert.equal(isTransientSupabaseError({ message: 'x', code: '08006' }), true)
    assert.equal(isTransientSupabaseError({ message: 'x', code: '57014' }), true)
    assert.equal(isTransientSupabaseError({ message: 'fetch failed' }), true)
    assert.equal(isTransientSupabaseError({ message: 'Socket hang up' }), true)
  })

  it('isTransientSupabaseError does NOT treat a constraint/permission error as transient', () => {
    assert.equal(
      isTransientSupabaseError({ message: 'new row violates check constraint', code: '23514' }),
      false
    )
    assert.equal(
      isTransientSupabaseError({ message: 'permission denied for table daily_checkins', code: '42501' }),
      false
    )
  })

  it('a transient connection failure on the upsert is retried and eventually succeeds', async () => {
    const supabase = buildTransientThenSuccessSupabase(2, { message: 'fetch failed', code: undefined })
    const result = await appendWeightHistoryToCheckin(supabase, 'user-1', 70)
    assert.equal(result.error, null)
  })

  it('a permanent (non-transient) upsert error fails fast with the full code/details/hint preserved, not just a bare message', async () => {
    const supabase = buildTransientThenSuccessSupabase(99, {
      message: 'permission denied for table daily_checkins',
      code: '42501',
      details: 'RLS denied the insert',
      hint: 'Check your policies',
    })
    const result = await appendWeightHistoryToCheckin(supabase, 'user-1', 70)
    assert.notEqual(result.error, null)
    assert.equal(result.error?.code, '42501')
    assert.equal(result.error?.hint, 'Check your policies')
    assert.equal(result.error?.details, 'RLS denied the insert')
  })
})

describe('Build 38 BUG 1 — /api/settings/body always logs full error detail, never swallows an unhandled throw', () => {
  it('route.ts wraps the handler body in try/catch', () => {
    const source = readRepoFile('src/app/api/settings/body/route.ts')
    const fnStart = source.indexOf('export async function POST')
    const fnSource = source.slice(fnStart)
    assert.match(fnSource, /\btry\s*\{/)
    assert.match(fnSource, /\}\s*catch\s*\(err\)/)
  })

  it('route.ts logs the full Postgrest error (code/details/hint), not just .message, on a save failure', () => {
    const source = readRepoFile('src/app/api/settings/body/route.ts')
    assert.match(source, /code:\s*result\.error\.code/)
    assert.match(source, /details:\s*result\.error\.details/)
    assert.match(source, /hint:\s*result\.error\.hint/)
    assert.match(source, /console\.error\(/)
  })

  it('route.ts captures unhandled throws via captureError with a console.error including the stack', () => {
    const source = readRepoFile('src/app/api/settings/body/route.ts')
    const catchStart = source.indexOf('} catch (err)')
    const catchSource = source.slice(catchStart)
    assert.match(catchSource, /err\.stack/)
    assert.match(catchSource, /captureError\(err,/)
  })

  it('the client-facing error message never leaks raw Postgrest internals (code/details/hint stay server-side only)', () => {
    const source = readRepoFile('src/app/api/settings/body/route.ts')
    const fnStart = source.indexOf('export async function POST')
    const fnSource = source.slice(fnStart)
    assert.doesNotMatch(fnSource, /jsonWithCors\(\{ error: result\.error\.message \}/)
  })
})

/**
 * Root cause of the production 414 "Request-URI Too Large": the daily_checkins
 * UPDATE path added `.eq('notes', existing.notes)` (or `.is('notes', null)`)
 * as an optimistic-concurrency guard. PostgREST serializes .eq()/.is() filter
 * conditions into the URL query string, not the request body — so embedding
 * the FULL previous `notes` value (which had grown to ~347KB for the real
 * test account, confirmed via a direct production read) blew the query
 * string to 378,500 bytes on a real request (confirmed via
 * request_id-correlated Vercel production logs), past Cloudflare's ~32KB
 * 414 threshold. Fixed by locating the row with only its primary key
 * (`existing.id`) — a filter should never carry large/variable-size payload
 * data, only small scalar identifiers.
 */
describe('Build 38 BUG 1 — daily_checkins UPDATE filter never embeds large payload data', () => {
  it('the update filter uses only existing.id — never .eq/.is on notes', async () => {
    const filterCalls: { method: string; column: string; value: unknown }[] = []
    const supabase = buildMockSupabase({
      existing: { id: 'row-1', notes: 'x'.repeat(400_000) },
      onUpdateFilter: (method, column, value) => filterCalls.push({ method, column, value }),
    })
    const result = await appendWeightHistoryToCheckin(supabase, 'user-1', 70)
    assert.equal(result.error, null)
    assert.ok(filterCalls.length > 0, 'the update chain must apply at least one filter')
    for (const call of filterCalls) {
      assert.equal(call.column, 'id', `update filter must only ever target the "id" column, saw "${call.column}"`)
    }
    assert.ok(
      filterCalls.every(c => typeof c.value === 'string' && c.value.length < 100),
      'the filter value must be a short scalar identifier, never a large payload'
    )
  })

  it('the update filter never carries the notes column at all, even when the existing row has a 400KB notes value', async () => {
    const filterCalls: { method: string; column: string; value: unknown }[] = []
    const supabase = buildMockSupabase({
      existing: { id: 'row-1', notes: 'x'.repeat(400_000) },
      onUpdateFilter: (method, column, value) => filterCalls.push({ method, column, value }),
    })
    await appendWeightHistoryToCheckin(supabase, 'user-1', 70)
    assert.ok(
      filterCalls.every(c => c.column !== 'notes'),
      'notes must never appear as a filter column — it belongs in the update body only'
    )
  })

  it('the update filter never carries diet_items/workout_items or any JSON/array/object value', async () => {
    const filterCalls: { method: string; column: string; value: unknown }[] = []
    const supabase = buildMockSupabase({
      existing: { id: 'row-1', notes: null },
      onUpdateFilter: (method, column, value) => filterCalls.push({ method, column, value }),
    })
    await appendWeightHistoryToCheckin(supabase, 'user-1', 70)
    for (const call of filterCalls) {
      assert.notEqual(call.column, 'diet_items')
      assert.notEqual(call.column, 'workout_items')
      assert.equal(typeof call.value !== 'object' || call.value === null, true, `filter value for "${call.column}" must not be an object/array`)
    }
  })

  it('source regression: appendWeightHistoryToCheckin no longer builds an .eq/.is filter on the notes column', () => {
    const source = readRepoFile('src/lib/weight-history.ts')
    const fnStart = source.indexOf('export async function appendWeightHistoryToCheckin')
    const fnSource = source.slice(fnStart)
    assert.doesNotMatch(fnSource, /\.eq\('notes',/)
    assert.doesNotMatch(fnSource, /\.is\('notes',/)
    assert.match(fnSource, /\.eq\('id', existing\.id\)/, 'the update must still locate the row by its primary key')
  })

  it('a simulated 400KB daily_checkins row does not produce an oversized update filter (regression for the exact production 414)', async () => {
    const hugeNotes = JSON.stringify({
      user_memory: { food_dna: { frequent: Array.from({ length: 50 }, (_, i) => ({ id: `photo-${i}`, cluster_hero_image: 'x'.repeat(8000) })) } },
    })
    assert.ok(hugeNotes.length > 300_000, 'sanity check: the simulated notes blob is realistically huge')
    const filterCalls: { method: string; column: string; value: unknown }[] = []
    const supabase = buildMockSupabase({
      existing: { id: 'row-1', notes: hugeNotes },
      onUpdateFilter: (method, column, value) => filterCalls.push({ method, column, value }),
    })
    const result = await appendWeightHistoryToCheckin(supabase, 'user-1', 70)
    assert.equal(result.error, null)
    const totalFilterBytes = filterCalls.reduce((sum, c) => sum + String(c.value).length, 0)
    assert.ok(totalFilterBytes < 1000, `total filter payload must stay tiny regardless of row size, got ${totalFilterBytes} bytes`)
  })

  it('original weight-history behavior is unaffected: first checkin of the day still succeeds via upsert, not update', async () => {
    let upsertCalls = 0
    let updateCalls = 0
    const supabase = buildMockSupabase({
      existing: null,
      onCall: op => {
        if (op === 'upsert') upsertCalls += 1
        if (op === 'update') updateCalls += 1
      },
    })
    const result = await appendWeightHistoryToCheckin(supabase, 'user-1', 70)
    assert.equal(result.error, null)
    assert.equal(upsertCalls, 1)
    assert.equal(updateCalls, 0)
  })

  it('original weight-history behavior is unaffected: an existing row still gets updated with the merged notes body (not filtered by notes)', async () => {
    let updatePayload: unknown
    const supabase = buildMockSupabase({
      existing: { id: 'row-1', notes: null },
      onCall: (op, payload) => {
        if (op === 'update') updatePayload = payload
      },
    })
    const result = await appendWeightHistoryToCheckin(supabase, 'user-1', 70)
    assert.equal(result.error, null)
    assert.ok(updatePayload && typeof updatePayload === 'object' && 'notes' in updatePayload)
  })
})
