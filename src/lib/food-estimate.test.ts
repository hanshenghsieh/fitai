import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import {
  createUnknownFreeTextMeal,
  resolveOrEstimateFreeTextMeal,
  estimateFreeTextMeal,
} from './food-estimate'
import { clearUnknownQueueForTests } from '@/lib/nutrition/search-v2/unknown-queue'

beforeEach(() => clearUnknownQueueForTests())

describe('food-estimate Search V2', () => {
  it('never meal-target fallback for unknown free text', () => {
    const est = resolveOrEstimateFreeTextMeal('隨便一道不存在的菜', 632, 34)
    assert.equal(est.calories, null)
    assert.equal(est.protein_g, null)
    assert.notEqual(est.calories, 632)
    assert.equal(est.nutrition_status, 'unknown')
  })

  it('711 prefix alias does not fuzzy auto-commit without exact label (P0)', () => {
    const est = resolveOrEstimateFreeTextMeal('711竹筍排骨湯', 632, 34)
    assert.equal(est.estimated, true)
    assert.equal(est.nutrition_status, 'unknown')
    assert.equal(est.calories, null)
    assert.equal(est.display_label, '711竹筍排骨湯')
    assert.notEqual(est.calories, 632)
  })

  it('blocks ambiguous soup from direct commit', () => {
    const est = resolveOrEstimateFreeTextMeal('竹筍湯')
    assert.equal(est.blocked, true)
    assert.equal(est.calories, null)
  })

  it('creates unknown text record for 菜包 (no official nutrition)', () => {
    const est = resolveOrEstimateFreeTextMeal('菜包')
    assert.equal(est.blocked, undefined)
    assert.equal(est.nutrition_status, 'unknown')
    assert.equal(est.calories, null)
  })

  it('forceUnknown always committable even for ambiguous queries', () => {
    const est = createUnknownFreeTextMeal('竹筍湯')
    assert.equal(est.blocked, false)
    assert.equal(est.nutrition_status, 'unknown')
    assert.equal(est.name, '竹筍湯')
  })

  it('estimateFreeTextMeal never returns 632', () => {
    const est = estimateFreeTextMeal('不存在菜色', 632, 34)
    assert.notEqual(est.calories, 632)
  })
})
