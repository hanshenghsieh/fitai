import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ACTIVITY_CATALOG, resolveActivityCatalogEntry, searchActivityCatalog } from './activity-catalog'

describe('resolveActivityCatalogEntry', () => {
  it('resolves a known Traditional Chinese activity to its MET', () => {
    const entry = resolveActivityCatalogEntry('籃球')
    assert.ok(entry)
    assert.equal(entry.id, 'basketball')
    assert.equal(entry.met, 6.5)
  })

  it('resolves via a Traditional Chinese alias, not just the primary name', () => {
    assert.equal(resolveActivityCatalogEntry('打籃球')?.id, 'basketball')
    assert.equal(resolveActivityCatalogEntry('羽毛球')?.id, 'badminton')
    assert.equal(resolveActivityCatalogEntry('快走')?.id, 'brisk_walking')
    assert.equal(resolveActivityCatalogEntry('爬山')?.id, 'hiking')
    assert.equal(resolveActivityCatalogEntry('登山')?.id, 'hiking')
    assert.equal(resolveActivityCatalogEntry('健行')?.id, 'hiking')
    assert.equal(resolveActivityCatalogEntry('跳繩')?.id, 'jump_rope')
    assert.equal(resolveActivityCatalogEntry('拳擊')?.id, 'boxing')
    assert.equal(resolveActivityCatalogEntry('有氧')?.id, 'aerobics')
    assert.equal(resolveActivityCatalogEntry('重訓')?.id, 'strength_training')
    assert.equal(resolveActivityCatalogEntry('健身')?.id, 'strength_training')
    assert.equal(resolveActivityCatalogEntry('慢跑')?.id, 'jogging')
    assert.equal(resolveActivityCatalogEntry('跑步')?.id, 'running')
  })

  it('resolves via an English alias, case-insensitively', () => {
    assert.equal(resolveActivityCatalogEntry('Yoga')?.id, 'yoga')
    assert.equal(resolveActivityCatalogEntry('YOGA')?.id, 'yoga')
    assert.equal(resolveActivityCatalogEntry('badminton')?.id, 'badminton')
  })

  it('normalizes surrounding and internal whitespace before matching', () => {
    assert.equal(resolveActivityCatalogEntry('  瑜伽  ')?.id, 'yoga')
    assert.equal(resolveActivityCatalogEntry('table tennis')?.id, 'table_tennis')
    assert.equal(resolveActivityCatalogEntry('  table   tennis  ')?.id, 'table_tennis')
  })

  it('returns null for an activity with no catalog match', () => {
    assert.equal(resolveActivityCatalogEntry('划SUP'), null)
    assert.equal(resolveActivityCatalogEntry('潛水'), null)
  })

  it('returns null for empty or whitespace-only input', () => {
    assert.equal(resolveActivityCatalogEntry(''), null)
    assert.equal(resolveActivityCatalogEntry('   '), null)
  })

  it('different manual activities resolve to different MET values (the core bug this fixes)', () => {
    const basketball = resolveActivityCatalogEntry('籃球')
    const yoga = resolveActivityCatalogEntry('瑜伽')
    const badminton = resolveActivityCatalogEntry('羽球')
    const hiking = resolveActivityCatalogEntry('爬山')
    const dancing = resolveActivityCatalogEntry('跳舞')
    const mets = [basketball?.met, yoga?.met, badminton?.met, hiking?.met, dancing?.met]
    assert.equal(new Set(mets).size, mets.length, 'every one of these should carry a distinct MET')
  })
})

describe('searchActivityCatalog', () => {
  it('suggests candidates that share a substring with the query', () => {
    const results = searchActivityCatalog('羽')
    assert.ok(results.some(r => r.id === 'badminton'))
  })

  it('returns nothing for an empty query', () => {
    assert.deepEqual(searchActivityCatalog(''), [])
  })

  it('caps results at the requested limit', () => {
    const results = searchActivityCatalog('a', 3)
    assert.ok(results.length <= 3)
  })
})

describe('catalog data integrity', () => {
  it('has no duplicate alias across different entries (would make resolution ambiguous)', () => {
    const seen = new Map<string, string>()
    for (const entry of ACTIVITY_CATALOG) {
      for (const alias of entry.aliases) {
        const key = alias.trim().toLowerCase()
        const owner = seen.get(key)
        assert.ok(!owner || owner === entry.id, `alias "${alias}" is shared by both "${owner}" and "${entry.id}"`)
        seen.set(key, entry.id)
      }
    }
  })

  it('every entry has a positive MET value', () => {
    for (const entry of ACTIVITY_CATALOG) {
      assert.ok(entry.met > 0, `${entry.id} should have a positive MET`)
    }
  })

  it('covers every activity named in the product spec', () => {
    const requiredIds = [
      'basketball',
      'badminton',
      'tennis',
      'table_tennis',
      'hiking',
      'yoga',
      'pilates',
      'dancing',
      'jump_rope',
      'soccer',
      'baseball',
      'volleyball',
      'stair_climbing',
      'elliptical',
      'rowing',
      'boxing',
      'aerobics',
      'hiit',
      'casual_walking',
      'brisk_walking',
      'jogging',
      'running',
      'cycling',
      'swimming',
      'strength_training',
    ]
    const catalogIds = new Set(ACTIVITY_CATALOG.map(e => e.id))
    for (const id of requiredIds) {
      assert.ok(catalogIds.has(id), `catalog is missing required activity "${id}"`)
    }
  })
})
