import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { clearUserLocalState } from './clear-user-local-state.ts'
import { writeFoodLogsSessionCache, readFoodLogsSessionCache } from './food-log-session-cache.ts'
import { writeTodayOfflineSnapshot, readTodayOfflineSnapshot } from './today-offline-cache.ts'
import { writeWorkoutItemsSessionCache, readWorkoutItemsSessionCache } from './workout-items-session-cache.ts'
import {
  writeWeightMeasurementsSessionCache,
  readWeightMeasurementsSessionCache,
} from './weight-measurements-session-cache.ts'
import { markPendingSync, hasPendingSync } from './offline-pending-sync.ts'
import { getNutritionDayKey } from './timezone.ts'
import type { FoodLogEntry } from './banks/types.ts'

function log(id: string): FoodLogEntry {
  return {
    id,
    name: '旧餐',
    slot: 'meal1',
    calories: 100,
    protein_g: 10,
    logged_at: '2026-07-08T12:00:00.000Z',
    user_declared: true,
  }
}

function mockBrowserStorage() {
  const session = new Map<string, string>()
  const local = new Map<string, string>()
  const originalWindow = globalThis.window
  const originalSessionStorage = globalThis.sessionStorage
  const originalLocalStorage = globalThis.localStorage

  const sessionStorage = {
    getItem: (k: string) => session.get(k) ?? null,
    setItem: (k: string, v: string) => {
      session.set(k, v)
    },
    removeItem: (k: string) => {
      session.delete(k)
    },
    clear: () => {
      session.clear()
    },
    key: (i: number) => Array.from(session.keys())[i] ?? null,
    get length() {
      return session.size
    },
  }
  const localStorage = {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => {
      local.set(k, v)
    },
    removeItem: (k: string) => {
      local.delete(k)
    },
    clear: () => {
      local.clear()
    },
    key: (i: number) => Array.from(local.keys())[i] ?? null,
    get length() {
      return local.size
    },
  }

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      sessionStorage,
      localStorage,
      dispatchEvent: () => true,
    },
  })
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: sessionStorage })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorage })

  return {
    restore() {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
      Object.defineProperty(globalThis, 'sessionStorage', {
        configurable: true,
        value: originalSessionStorage,
      })
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      })
    },
  }
}

describe('clearUserLocalState', () => {
  it('clears food, workout, weight, offline and pending sync caches', () => {
    const mock = mockBrowserStorage()
    const day = getNutritionDayKey()
    try {
      writeFoodLogsSessionCache([log('a')], day)
      writeTodayOfflineSnapshot({
        date: day,
        food_logs_today: [log('a')],
        updated_at: new Date().toISOString(),
      })
      writeWorkoutItemsSessionCache(
        [{ exercise_id: 'x', exercise_name: '深蹲', completed: true }],
        day
      )
      writeWeightMeasurementsSessionCache([
        {
          id: 'w1',
          user_id: 'old',
          measured_at: day,
          weight_kg: 70,
          body_fat_pct: null,
          waist_cm: null,
          hip_cm: null,
          chest_cm: null,
          created_at: new Date().toISOString(),
        },
      ])
      markPendingSync(day)
      sessionStorage.setItem(`dice-session-${day}-lunch`, '[]')

      clearUserLocalState()

      assert.equal(readFoodLogsSessionCache(day), null)
      assert.equal(readTodayOfflineSnapshot(day), null)
      assert.equal(readWorkoutItemsSessionCache(day), null)
      assert.equal(readWeightMeasurementsSessionCache(), null)
      assert.equal(hasPendingSync(day), false)
      assert.equal(sessionStorage.getItem(`dice-session-${day}-lunch`), null)
    } finally {
      mock.restore()
    }
  })
})
