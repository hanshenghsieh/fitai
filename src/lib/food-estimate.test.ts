import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resolveOrEstimateFreeTextMeal } from './food-estimate'

describe('food-estimate', () => {
  it('blocks meal-target fallback for unknown free text', () => {
    const est = resolveOrEstimateFreeTextMeal('隨便一道不存在的菜', 632, 34)
    assert.equal(est.estimated, true)
    assert.equal(est.calories, 632)
    assert.equal(est.protein_g, 22)
  })

  it('resolves known kb item instead of meal-target', () => {
    const est = resolveOrEstimateFreeTextMeal('711竹筍排骨湯', 632, 34)
    assert.equal(est.estimated, false)
    assert.equal(est.calories, 103)
    assert.notEqual(est.calories, 632)
  })
})
