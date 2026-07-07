import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  clearPendingSync,
  hasPendingSync,
  isOffline,
  markPendingSync,
} from '@/lib/offline-pending-sync'

function mockLocalStorage() {
  const local = new Map<string, string>()
  const originalWindow = globalThis.window
  const originalLocalStorage = globalThis.localStorage
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
    value: { localStorage },
  })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorage })
  return {
    restore() {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      })
    },
  }
}

describe('offline pending sync', () => {
  it('markPendingSync survives reload simulation for same day', () => {
    const mock = mockLocalStorage()
    try {
      markPendingSync('2099-06-18')
      assert.equal(hasPendingSync('2099-06-18'), true)
      assert.equal(hasPendingSync('2099-06-19'), false)
      clearPendingSync()
      assert.equal(hasPendingSync('2099-06-18'), false)
    } finally {
      mock.restore()
    }
  })

  it('isOffline returns false in node test env', () => {
    assert.equal(isOffline(), false)
  })
})
