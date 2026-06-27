import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { eatOutMenu } from '@/lib/convenience-store-menu'
import allowlistJson from '../../../data/food-kb/food-source-allowlist.json'
import {
  buildDiceBackfillQueue,
  DICE_BACKFILL_BATCH_SIZE,
  getDiceBackfillBatch,
  resolveBrandNutritionUrl,
} from '@/lib/nutrition/dice-backfill-queue'
import { auditDiceBrandMenus } from '@/lib/nutrition/dice-brand-menu-audit'
import type { AllowlistFile } from '@/lib/nutrition/restaurant-menu-audit'

describe('dice-backfill-queue', () => {
  it('prioritizes P0 partial before P0 missing', () => {
    const allowlist = allowlistJson as AllowlistFile
    const audit = auditDiceBrandMenus(eatOutMenu, allowlist)
    const queue = buildDiceBackfillQueue(audit)

    assert.ok(queue.summary.p0_partial > 0)
    assert.ok(queue.summary.p0_missing > 0)
    assert.equal(queue.all_batches[0]?.phase, 'p0_partial')
    assert.equal(queue.all_batches[0]?.batch_id, 'sprint-6')

    const firstMissingIdx = queue.all_batches.findIndex(b => b.phase === 'p0_missing')
    const lastPartialIdx = queue.all_batches.findLastIndex(b => b.phase === 'p0_partial')
    assert.ok(firstMissingIdx > lastPartialIdx)
  })

  it('chunks P0 partial into batches of 50', () => {
    const allowlist = allowlistJson as AllowlistFile
    const audit = auditDiceBrandMenus(eatOutMenu, allowlist)
    const queue = buildDiceBackfillQueue(audit)
    const sprint6 = getDiceBackfillBatch(queue, 'sprint-6')

    assert.ok(sprint6)
    assert.equal(sprint6!.phase, 'p0_partial')
    assert.equal(sprint6!.brands.length, DICE_BACKFILL_BATCH_SIZE)
    assert.equal(sprint6!.brands[0]?.canonical_name, '萊爾富')
  })

  it('resolveBrandNutritionUrl returns known or search fallback', () => {
    assert.match(resolveBrandNutritionUrl('萊爾富'), /hilife/)
    assert.match(resolveBrandNutritionUrl('未知品牌XYZ'), /google\.com\/search/)
  })
})
