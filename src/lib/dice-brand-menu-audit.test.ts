import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  canonicalDiceStore,
  clearDiceStoreVariantIndexForTests,
  diceStoreMatches,
  diceStoreVariants,
  rebuildDiceStoreVariantIndex,
} from '@/lib/dice-store-aliases'
import { eatOutMenu } from '@/lib/convenience-store-menu'
import {
  auditDiceBrandMenus,
  DICE_BRAND_MENU_TARGET,
} from '@/lib/nutrition/dice-brand-menu-audit'
import allowlistJson from '../../data/food-kb/food-source-allowlist.json'
import type { AllowlistFile } from '@/lib/nutrition/restaurant-menu-audit'

const ALLOWLIST = allowlistJson as AllowlistFile

describe('dice store aliases — 600 allowlist', () => {
  it('maps search aliases to canonical (7-ELEVEN → 7-11)', () => {
    clearDiceStoreVariantIndexForTests()
    rebuildDiceStoreVariantIndex(eatOutMenu)
    assert.equal(canonicalDiceStore('7-ELEVEN'), '7-11')
    assert.equal(canonicalDiceStore('7-11'), '7-11')
    assert.ok(diceStoreMatches('7-ELEVEN', '7-11'))
  })

  it('maps 梁社漢 ↔ 梁社漢排骨 to same canonical', () => {
    clearDiceStoreVariantIndexForTests()
    rebuildDiceStoreVariantIndex(eatOutMenu)
    assert.equal(canonicalDiceStore('梁社漢'), '梁社漢排骨')
    assert.equal(canonicalDiceStore('梁社漢排骨'), '梁社漢排骨')
    assert.ok(diceStoreMatches('梁社漢', '梁社漢排骨'))
    const variants = diceStoreVariants('梁社漢')
    assert.ok(variants.includes('梁社漢'))
    assert.ok(variants.includes('梁社漢排骨'))
  })

  it('audits all 600 allowlist brands', () => {
    const audit = auditDiceBrandMenus(eatOutMenu, ALLOWLIST)
    assert.equal(audit.brand_total, 600)
    assert.equal(
      audit.complete_count + audit.partial_count + audit.sparse_count + audit.missing_count,
      600
    )
    assert.ok(DICE_BRAND_MENU_TARGET >= 20)
  })
})
