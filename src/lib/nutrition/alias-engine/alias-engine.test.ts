import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  resolveAliasQuery,
  getAliasTokenCount,
  expandQueryWithAliases,
} from '@/lib/nutrition/alias-engine'
import { resolveMenuFromQuery } from '@/lib/food-menu-lookup'

describe('Alias Engine', () => {
  it('AE1: has 500+ aliases', () => {
    assert.ok(getAliasTokenCount() >= 500)
  })

  it('AE2: 雞排 resolves without duplicate official', () => {
    const hit = resolveAliasQuery('香雞排')
    assert.ok(hit)
    assert.match(hit!.official_name, /雞/)
  })

  it('AE3: Subway alias resolves', () => {
    const hit = resolveAliasQuery('潛艇堡', { store: 'Subway' }) ?? resolveAliasQuery('SUBWAY')
    assert.ok(hit)
  })

  it('AE4: 711竹筍排骨湯 finds official via menu lookup', () => {
    const hit = resolveMenuFromQuery('711竹筍排骨湯')
    assert.ok(hit)
    assert.ok(hit!.name.includes('竹筍'))
    assert.notEqual(hit!.calories, 0)
  })

  it('AE5: expandQueryWithAliases includes official name', () => {
    const expanded = expandQueryWithAliases('魯肉飯')
    assert.ok(expanded.some(q => q.includes('滷') || q.includes('魯')))
  })
})
