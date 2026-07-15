import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import type { FoodLogEntry } from '@/lib/banks/types'
import {
  dueOfflineMutationsForUser,
  enqueueCheckinMutation,
  getOfflineMutationStatusForUser,
  makeRetryableMutationsDueNow,
  readOfflineMutationEntries,
  readOfflineMutationsForUser,
  resumeAuthBlockedMutations,
  type OfflineMutationEntry,
} from '@/lib/offline-mutation-queue'
import {
  classifyMutationFailure,
  exponentialBackoffMs,
  replayPendingMutations,
} from '@/lib/offline-mutation-replay'
import {
  isValidNutritionDate,
  mergeCheckinNotesPatch,
} from '@/app/api/checkin/route'
import {
  resolveFoodLogsFromSession,
  writeFoodLogsSessionCache,
} from '@/lib/food-log-session-cache'
import { clearUserLocalState } from '@/lib/clear-user-local-state'

const betterBitHomeSource = readFileSync(
  new URL('../components/dashboard/BetterBitHome.tsx', import.meta.url),
  'utf8'
)
const recordMutationSource = readFileSync(
  new URL('./record/mutate-today-food-log.ts', import.meta.url),
  'utf8'
)
const controllerSource = readFileSync(
  new URL('../components/offline/OfflineMutationSync.tsx', import.meta.url),
  'utf8'
)
const offlineShellSource = readFileSync(
  new URL('../components/capacitor/OfflineShell.tsx', import.meta.url),
  'utf8'
)
const checkinRouteSource = readFileSync(
  new URL('../app/api/checkin/route.ts', import.meta.url),
  'utf8'
)

function sampleLog(id: string, date = '2099-06-18'): FoodLogEntry {
  return {
    id,
    name: id,
    calories: 100,
    protein_g: 10,
    carbs_g: 10,
    fat_g: 5,
    logged_at: `${date}T08:00:00.000Z`,
    user_declared: true,
    source: 'search',
    capture_status: 'resolved',
    nutrition_status: 'official',
  }
}

function mockBrowserStorage(options?: { failWrites?: boolean }) {
  const local = new Map<string, string>()
  const session = new Map<string, string>()
  const originalWindow = globalThis.window
  const originalLocalStorage = globalThis.localStorage
  const originalSessionStorage = globalThis.sessionStorage
  const eventTarget = new EventTarget()
  const localStorage = {
    getItem: (key: string) => local.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (options?.failWrites) throw new DOMException('Quota exceeded', 'QuotaExceededError')
      local.set(key, value)
    },
    removeItem: (key: string) => {
      local.delete(key)
    },
    clear: () => local.clear(),
    key: (index: number) => [...local.keys()][index] ?? null,
    get length() {
      return local.size
    },
  }
  const sessionStorage = {
    getItem: (key: string) => session.get(key) ?? null,
    setItem: (key: string, value: string) => {
      session.set(key, value)
    },
    removeItem: (key: string) => {
      session.delete(key)
    },
    clear: () => session.clear(),
    key: (index: number) => [...session.keys()][index] ?? null,
    get length() {
      return session.size
    },
  }
  const windowValue = Object.assign(eventTarget, {
    localStorage,
    sessionStorage,
    location: { protocol: 'https:' },
  })
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: windowValue,
  })
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorage,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: sessionStorage,
  })
  return {
    local,
    session,
    restore() {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      })
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      })
      Object.defineProperty(globalThis, 'sessionStorage', {
        configurable: true,
        value: originalSessionStorage,
      })
    },
  }
}

function enqueue(
  userId: string,
  payload: Parameters<typeof enqueueCheckinMutation>[0]['payload'],
  date = '2099-06-18',
  now = new Date('2099-06-18T01:00:00.000Z')
) {
  return enqueueCheckinMutation({ userId, nutritionDate: date, payload, now })
}

function confirmedResponse(entry: OfflineMutationEntry): Response {
  return Response.json({
    checkin: {
      user_id: entry.userId,
      checkin_date: entry.nutritionDate,
    },
    confirmation: {
      status: 'confirmed',
      idempotency_key: entry.idempotencyKey,
      nutrition_date: entry.nutritionDate,
      entry_revision: entry.revision,
    },
  })
}

