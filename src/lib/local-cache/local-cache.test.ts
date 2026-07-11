import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import {
  clearAllLocalCache,
  clearNamespace,
  getLastActiveUserId,
  readCache,
  removeCache,
  writeCache,
} from '@/lib/local-cache'
import {
  invalidateBodyData,
  invalidateMealMutation,
  invalidateSettingsSave,
} from '@/lib/local-cache/invalidate'
import { CACHE_PREFIX } from '@/lib/local-cache/keys'

function installLocalStorage() {
  const map = new Map<string, string>()
  const localStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size
    },
  }
  const originalWindow = globalThis.window
  const originalLocalStorage = globalThis.localStorage
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage } })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorage })
  return {
    map,
    restore() {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      })
    },
  }
}

let store: ReturnType<typeof installLocalStorage>

beforeEach(() => {
  store = installLocalStorage()
})

afterEach(() => {
  store.restore()
})

describe('local-cache read/write', () => {
  it('writes then reads back fresh data', () => {
    writeCache('today', 'u1', ['2099-01-01'], { hello: 'world' })
    const hit = readCache<{ hello: string }>('today', 'u1', ['2099-01-01'])
    assert.ok(hit)
    assert.equal(hit!.data.hello, 'world')
    assert.equal(hit!.isStale, false)
    assert.equal(getLastActiveUserId(), 'u1')
  })

  it('returns null for a different user (account separation)', () => {
    writeCache('today', 'u1', ['2099-01-01'], { hello: 'u1' })
    const other = readCache('today', 'u2', ['2099-01-01'])
    assert.equal(other, null)
  })

  it('marks data stale past the soft TTL but still returns it', () => {
    // today soft TTL is 5m — forge an envelope 10m old.
    const key = `${CACHE_PREFIX}:today:u1:2099-01-01`
    store.map.set(
      key,
      JSON.stringify({
        schemaVersion: 1,
        cachedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
        userId: 'u1',
        data: { hello: 'stale' },
      })
    )
    const hit = readCache<{ hello: string }>('today', 'u1', ['2099-01-01'])
    assert.ok(hit)
    assert.equal(hit!.isStale, true)
    assert.equal(hit!.data.hello, 'stale')
  })

  it('discards cache past the hard max age (no permanent trust)', () => {
    const key = `${CACHE_PREFIX}:today:u1:2099-01-01`
    store.map.set(
      key,
      JSON.stringify({
        schemaVersion: 1,
        cachedAt: new Date(Date.now() - 48 * 3600_000).toISOString(),
        userId: 'u1',
        data: { hello: 'ancient' },
      })
    )
    const hit = readCache('today', 'u1', ['2099-01-01'])
    assert.equal(hit, null)
    assert.equal(store.map.has(key), false)
  })

  it('rejects a mismatched schema version', () => {
    const key = `${CACHE_PREFIX}:today:u1:2099-01-01`
    store.map.set(
      key,
      JSON.stringify({
        schemaVersion: 999,
        cachedAt: new Date().toISOString(),
        userId: 'u1',
        data: { hello: 'old-shape' },
      })
    )
    assert.equal(readCache('today', 'u1', ['2099-01-01']), null)
  })

  it('removeCache removes a single entry', () => {
    writeCache('settings', 'u1', [], { a: 1 })
    assert.ok(readCache('settings', 'u1', []))
    removeCache('settings', 'u1', [])
    assert.equal(readCache('settings', 'u1', []), null)
  })
})

describe('local-cache invalidation', () => {
  it('invalidateMealMutation clears today/record/analysis but keeps settings', () => {
    writeCache('today', 'u1', ['d'], { x: 1 })
    writeCache('record', 'u1', ['d'], { x: 1 })
    writeCache('analysis', 'u1', ['d'], { x: 1 })
    writeCache('settings', 'u1', [], { x: 1 })

    invalidateMealMutation('u1')

    assert.equal(readCache('today', 'u1', ['d']), null)
    assert.equal(readCache('record', 'u1', ['d']), null)
    assert.equal(readCache('analysis', 'u1', ['d']), null)
    assert.ok(readCache('settings', 'u1', []))
  })

  it('invalidateSettingsSave clears settings + today + analysis', () => {
    writeCache('settings', 'u1', [], { x: 1 })
    writeCache('settings-bundle', 'u1', [], { x: 1 })
    writeCache('today', 'u1', ['d'], { x: 1 })
    writeCache('analysis', 'u1', ['d'], { x: 1 })

    invalidateSettingsSave('u1')

    assert.equal(readCache('settings', 'u1', []), null)
    assert.equal(readCache('settings-bundle', 'u1', []), null)
    assert.equal(readCache('today', 'u1', ['d']), null)
    assert.equal(readCache('analysis', 'u1', ['d']), null)
  })

  it('invalidateBodyData falls back to last active user when id omitted', () => {
    writeCache('analysis', 'u1', ['d'], { x: 1 }) // sets last-active-user = u1
    invalidateBodyData()
    assert.equal(readCache('analysis', 'u1', ['d']), null)
  })

  it('clearNamespace only clears one namespace for one user', () => {
    writeCache('today', 'u1', ['d1'], { x: 1 })
    writeCache('today', 'u1', ['d2'], { x: 2 })
    writeCache('today', 'u2', ['d1'], { x: 3 })

    clearNamespace('today', 'u1')

    assert.equal(readCache('today', 'u1', ['d1']), null)
    assert.equal(readCache('today', 'u1', ['d2']), null)
    assert.ok(readCache('today', 'u2', ['d1']))
  })

  it('clearAllLocalCache wipes everything including last-user', () => {
    writeCache('today', 'u1', ['d'], { x: 1 })
    writeCache('settings', 'u2', [], { x: 1 })
    clearAllLocalCache()
    assert.equal(readCache('today', 'u1', ['d']), null)
    assert.equal(readCache('settings', 'u2', []), null)
    assert.equal(getLastActiveUserId(), null)
  })
})
