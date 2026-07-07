import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { DailyCheckin } from '@/types'
import {
  buildCheckinPayload,
  mergePersistedCheckinNotes,
  parseCheckinMeta,
  userMemoryForPersist,
  userMemoryFromCheckin,
} from '@/lib/checkin-utils'
import type { UserMemoryMeta } from '@/lib/checkin-utils'
import {
  foodLogIdsFingerprint,
  resolveFoodLogsFromSession,
  writeFoodLogsSessionCache,
} from '@/lib/food-log-session-cache'
import type { FoodLogEntry } from '@/lib/banks/types'

function sampleLog(partial: Partial<FoodLogEntry> & Pick<FoodLogEntry, 'id' | 'name'>): FoodLogEntry {
  return {
    calories: 350,
    protein_g: 25,
    carbs_g: 30,
    fat_g: 10,
    logged_at: '2026-06-18T08:00:00.000Z',
    user_declared: true,
    source: 'search',
    capture_status: 'resolved',
    nutrition_status: 'official',
    ...partial,
  }
}

describe('food log persistence round-trip', () => {
  it('buildCheckinPayload → parseCheckinMeta preserves food_logs_today', () => {
    const logs = [
      sampleLog({ id: 'log-a', name: '雞腿飯', calories: 850 }),
      sampleLog({ id: 'log-b', name: '茶葉蛋', calories: 80, protein_g: 7 }),
    ]
    const payload = buildCheckinPayload(
      {
        dietItems: [],
        workoutItems: [],
        waterMl: 500,
        mealModes: { breakfast: 'convenience', lunch: 'convenience', dinner: 'convenience' },
        userMemory: { food_logs_today: logs },
      },
      'plan-1'
    )

    const checkin = {
      notes: payload.notes,
      diet_items: payload.diet_items,
      workout_items: payload.workout_items,
    } as DailyCheckin

    const meta = parseCheckinMeta(checkin)
    assert.equal(meta.user_memory?.food_logs_today?.length, 2)
    assert.equal(meta.user_memory?.food_logs_today?.[0]?.name, '雞腿飯')
    assert.equal(meta.user_memory?.food_logs_today?.[1]?.calories, 80)
  })

  it('userMemoryForPersist strips photo_data_url before PATCH', () => {
    const log = sampleLog({ id: 'log-photo', name: '便當', source: 'photo' })
    log.photo_data_url = 'data:image/jpeg;base64,AAAA'
    const memory: UserMemoryMeta = { food_logs_today: [log] }

    const persisted = userMemoryForPersist(memory)!
    assert.equal(persisted.food_logs_today?.length, 1)
    assert.equal('photo_data_url' in (persisted.food_logs_today?.[0] ?? {}), false)
    assert.equal(persisted.food_logs_today?.[0]?.calories, 350)
  })

  it('userMemoryFromCheckin reads back persisted logs', () => {
    const notes = JSON.stringify({
      user_memory: {
        food_logs_today: [sampleLog({ id: 'log-c', name: '雞胸肉', calories: 220 })],
      },
    })
    const memory = userMemoryFromCheckin({ notes } as DailyCheckin)
    assert.equal(memory.food_logs_today?.[0]?.name, '雞胸肉')
  })

  it('add → persist → reload keeps log ids stable', () => {
    const initial = [sampleLog({ id: 'log-1', name: '地瓜' })]
    const added = [...initial, sampleLog({ id: 'log-2', name: '茶葉蛋', calories: 80 })]

    const payload1 = buildCheckinPayload(
      {
        dietItems: [],
        workoutItems: [],
        waterMl: 0,
        mealModes: { breakfast: 'convenience', lunch: 'convenience', dinner: 'convenience' },
        userMemory: { food_logs_today: initial },
      },
      null
    )
    const payload2 = buildCheckinPayload(
      {
        dietItems: [],
        workoutItems: [],
        waterMl: 0,
        mealModes: { breakfast: 'convenience', lunch: 'convenience', dinner: 'convenience' },
        userMemory: { food_logs_today: added },
      },
      null
    )

    const meta1 = parseCheckinMeta({ notes: payload1.notes } as DailyCheckin)
    const meta2 = parseCheckinMeta({ notes: payload2.notes } as DailyCheckin)
    assert.equal(meta1.user_memory?.food_logs_today?.length, 1)
    assert.equal(meta2.user_memory?.food_logs_today?.length, 2)
    assert.deepEqual(
      meta2.user_memory?.food_logs_today?.map(l => l.id),
      ['log-1', 'log-2']
    )
  })

  it('mergePersistedCheckinNotes unions weight_history from concurrent saves', () => {
    const notes = mergePersistedCheckinNotes(
      JSON.stringify({
        weight_history: [{ logged_at: '2026-07-08T15:00:00.000Z', weight_kg: 68.2 }],
      }),
      {
        notes: JSON.stringify({
          weight_history: [{ logged_at: '2026-07-08T12:00:00.000Z', weight_kg: 69 }],
        }),
      } as DailyCheckin
    )

    const meta = parseCheckinMeta({ notes } as DailyCheckin)
    assert.equal(meta.weight_history?.length, 2)
    assert.equal(meta.weight_history?.[0]?.weight_kg, 69)
    assert.equal(meta.weight_history?.[1]?.weight_kg, 68.2)
  })

  it('mergePersistedCheckinNotes never shrinks weight_history count', () => {
    const notes = mergePersistedCheckinNotes(
      JSON.stringify({ meal_modes: { breakfast: 'convenience', lunch: 'convenience', dinner: 'convenience' } }),
      {
        notes: JSON.stringify({
          weight_history: [
            { logged_at: '2026-07-08T08:00:00.000Z', weight_kg: 69 },
            { logged_at: '2026-07-08T10:00:00.000Z', weight_kg: 68.2 },
            { logged_at: '2026-07-08T12:00:00.000Z', weight_kg: 67.4 },
          ],
        }),
      } as DailyCheckin
    )

    const meta = parseCheckinMeta({ notes } as DailyCheckin)
    assert.equal(meta.weight_history?.length, 3)
  })

  it('buildCheckinPayload preserves weight_history when syncing food logs', () => {
    const existingCheckin = {
      notes: JSON.stringify({
        weight_history: [
          { logged_at: '2026-07-08T08:00:00.000Z', weight_kg: 68.2 },
          { logged_at: '2026-07-08T09:00:00.000Z', weight_kg: 68.1 },
          { logged_at: '2026-07-08T10:00:00.000Z', weight_kg: 68.0 },
          { logged_at: '2026-07-08T11:00:00.000Z', weight_kg: 67.9 },
        ],
      }),
    } as DailyCheckin

    const payload = buildCheckinPayload(
      {
        dietItems: [],
        workoutItems: [],
        waterMl: 500,
        mealModes: { breakfast: 'convenience', lunch: 'convenience', dinner: 'convenience' },
        userMemory: {
          food_logs_today: [sampleLog({ id: 'log-meal', name: '雞腿飯', calories: 850 })],
        },
      },
      null,
      existingCheckin
    )

    const meta = parseCheckinMeta({ notes: payload.notes } as DailyCheckin)
    assert.equal(meta.user_memory?.food_logs_today?.length, 1)
    assert.equal(meta.weight_history?.length, 4)
    assert.equal(meta.weight_history?.[3]?.weight_kg, 67.9)
  })

  it('delete log removes entry on next persist', () => {
    const logs = [
      sampleLog({ id: 'keep', name: '雞腿飯' }),
      sampleLog({ id: 'remove', name: '薯條', calories: 320 }),
    ]
    const afterDelete = logs.filter(l => l.id !== 'remove')

    const payload = buildCheckinPayload(
      {
        dietItems: [],
        workoutItems: [],
        waterMl: 0,
        mealModes: { breakfast: 'convenience', lunch: 'convenience', dinner: 'convenience' },
        userMemory: { food_logs_today: afterDelete },
      },
      null
    )
    const meta = parseCheckinMeta({ notes: payload.notes } as DailyCheckin)
    assert.equal(meta.user_memory?.food_logs_today?.length, 1)
    assert.equal(meta.user_memory?.food_logs_today?.[0]?.id, 'keep')
  })

  it('session cache prefers newer client logs when ids differ', () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    }
    const originalWindow = globalThis.window
    const originalSessionStorage = globalThis.sessionStorage
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {} })
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage })

    try {
      const date = '2099-06-18'
      const serverLogs = [sampleLog({ id: 'srv-1', name: '白飯', calories: 200 })]
      const clientLogs = [
        ...serverLogs,
        sampleLog({ id: 'cli-2', name: '茶葉蛋', calories: 80 }),
      ]
      writeFoodLogsSessionCache(clientLogs, date)

      const resolved = resolveFoodLogsFromSession(serverLogs, date)
      assert.equal(resolved.length, 2)
      assert.equal(foodLogIdsFingerprint(resolved), 'cli-2|srv-1')
    } finally {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
      Object.defineProperty(globalThis, 'sessionStorage', {
        configurable: true,
        value: originalSessionStorage,
      })
    }
  })

  it('tab switch simulation: stale server + fresh session cache keeps new log', () => {
    const serverLogs = [sampleLog({ id: 'srv-1', name: '白飯', calories: 200 })]
    const clientLogs = [...serverLogs, sampleLog({ id: 'cli-new', name: '茶葉蛋', calories: 80 })]

    const store = new Map<string, string>()
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    }
    const originalWindow = globalThis.window
    const originalSessionStorage = globalThis.sessionStorage
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {} })
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage })

    try {
      const date = '2099-06-18'
      writeFoodLogsSessionCache(clientLogs, date)
      const hydrated = resolveFoodLogsFromSession(serverLogs, date)
      assert.equal(hydrated.length, 2)
      assert.ok(hydrated.some(l => l.name === '茶葉蛋'))

      const payload = buildCheckinPayload(
        {
          dietItems: [],
          workoutItems: [],
          waterMl: 0,
          mealModes: { breakfast: 'convenience', lunch: 'convenience', dinner: 'convenience' },
          userMemory: { food_logs_today: hydrated },
        },
        null
      )
      const meta = parseCheckinMeta({ notes: payload.notes } as DailyCheckin)
      assert.equal(meta.user_memory?.food_logs_today?.length, 2)
    } finally {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
      Object.defineProperty(globalThis, 'sessionStorage', {
        configurable: true,
        value: originalSessionStorage,
      })
    }
  })

  it('durable offline cache keeps logs when sessionStorage cleared (app restart simulation)', () => {
    const session = new Map<string, string>()
    const local = new Map<string, string>()
    const sessionStorage = {
      getItem: (k: string) => session.get(k) ?? null,
      setItem: (k: string, v: string) => session.set(k, v),
      removeItem: (k: string) => session.delete(k),
      clear: () => session.clear(),
      key: () => null,
      length: 0,
    }
    const localStorage = {
      getItem: (k: string) => local.get(k) ?? null,
      setItem: (k: string, v: string) => local.set(k, v),
      removeItem: (k: string) => local.delete(k),
      clear: () => local.clear(),
      key: () => null,
      length: 0,
    }
    const originalWindow = globalThis.window
    const originalSessionStorage = globalThis.sessionStorage
    const originalLocalStorage = globalThis.localStorage
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage, sessionStorage },
    })
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: sessionStorage })
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorage })

    try {
      const date = '2099-06-18'
      const serverLogs = [sampleLog({ id: 'srv-1', name: '白飯', calories: 200 })]
      const clientLogs = [...serverLogs, sampleLog({ id: 'cli-offline', name: '茶葉蛋', calories: 80 })]
      writeFoodLogsSessionCache(clientLogs, date, {
        calorie_target: 1800,
        protein_target: 120,
        water_ml: 400,
      })
      session.clear()

      const hydrated = resolveFoodLogsFromSession(serverLogs, date)
      assert.equal(hydrated.length, 2)
      assert.ok(hydrated.some(l => l.id === 'cli-offline'))
    } finally {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
      Object.defineProperty(globalThis, 'sessionStorage', {
        configurable: true,
        value: originalSessionStorage,
      })
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      })
    }
  })
})
