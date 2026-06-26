import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resolveMenuFromQuery, searchFoodMenuExtended } from './food-menu-lookup'

describe('food-menu-lookup', () => {
  it('resolves 7-11 bamboo shoot pork rib soup from kb', () => {
    const hit = resolveMenuFromQuery('711竹筍排骨湯')
    assert.ok(hit)
    assert.equal(hit!.name, '膳馨綠竹筍排骨湯')
    assert.equal(hit!.store, '7-11')
    assert.equal(hit!.calories, 103)
    assert.equal(hit!.protein_g, 8)
    assert.equal(hit!.source, 'food_kb')
  })

  it('resolves green bamboo shoot soup alias', () => {
    const hit = resolveMenuFromQuery('綠竹筍排骨湯', '7-11')
    assert.ok(hit)
    assert.equal(hit!.calories, 103)
  })

  it('does not return meal-target placeholder calories', () => {
    const hit = resolveMenuFromQuery('711竹筍排骨湯')
    assert.notEqual(hit?.calories, 632)
  })

  it('search returns ranked hits', () => {
    const hits = searchFoodMenuExtended('竹筍排骨', 5)
    assert.ok(hits.length >= 1)
    assert.ok(hits[0]!.name.includes('竹筍'))
  })
})
