import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import { validateP0RetailOnrItem, type P0RetailOnrCuratedItem } from '@/lib/nutrition/p0-retail-onr'

const BATCH_PATH = path.join(
  process.cwd(),
  'data/food-kb/staging/p0-onr-verified-batch/brands.json'
)

interface BatchBrand {
  brand_id: string
  canonical_name: string
  store_aliases: string[]
  nutrition_source_url: string
  restaurant_sources: Array<{ priority: string; source_url: string; source_type: string }>
  target_items: number
  status: string
  items: P0RetailOnrCuratedItem[]
}

interface BatchFile {
  batch_id: string
  policy: string
  brands: BatchBrand[]
}

describe('p0 onr verified batch staging', () => {
  const batch = JSON.parse(fs.readFileSync(BATCH_PATH, 'utf8')) as BatchFile

  it('batch file has 10 P0 brands with dual sources', () => {
    assert.equal(batch.batch_id, 'p0-onr-verified-batch')
    assert.equal(batch.policy, 'zero_hallucination')
    assert.equal(batch.brands.length, 10)
    for (const brand of batch.brands) {
      assert.ok(brand.brand_id)
      assert.ok(brand.canonical_name)
      assert.ok(brand.nutrition_source_url.startsWith('https://'))
      assert.ok(brand.restaurant_sources.length >= 2)
      assert.ok(brand.restaurant_sources.every(s => s.source_url.startsWith('https://')))
      assert.equal(brand.target_items, 20)
      assert.equal(brand.status, 'awaiting_onr_verification')
    }
  })

  it('curated items in batch pass P0 retail ONR gate when present', () => {
    for (const brand of batch.brands) {
      for (const item of brand.items) {
        const gate = validateP0RetailOnrItem(item)
        assert.ok(gate.ok, `${brand.canonical_name} / ${item.name}: ${gate.reasons.join(', ')}`)
      }
    }
  })
})
