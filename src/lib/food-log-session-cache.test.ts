import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { foodLogIdsFingerprint } from './food-log-session-cache.ts'
import type { FoodLogEntry } from './banks/types.ts'

function log(id: string): FoodLogEntry {
  return {
    id,
    name: 'test',
    slot: 'meal1',
    calories: 100,
    protein_g: 10,
    logged_at: '2026-06-18T00:00:00.000Z',
    user_declared: true,
  }
}

describe('food-log-session-cache', () => {
  it('detects add/delete via id fingerprint', () => {
    const before = [log('a'), log('b')]
    const afterDelete = [log('a')]
    const afterAdd = [log('a'), log('b'), log('c')]
    assert.notEqual(foodLogIdsFingerprint(before), foodLogIdsFingerprint(afterDelete))
    assert.notEqual(foodLogIdsFingerprint(before), foodLogIdsFingerprint(afterAdd))
  })
})
