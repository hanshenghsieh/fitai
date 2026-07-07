import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { BodyMeasurement } from '@/types'
import {
  mergeWeightMeasurementsMonotonic,
  mergeWeightMeasurementsPreferComplete,
  readWeightMeasurementsSessionCache,
  resolveWeightMeasurementsFromSession,
  weightMeasurementsFingerprint,
  writeWeightMeasurementsSessionCache,
} from './weight-measurements-session-cache'

function sample(id: string, day: string, weight: number, createdAt?: string): BodyMeasurement {
  return {
    id,
    user_id: 'u1',
    measured_at: day,
    weight_kg: weight,
    body_fat_pct: null,
    muscle_mass_kg: null,
    waist_cm: null,
    hip_cm: null,
    chest_cm: null,
    created_at: createdAt ?? `${day}T08:00:00.000Z`,
  }
}

describe('weight-measurements-session-cache', () => {
  it('builds stable fingerprint', () => {
    const fp = weightMeasurementsFingerprint([
      sample('a', '2026-07-01', 70),
      sample('b', '2026-07-02', 69),
    ])
    assert.match(fp, /a/)
    assert.match(fp, /b/)
  })

  it('prefers cached measurements when server is stale after reopen', () => {
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
    const originalLocalStorage = globalThis.localStorage
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: storage },
    })
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })

    try {
      const server = [sample('w1', '2026-07-01', 70)]
      const cached = [sample('w1', '2026-07-01', 70), sample('w2', '2026-07-08', 68.5, '2026-07-08T12:00:00.000Z')]
      writeWeightMeasurementsSessionCache(cached)

      const resolved = resolveWeightMeasurementsFromSession(server)
      assert.equal(resolved.length, 2)
      assert.equal(resolved.at(-1)?.weight_kg, 68.5)
    } finally {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      })
    }
  })

  it('merges server and cache without dropping unique points', () => {
    const server = [sample('w1', '2026-07-01', 70)]
    const cached = [sample('w2', '2026-07-08', 68.5)]
    const merged = mergeWeightMeasurementsPreferComplete(server, cached)
    assert.equal(merged.length, 2)
  })

  it('keeps intermediate same-day point when server only returns latest save', () => {
    const server = [
      sample('goal', '2026-06-01', 70, '2026-06-01T00:00:00.000Z'),
      sample('latest', '2026-07-07', 68.2, '2026-07-07T15:00:00.000Z'),
    ]
    const client = [
      sample('goal', '2026-06-01', 70, '2026-06-01T00:00:00.000Z'),
      sample('mid', '2026-07-07', 69, '2026-07-07T12:00:00.000Z'),
      sample('latest', '2026-07-07', 68.2, '2026-07-07T15:00:00.000Z'),
    ]
    const merged = mergeWeightMeasurementsPreferComplete(server, client)
    assert.equal(merged.length, 3)
    assert.equal(merged[1]?.weight_kg, 69)
    assert.equal(merged.at(-1)?.weight_kg, 68.2)
  })

  it('mergeWeightMeasurementsMonotonic keeps prior points when server returns fewer', () => {
    const server = [
      sample('goal', '2026-06-01', 70, '2026-06-01T00:00:00.000Z'),
      sample('latest', '2026-07-07', 67.4, '2026-07-07T18:00:00.000Z'),
    ]
    const local = [
      sample('goal', '2026-06-01', 70, '2026-06-01T00:00:00.000Z'),
      sample('mid1', '2026-07-07', 69, '2026-07-07T12:00:00.000Z'),
      sample('mid2', '2026-07-07', 68.2, '2026-07-07T14:00:00.000Z'),
      sample('latest', '2026-07-07', 67.4, '2026-07-07T18:00:00.000Z'),
    ]
    const merged = mergeWeightMeasurementsMonotonic(server, local)
    assert.equal(merged.length, 4)
    assert.equal(merged[1]?.weight_kg, 69)
    assert.equal(merged[2]?.weight_kg, 68.2)
  })

  it('write cache never downgrades to fewer points than already stored', () => {
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
    const originalLocalStorage = globalThis.localStorage
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: storage },
    })
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })

    try {
      const four = [
        sample('w1', '2026-07-08', 68.2, '2026-07-08T08:00:00.000Z'),
        sample('w2', '2026-07-08', 68.1, '2026-07-08T09:00:00.000Z'),
        sample('w3', '2026-07-08', 68.0, '2026-07-08T10:00:00.000Z'),
        sample('w4', '2026-07-08', 67.9, '2026-07-08T11:00:00.000Z'),
      ]
      writeWeightMeasurementsSessionCache(four)
      writeWeightMeasurementsSessionCache([sample('w1', '2026-07-08', 68.2)])
      const cached = readWeightMeasurementsSessionCache()
      assert.equal(cached?.length, 4)
    } finally {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      })
    }
  })
})
