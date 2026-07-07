import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { searchFoodMenu } from './food-search'

describe('food search ranking', () => {
  it('ranks P0 菲力牛排 above combo meals for ingredient query', () => {
    const hits = searchFoodMenu('菲力牛排', 5)
    assert.equal(hits[0]?.name, '菲力牛排')
    assert.equal(hits[0]?.searchSource, 'p0')
  })

  it('ranks P0 牛小排 above official steak sandwiches', () => {
    const hits = searchFoodMenu('牛小排', 5)
    assert.equal(hits[0]?.name, '牛小排')
    assert.equal(hits[0]?.searchSource, 'p0')
  })

  it('ranks P0 雞排 above partial dish alias hits', () => {
    const hits = searchFoodMenu('雞排', 5)
    assert.equal(hits[0]?.name, '雞排')
    assert.equal(hits[0]?.searchSource, 'p0')
  })

  it('ranks P0 雞胸肉 above bento templates', () => {
    const hits = searchFoodMenu('雞胸肉', 5)
    assert.equal(hits[0]?.name, '雞胸肉')
    assert.equal(hits[0]?.searchSource, 'p0')
  })

  it('resolves 菲力 alias to 菲力牛排 P0 item', () => {
    const hits = searchFoodMenu('菲力', 5)
    assert.equal(hits[0]?.name, '菲力牛排')
    assert.equal(hits[0]?.searchSource, 'p0')
  })

  it('keeps dish-first 雞腿飯 for meal query', () => {
    const hits = searchFoodMenu('雞腿飯', 6)
    assert.equal(hits[0]?.searchSource, 'dish')
    assert.equal(hits[0]?.dishTemplateId, 'dish_chicken_leg_rice')
  })
})
