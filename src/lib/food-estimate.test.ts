import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import { resolveOrEstimateFreeTextMeal, estimateFreeTextMeal } from './food-estimate'
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

  it('resolves known kb item instead of meal-target', () => {
    const est = resolveOrEstimateFreeTextMeal('711竹筍排骨湯', 632, 34)
    assert.equal(est.estimated, false)
    assert.equal(est.calories, 103)
    assert.notEqual(est.calories, 632)
  })

  it('blocks ambiguous soup from direct commit', () => {
    const est = resolveOrEstimateFreeTextMeal('竹筍湯')
    assert.equal(est.blocked, true)
    assert.equal(est.calories, null)
  })

  it('estimateFreeTextMeal never returns 632', () => {
    const est = estimateFreeTextMeal('不存在菜色', 632, 34)
    assert.notEqual(est.calories, 632)
  })
})
