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

describe('冬瓜茶 (winter melon tea) coverage — regression for the search dead-end bug', () => {
  it('exact canonical name match succeeds', () => {
    const hits = searchFoodMenu('冬瓜茶', 6)
    assert.ok(hits.length > 0, 'expected at least one hit for the exact canonical name')
    assert.ok(hits.some(h => h.name === '冬瓜茶'))
  })

  it('partial Traditional Chinese match ("冬瓜") surfaces 冬瓜茶', () => {
    const hits = searchFoodMenu('冬瓜', 6)
    assert.ok(hits.some(h => h.name === '冬瓜茶'))
  })

  it('exact alias match ("冬瓜飲") resolves to the same 冬瓜茶 records', () => {
    const hits = searchFoodMenu('冬瓜飲', 6)
    assert.ok(hits.length > 0)
    assert.ok(hits.every(h => h.name === '冬瓜茶'))
  })

  it('another Chinese alias ("冬瓜露") also resolves', () => {
    const hits = searchFoodMenu('冬瓜露', 6)
    assert.ok(hits.some(h => h.name === '冬瓜茶'))
  })

  it('English alias ("winter melon tea") resolves to the Chinese-named record', () => {
    const hits = searchFoodMenu('winter melon tea', 6)
    assert.ok(hits.some(h => h.name === '冬瓜茶'))
  })

  it('whitespace around the query does not prevent a match', () => {
    const hits = searchFoodMenu('  冬瓜茶  ', 6)
    assert.ok(hits.some(h => h.name === '冬瓜茶'))
  })

  it('does not return duplicate rows for the same underlying catalog item', () => {
    const hits = searchFoodMenu('冬瓜茶', 6)
    const ids = hits.map(h => h.id)
    assert.equal(new Set(ids).size, ids.length, 'every result id should be unique')
  })

  it('an unrelated query does not surface 冬瓜茶 as a result', () => {
    const hits = searchFoodMenu('檸檬', 6)
    assert.ok(!hits.some(h => h.name === '冬瓜茶'))
  })
})

describe('food search ranking — exact/alias/substring priority', () => {
  it('an exact canonical-name match outranks a substring match', () => {
    const hits = searchFoodMenu('冬瓜茶', 6)
    const exactIdx = hits.findIndex(h => h.name === '冬瓜茶')
    assert.equal(exactIdx, 0, 'the exact-name hit should rank first')
  })

  it('an exact alias match still ranks the canonical item at the top (no weak-fuzzy noise ahead of it)', () => {
    const hits = searchFoodMenu('冬瓜飲', 6)
    assert.equal(hits[0]?.name, '冬瓜茶')
  })
})

describe('existing partial-match behavior (non-regression)', () => {
  it('雞胸 surfaces 雞胸肉', () => {
    const hits = searchFoodMenu('雞胸', 6)
    assert.ok(hits.some(h => h.name === '雞胸肉'))
  })

  it('無糖豆 surfaces 無糖豆漿', () => {
    const hits = searchFoodMenu('無糖豆', 6)
    assert.ok(hits.some(h => h.name === '無糖豆漿'))
  })
})

describe('McDonald\'s regression set (data-integrity + soup-band audit)', () => {
  it('麥香雞 is findable (pre-existing, unaffected)', () => {
    assert.ok(searchFoodMenu('麥香雞', 6).some(h => h.name === '麥香雞'))
  })

  it('麥香魚 is findable (pre-existing, unaffected)', () => {
    assert.ok(searchFoodMenu('麥香魚', 6).some(h => h.name === '麥香魚'))
  })

  it('麥克雞塊 is findable (pre-existing, unaffected)', () => {
    assert.ok(searchFoodMenu('麥克雞塊', 6).some(h => h.name.includes('麥克雞塊')))
  })

  it('薯條 is findable (pre-existing, unaffected)', () => {
    assert.ok(searchFoodMenu('薯條', 6).some(h => h.name.includes('薯條')))
  })

  it('麥脆雞 correctly returns no results — a genuine catalog coverage gap, not a search bug', () => {
    // No record for this product exists anywhere in the catalog under any
    // name or alias. This must stay empty rather than something being
    // fabricated to satisfy the query.
    assert.deepEqual(searchFoodMenu('麥脆雞', 6), [])
    assert.deepEqual(searchFoodMenu('麥脆鷄', 6), [])
  })

  it('玉米濃湯 is now findable — was gate-rejected by the soup macro-band gap, not corrupted', () => {
    const hits = searchFoodMenu('玉米濃湯', 6)
    assert.ok(hits.some(h => h.name === '玉米濃湯' && h.store === '麥當勞'))
  })

  it('玉米湯 (without 濃) discovers 玉米濃湯 via the added alias', () => {
    const hits = searchFoodMenu('玉米湯', 6)
    assert.ok(hits.some(h => h.name === '玉米濃湯' && h.store === '麥當勞'))
  })
})