describe('OFF-001 durable checkin outbox Cases 1-19', { concurrency: false }, () => {
  it('Case 1: one network failure is retained and online replay clears only after confirmation', async () => {
    const mock = mockBrowserStorage()
    try {
      enqueue('case-1', { water_ml: 250 })
      await replayPendingMutations({
        userId: 'case-1',
        now: new Date('2099-06-18T01:00:00.000Z'),
        fetcher: async () => {
          throw new TypeError('offline')
        },
      })
      assert.equal(readOfflineMutationsForUser('case-1')[0]?.status, 'failed_retryable')
      makeRetryableMutationsDueNow('case-1')
      await replayPendingMutations({
        userId: 'case-1',
        now: new Date('2099-06-18T01:01:00.000Z'),
        fetcher: async () => confirmedResponse(readOfflineMutationsForUser('case-1')[0]!),
      })
      assert.equal(readOfflineMutationsForUser('case-1').length, 0)
    } finally {
      mock.restore()
    }
  })

  it('Case 2: five failures never remove or alter the payload', async () => {
    const mock = mockBrowserStorage()
    try {
      enqueue('case-2', { water_ml: 500 })
      for (let attempt = 0; attempt < 5; attempt += 1) {
        makeRetryableMutationsDueNow('case-2')
        await replayPendingMutations({
          userId: 'case-2',
          now: new Date(Date.UTC(2099, 5, 18, 1, attempt)),
          fetcher: async () => new Response('server', { status: 500 }),
        })
      }
      const entry = readOfflineMutationsForUser('case-2')[0]!
      assert.equal(entry.attemptCount, 5)
      assert.equal(entry.payload.water_ml, 500)
      assert.doesNotMatch(betterBitHomeSource, /persistBackgroundFailCountRef/)
    } finally {
      mock.restore()
    }
  })

  it('Case 3: ten failures persist attemptCount and capped exponential backoff', async () => {
    const mock = mockBrowserStorage()
    try {
      enqueue('case-3', { water_ml: 750 })
      const retryTimes: number[] = []
      for (let attempt = 0; attempt < 10; attempt += 1) {
        makeRetryableMutationsDueNow('case-3')
        const now = new Date(Date.UTC(2099, 5, 18, 2, attempt))
        await replayPendingMutations({
          userId: 'case-3',
          now,
          fetcher: async () => new Response('server', { status: 503 }),
        })
        const entry = readOfflineMutationsForUser('case-3')[0]!
        retryTimes.push(Date.parse(entry.nextRetryAt!) - now.getTime())
      }
      assert.equal(readOfflineMutationsForUser('case-3')[0]?.attemptCount, 10)
      assert.ok(retryTimes.every((delay, index) => index === 0 || delay >= retryTimes[index - 1]!))
      assert.equal(retryTimes.at(-1), exponentialBackoffMs(10))
    } finally {
      mock.restore()
    }
  })

  it('Case 4: route change cannot remove a durable entry', () => {
    const mock = mockBrowserStorage()
    try {
      enqueue('case-4', { water_ml: 250 })
      window.dispatchEvent(new CustomEvent('betterbit:route-change'))
      assert.equal(readOfflineMutationsForUser('case-4').length, 1)
    } finally {
      mock.restore()
    }
  })

  it('Case 5: kill/relaunch simulation restores the complete payload', () => {
    const mock = mockBrowserStorage()
    try {
      enqueue('case-5', {
        water_ml: 500,
        workout_items: [{ exercise_id: 'squat', exercise_name: '深蹲', completed: true }],
      })
      const restored = JSON.parse(
        mock.local.get('bb_offline_mutations_v1')!
      ) as { entries: OfflineMutationEntry[] }
      assert.equal(restored.entries[0]?.payload.water_ml, 500)
      assert.equal(restored.entries[0]?.payload.workout_items?.[0]?.completed, true)
    } finally {
      mock.restore()
    }
  })

  it('Case 6: 401/403 become auth_blocked and resume only after auth recovery', async () => {
    const mock = mockBrowserStorage()
    try {
      enqueue('case-6', { water_ml: 250 })
      await replayPendingMutations({
        userId: 'case-6',
        fetcher: async () => new Response('auth', { status: 401 }),
      })
      assert.equal(readOfflineMutationsForUser('case-6')[0]?.status, 'auth_blocked')
      assert.equal(classifyMutationFailure({ status: 403 }).status, 'auth_blocked')
      resumeAuthBlockedMutations('case-6')
      const entry = readOfflineMutationsForUser('case-6')[0]!
      await replayPendingMutations({
        userId: 'case-6',
        fetcher: async () => confirmedResponse(entry),
      })
      assert.equal(readOfflineMutationsForUser('case-6').length, 0)
    } finally {
      mock.restore()
    }
  })

  it('Case 7: 500 is retryable and retained', async () => {
    const mock = mockBrowserStorage()
    try {
      enqueue('case-7', { water_ml: 250 })
      await replayPendingMutations({
        userId: 'case-7',
        fetcher: async () => new Response('error', { status: 500 }),
      })
      assert.equal(readOfflineMutationsForUser('case-7')[0]?.status, 'failed_retryable')
    } finally {
      mock.restore()
    }
  })

  it('Case 8: 400/404/409/422 are retained as needs_attention', async () => {
    const mock = mockBrowserStorage()
    try {
      for (const status of [400, 404, 409, 422]) {
        const userId = `case-8-${status}`
        enqueue(userId, { water_ml: status })
        await replayPendingMutations({
          userId,
          fetcher: async () => new Response('bad payload', { status }),
        })
        assert.equal(readOfflineMutationsForUser(userId)[0]?.status, 'needs_attention')
      }
    } finally {
      mock.restore()
    }
  })

  it('Case 9: three ambiguous meal replays use one stable key, revision, and food id', async () => {
    const mock = mockBrowserStorage()
    try {
      enqueue('case-9', {
        notes_patch: { user_memory: { food_logs_today: [sampleLog('stable-meal')] } },
      })
      const sent: Array<Record<string, unknown>> = []
      for (let attempt = 0; attempt < 3; attempt += 1) {
        makeRetryableMutationsDueNow('case-9')
        await replayPendingMutations({
          userId: 'case-9',
          fetcher: async (_path, options) => {
            sent.push(JSON.parse(String(options.body)) as Record<string, unknown>)
            const entry = readOfflineMutationsForUser('case-9')[0]!
            return attempt < 2
              ? new Response('ambiguous', { status: 502 })
              : confirmedResponse(entry)
          },
        })
      }
      assert.equal(new Set(sent.map(body => body.idempotency_key)).size, 1)
      assert.equal(new Set(sent.map(body => body.entry_revision)).size, 1)
      const logs = (
        (sent[0]?.notes_patch as { user_memory: { food_logs_today: FoodLogEntry[] } })
          .user_memory.food_logs_today
      )
      assert.deepEqual(logs.map(log => log.id), ['stable-meal'])
      assert.match(checkinRouteSource, /onConflict: 'user_id,checkin_date'/)
    } finally {
      mock.restore()
    }
  })

  it('Case 10: multiple checkin patches coalesce without dropping fields', () => {
    const mock = mockBrowserStorage()
    try {
      enqueue('case-10', { water_ml: 250 })
      enqueue('case-10', {
        notes_patch: { user_memory: { food_logs_today: [sampleLog('meal')] } },
      })
      enqueue('case-10', {
        workout_items: [{ exercise_id: 'walk', exercise_name: '走路', completed: true }],
      })
      const [entry] = readOfflineMutationsForUser('case-10')
      assert.equal(readOfflineMutationsForUser('case-10').length, 1)
      assert.equal(entry?.payload.water_ml, 250)
      assert.equal(entry?.payload.notes_patch?.user_memory?.food_logs_today?.length, 1)
      assert.equal(entry?.payload.workout_items?.length, 1)
    } finally {
      mock.restore()
    }
  })

  it('Case 11: local create then delete replaces the snapshot with no food log', () => {
    const mock = mockBrowserStorage()
    try {
      enqueue('case-11', {
        notes_patch: { user_memory: { food_logs_today: [sampleLog('cancel-me')] } },
      })
      enqueue('case-11', {
        notes_patch: { user_memory: { food_logs_today: [] } },
      })
      assert.deepEqual(
        readOfflineMutationsForUser('case-11')[0]?.payload.notes_patch?.user_memory
          ?.food_logs_today,
        []
      )
    } finally {
      mock.restore()
    }
  })

  it('Case 12: repeated offline water additions coalesce to the final absolute value', () => {
    const mock = mockBrowserStorage()
    try {
      enqueue('case-12', { water_ml: 250 })
      enqueue('case-12', { water_ml: 500 })
      enqueue('case-12', { water_ml: 750 })
      assert.equal(readOfflineMutationsForUser('case-12')[0]?.payload.water_ml, 750)
    } finally {
      mock.restore()
    }
  })

  it('Case 13: offline food is locally visible and pending for later replay', () => {
    const mock = mockBrowserStorage()
    try {
      const log = sampleLog('offline-visible')
      writeFoodLogsSessionCache([log], '2099-06-18')
      enqueue('case-13', {
        notes_patch: { user_memory: { food_logs_today: [log] } },
      })
      assert.equal(resolveFoodLogsFromSession([], '2099-06-18')[0]?.id, log.id)
      assert.equal(readOfflineMutationsForUser('case-13').length, 1)
      assert.doesNotMatch(recordMutationSource, /fetchTodayCheckin|GET.*api\/checkin/)
    } finally {
      mock.restore()
    }
  })

  it('Case 14: background/foreground listeners replay without owning payload memory', () => {
    assert.match(controllerSource, /visibilitychange/)
    assert.match(controllerSource, /appStateChange/)
    assert.match(controllerSource, /pageshow/)
    assert.match(controllerSource, /window\.addEventListener\('online'/)
    assert.doesNotMatch(controllerSource, /access_token|localStorage\.setItem/)
  })

  it('Case 15: different users are strictly isolated during replay', async () => {
    const mock = mockBrowserStorage()
    try {
      enqueue('case-15-A', { water_ml: 250 })
      enqueue('case-15-B', { water_ml: 500 })
      const a = readOfflineMutationsForUser('case-15-A')[0]!
      await replayPendingMutations({
        userId: 'case-15-A',
        fetcher: async () => confirmedResponse(a),
      })
      assert.equal(readOfflineMutationsForUser('case-15-A').length, 0)
      assert.equal(readOfflineMutationsForUser('case-15-B').length, 1)
    } finally {
      mock.restore()
    }
  })

  it('Case 16: revision 1 response cannot delete revision 2', async () => {
    const mock = mockBrowserStorage()
    try {
      enqueue('case-16', { water_ml: 250 })
      await replayPendingMutations({
        userId: 'case-16',
        fetcher: async () => {
          const revision1 = readOfflineMutationsForUser('case-16')[0]!
          enqueue('case-16', { water_ml: 500 })
          return confirmedResponse(revision1)
        },
      })
      const revision2 = readOfflineMutationsForUser('case-16')[0]!
      assert.equal(revision2.revision, 2)
      assert.equal(revision2.payload.water_ml, 500)
      assert.equal(revision2.status, 'pending')
      await replayPendingMutations({
        userId: 'case-16',
        fetcher: async () => confirmedResponse(readOfflineMutationsForUser('case-16')[0]!),
      })
      assert.equal(readOfflineMutationsForUser('case-16').length, 0)
    } finally {
      mock.restore()
    }
  })

  it('Case 17: localStorage quota failure never reports durable save', () => {
    const mock = mockBrowserStorage({ failWrites: true })
    try {
      const result = enqueue('case-17', { water_ml: 250 })
      assert.equal(result.ok, false)
      assert.equal(result.durable, false)
      assert.equal(getOfflineMutationStatusForUser('case-17').status, 'storage_error')
      assert.equal(readOfflineMutationsForUser('case-17').length, 0)
      assert.match(offlineShellSource, /無法安全儲存在此裝置/)
      assert.match(betterBitHomeSource, /result\.durable/)
    } finally {
      mock.restore()
    }
  })

  it('Case 18: day rollover keeps yesterday and today entries separate', () => {
    const mock = mockBrowserStorage()
    try {
      enqueue('case-18', { water_ml: 250 }, '2099-06-18')
      enqueue('case-18', { water_ml: 500 }, '2099-06-19')
      const entries = readOfflineMutationsForUser('case-18')
      assert.deepEqual(entries.map(entry => entry.nutritionDate), [
        '2099-06-18',
        '2099-06-19',
      ])
      assert.equal(dueOfflineMutationsForUser('case-18').length, 2)
      assert.doesNotMatch(
        betterBitHomeSource,
        /applyNutritionDayRollover[\s\S]{0,800}clearPendingSync/
      )
    } finally {
      mock.restore()
    }
  })

  it('Case 19: user B cannot see/replay A; A resumes after signing back in', async () => {
    const mock = mockBrowserStorage()
    try {
      enqueue('case-19-A', { water_ml: 250 })
      clearUserLocalState()
      assert.equal(readOfflineMutationsForUser('case-19-A').length, 1)
      assert.equal(getOfflineMutationStatusForUser('case-19-B').status, null)
      const bReplay = await replayPendingMutations({
        userId: 'case-19-B',
        fetcher: async () => {
          throw new Error('must not fetch')
        },
      })
      assert.equal(bReplay.attempted, 0)
      assert.equal(readOfflineMutationsForUser('case-19-A').length, 1)
      const a = readOfflineMutationsForUser('case-19-A')[0]!
      await replayPendingMutations({
        userId: 'case-19-A',
        fetcher: async () => confirmedResponse(a),
      })
      assert.equal(readOfflineMutationsForUser('case-19-A').length, 0)
      assert.match(offlineShellSource, /getOfflineMutationStatusForUser\(activeUserId\)/)
    } finally {
      mock.restore()
    }
  })
})

describe('OFF-001 server contract and safety', { concurrency: false }, () => {
  it('validates nutrition_date without forcing it to server today', () => {
    assert.equal(isValidNutritionDate('2099-06-18'), true)
    assert.equal(isValidNutritionDate('2099-02-29'), false)
    assert.equal(isValidNutritionDate('not-a-date'), false)
    assert.match(checkinRouteSource, /parsed\.contract\?\.nutritionDate \?\? getNutritionDayKey\(\)/)
  })

  it('notes_patch preserves unprovided notes, recommendation, weight, and user memory fields', () => {
    const existing = JSON.stringify({
      weight_history: [{ logged_at: '2099-06-18T01:00:00.000Z', weight_kg: 70 }],
      daily_rolls: { daily_rolls_used: 3 },
      meal_suggest: { lunch: { id: 'suggestion' } },
      unknown_future_field: { safe: true },
      user_memory: {
        food_dna: { favorite_foods: ['rice'] },
        favorite_item_ids: ['a'],
        food_logs_today: [sampleLog('old')],
      },
    })
    const merged = JSON.parse(
      mergeCheckinNotesPatch(existing, {
        user_memory: { food_logs_today: [sampleLog('new')] },
      })
    ) as {
      weight_history: unknown[]
      daily_rolls: { daily_rolls_used: number }
      meal_suggest: { lunch: { id: string } }
      unknown_future_field: { safe: boolean }
      user_memory: {
        favorite_item_ids: string[]
        food_dna: { favorite_foods: string[] }
        food_logs_today: FoodLogEntry[]
      }
    }
    assert.equal(merged.weight_history.length, 1)
    assert.equal(merged.daily_rolls.daily_rolls_used, 3)
    assert.equal(merged.meal_suggest.lunch.id, 'suggestion')
    assert.equal(merged.unknown_future_field.safe, true)
    assert.deepEqual(merged.user_memory.favorite_item_ids, ['a'])
    assert.equal(merged.user_memory.food_dna.favorite_foods[0], 'rice')
    assert.deepEqual(
      merged.user_memory.food_logs_today.map((log: FoodLogEntry) => log.id),
      ['new']
    )
  })

  it('confirmation contract verifies key, date, revision and never stores tokens', () => {
    assert.match(checkinRouteSource, /idempotency_key: parsed\.contract\.idempotencyKey/)
    assert.match(checkinRouteSource, /entry_revision: parsed\.contract\.entryRevision/)
    assert.match(checkinRouteSource, /nutrition_date: parsed\.contract\.nutritionDate/)
    assert.doesNotMatch(
      readFileSync(new URL('./offline-mutation-queue.ts', import.meta.url), 'utf8'),
      /access_token|refresh_token/
    )
    assert.equal(readOfflineMutationEntries().length, 0)
  })

  it('classifies timeout, 429 Retry-After, and 5xx as retryable', () => {
    assert.deepEqual(
      classifyMutationFailure({
        status: 429,
        retryAfter: '12',
        now: new Date('2099-06-18T00:00:00.000Z'),
      }),
      { status: 'failed_retryable', code: 429, retryAfterMs: 12_000 }
    )
    assert.equal(
      classifyMutationFailure({
        error: new DOMException('timed out', 'AbortError'),
      }).code,
      'timeout'
    )
    for (const status of [500, 502, 503]) {
      assert.equal(classifyMutationFailure({ status }).status, 'failed_retryable')
    }
  })
})
