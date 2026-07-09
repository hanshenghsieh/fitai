import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { FoodLogEntry } from '@/lib/banks/types'
import {
  hasTodayOfflineSnapshot,
  mergeFoodLogsPreferComplete,
  readTodayOfflineSnapshot,
  writeTodayOfflineSnapshot,
} from '@/lib/today-offline-cache'
import { resolveFoodLogsFromSession, writeFoodLogsSessionCache } from '@/lib/food-log-session-cache'

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

function mockBrowserStorage() {
  const session = new Map<string, string>()
  const local = new Map<string, string>()
  const originalWindow = globalThis.window
  const originalSessionStorage = globalThis.sessionStorage
  const originalLocalStorage = globalThis.localStorage

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

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage, sessionStorage },
  })
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: sessionStorage })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorage })

  return {
    session,
    local,
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

describe('today offline cache', () => {
  it('writeTodayOfflineSnapshot only returns same-day snapshot', () => {
    const mock = mockBrowserStorage()
    try {
      writeTodayOfflineSnapshot({
        date: '2099-06-18',
        food_logs_today: [sampleLog('a')],
        calorie_target: 1800,
        protein_target: 120,
        water_ml: 500,
        updated_at: '2026-06-18T01:00:00.000Z',
      })
      assert.ok(hasTodayOfflineSnapshot('2099-06-18'))
      assert.equal(hasTodayOfflineSnapshot('2099-06-19'), false)
      const snap = readTodayOfflineSnapshot('2099-06-18')
      assert.equal(snap?.calorie_target, 1800)
      assert.equal(snap?.food_logs_today.length, 1)
    } finally {
      mock.restore()
    }
  })

  it('mergeFoodLogsPreferComplete dedupes by id and keeps all unique logs', () => {
    const merged = mergeFoodLogsPreferComplete(
      [sampleLog('a'), sampleLog('b')],
      [sampleLog('b'), sampleLog('c')]
    )
    assert.deepEqual(merged.map(l => l.id).sort(), ['a', 'b', 'c'])
  })

  it('writeFoodLogsSessionCache also persists durable offline snapshot', () => {
    const mock = mockBrowserStorage()
    try {
      const date = '2099-06-18'
      writeFoodLogsSessionCache([sampleLog('offline-1')], date, {
        calorie_target: 2000,
        protein_target: 130,
        water_ml: 750,
      })
      const snap = readTodayOfflineSnapshot(date)
      assert.equal(snap?.food_logs_today[0]?.id, 'offline-1')
      assert.equal(snap?.water_ml, 750)
    } finally {
      mock.restore()
    }
  })

  it('resolveFoodLogsFromSession prefers durable cache when session cleared on reload', () => {
    const mock = mockBrowserStorage()
    try {
      const date = '2099-06-18'
      writeFoodLogsSessionCache([sampleLog('dur-1'), sampleLog('dur-2')], date)
      mock.session.clear()

      const resolved = resolveFoodLogsFromSession([sampleLog('srv-1')], date)
      assert.equal(resolved.length, 2)
      assert.ok(resolved.some(l => l.id === 'dur-1'))
      assert.ok(!resolved.some(l => l.id === 'srv-1'))
    } finally {
      mock.restore()
    }
  })
})
