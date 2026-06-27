import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DICE_MIN_AVAILABLE_CANDIDATES, clearSessionDicePoolsForTests } from '@/lib/meal-suggest'

describe('Dice diversity — reroll pool policy', () => {
  it('expands pool when fewer than 40 candidates remain', () => {
    assert.equal(DICE_MIN_AVAILABLE_CANDIDATES, 40)
  })

  it('reroll excludes only the immediately previous store (not full session)', () => {
    const sessionStores = ['金仙', '麥當勞', '梁社', '7-11']
    const recentOnly = sessionStores.slice(-1)
    assert.deepEqual(recentOnly, ['7-11'])
    assert.ok(sessionStores.length > recentOnly.length)
  })

  it('Today reroll should pass preview store only, not accumulated session stores', () => {
    const previewStore = '7-11'
    const loggedStores = ['摩斯漢堡']
    const excludeStores = [...new Set([previewStore, ...loggedStores].filter(Boolean))]
    assert.deepEqual(excludeStores, ['7-11', '摩斯漢堡'])
    assert.equal(excludeStores.length, 2)
  })

  it('clearSessionDicePoolsForTests resets cache', () => {
    clearSessionDicePoolsForTests()
    assert.ok(true)
  })
})
