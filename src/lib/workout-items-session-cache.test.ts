import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { WorkoutCheckinItem } from '@/types'
import {
  resolveWorkoutItemsFromSession,
  workoutItemsFingerprint,
} from './workout-items-session-cache'

describe('workout-items-session-cache', () => {
  const server: WorkoutCheckinItem[] = [
    { exercise_id: 'walk', exercise_name: '快走', completed: false },
  ]

  it('builds stable fingerprint', () => {
    assert.equal(
      workoutItemsFingerprint([
        { exercise_id: 'walk', exercise_name: '快走', completed: true },
      ]),
      'walk:1'
    )
  })

  it('returns server items when no cache', () => {
    assert.deepEqual(resolveWorkoutItemsFromSession(server, '2099-01-01'), server)
  })

  it('prefers cached items when more exercises are completed', () => {
    const store = new Map<string, string>()
    const original = globalThis.sessionStorage
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v)
        },
        removeItem: (k: string) => {
          store.delete(k)
        },
        clear: () => store.clear(),
        key: () => null,
        length: 0,
      },
    })

    try {
      const date = '2099-06-18'
      sessionStorage.setItem(
        `bb_workout_items_${date}`,
        JSON.stringify([{ exercise_id: 'walk', exercise_name: '快走', completed: true }])
      )

      const resolved = resolveWorkoutItemsFromSession(server, date)
      assert.equal(resolved[0]?.completed, true)
    } finally {
      Object.defineProperty(globalThis, 'sessionStorage', {
        configurable: true,
        value: original,
      })
    }
  })
})
