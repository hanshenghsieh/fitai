import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { FoodLogEntry } from '@/lib/banks/types'
import { filterFoodLogsForNutritionDay, foodLogNutritionDayKey } from '@/lib/nutrition-day-food-logs'
import { resolveFoodLogsFromSession, writeFoodLogsSessionCache } from '@/lib/food-log-session-cache'

function sampleLog(partial: Partial<FoodLogEntry> & Pick<FoodLogEntry, 'id' | 'logged_at'>): FoodLogEntry {
  return {
    id: partial.id,
    name: partial.name ?? partial.id,
    calories: 100,
    protein_g: 10,
    carbs_g: 10,
    fat_g: 5,
    logged_at: partial.logged_at,
    user_declared: true,
    source: 'search',
    capture_status: 'resolved',
    nutrition_status: 'official',
  }
}

function mockBrowserStorage() {
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

describe('nutrition day food logs', () => {
  it('filterFoodLogsForNutritionDay keeps only logs for target day', () => {
    const wed = '2099-06-18'
    const tueLog = sampleLog({ id: 'tue', logged_at: '2099-06-17T12:00:00.000Z' })
    const wedLog = sampleLog({ id: 'wed', logged_at: '2099-06-18T02:00:00.000Z' })
    const filtered = filterFoodLogsForNutritionDay([tueLog, wedLog], wed)
    assert.deepEqual(filtered.map(l => l.id), ['wed'])
  })

  it('resolveFoodLogsFromSession prefers local cache over stale server after delete', () => {
    const mock = mockBrowserStorage()
    try {
      const wed = '2099-06-18'
      const at = `${wed}T08:00:00.000Z`
      const serverLogs = [
        sampleLog({ id: 'a', logged_at: at }),
        sampleLog({ id: 'b', logged_at: at }),
      ]
      writeFoodLogsSessionCache([sampleLog({ id: 'a', logged_at: at })], wed)
      const resolved = resolveFoodLogsFromSession(serverLogs, wed)
      assert.equal(resolved.length, 1)
      assert.equal(resolved[0]?.id, 'a')
    } finally {
      mock.restore()
    }
  })

  it('resolveFoodLogsFromSession drops stale cached logs when server is empty', () => {
    const mock = mockBrowserStorage()
    try {
      const wed = '2099-06-18'
      const stale = [sampleLog({ id: 'yesterday', logged_at: '2099-06-17T12:00:00.000Z' })]
      writeFoodLogsSessionCache(stale, wed)
      const resolved = resolveFoodLogsFromSession([], wed)
      assert.equal(resolved.length, 0)
    } finally {
      mock.restore()
    }
  })
})
