import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  validateP0RetailOnrItem,
  type P0RetailOnrCuratedItem,
} from '@/lib/nutrition/p0-retail-onr'

const GOOD: P0RetailOnrCuratedItem = {
  name: '測試茶葉蛋',
  calories: 80,
  protein: 7,
  fat: 5,
  carbs: 1,
  source_url: 'https://www.hilife.com.tw/productInfo_food.aspx',
  source_type: 'official_website',
  source_name: '萊爾富 官方',
  verified_at: '2026-06-27T00:00:00.000Z',
  verified_by: 'founder-qa',
  verification_count: 2,
  confidence: 'A',
  last_reviewed: '2026-06-27T00:00:00.000Z',
}

describe('p0-retail-onr quality gate', () => {
  it('accepts A/B with full macros and source_url', () => {
    assert.equal(validateP0RetailOnrItem(GOOD).ok, true)
  })

  it('rejects missing macros', () => {
    const r = validateP0RetailOnrItem({ ...GOOD, protein: NaN })
    assert.equal(r.ok, false)
    assert.ok(r.reasons.some(x => x.includes('protein')))
  })

  it('rejects forbidden delivery sources', () => {
    const r = validateP0RetailOnrItem({
      ...GOOD,
      source_url: 'https://www.ubereats.com/tw/store/foo',
    })
    assert.equal(r.ok, false)
  })

  it('rejects non A/B confidence', () => {
    const r = validateP0RetailOnrItem({ ...GOOD, confidence: 'C' })
    assert.equal(r.ok, false)
  })
})
