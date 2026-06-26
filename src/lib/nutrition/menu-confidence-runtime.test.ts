import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import {
  evaluateMenuItemConfidence,
  isRuntimeRecommendable,
  isRuntimeSearchable,
} from './menu-confidence-runtime'
import { buildRestaurantMenuRegistry } from './restaurant-menu-registry'
import { restaurantVerificationOk, detectNutritionConflicts } from './menu-backfill/verification'

function item(partial: Partial<ConvenienceItem> & Pick<ConvenienceItem, 'id' | 'name' | 'store'>): ConvenienceItem {
  return {
    category: 'lunch',
    source: 'chain',
    role: 'combo',
    portionable: false,
    tags: [],
    calories: 520,
    protein_g: 42,
    carbs_g: 55,
    fat_g: 14,
    price: 120,
    photo_url: '',
    description: '官方營養參考',
    ...partial,
  }
}

describe('menu-confidence-runtime', () => {
  it('blocks placeholder items (D)', () => {
    const placeholder = item({
      id: 'x-1',
      name: '韓式炸雞（半份）',
      store: '鼎泰豐',
      description: '估計營養（待交叉驗證）',
    })
    assert.equal(evaluateMenuItemConfidence(placeholder), 'D')
    assert.equal(isRuntimeRecommendable(placeholder), false)
    assert.equal(isRuntimeSearchable(placeholder), false)
  })

  it('allows official nutrition convenience items (A/B)', () => {
    const ok = item({
      id: 'test-7-11-official-1',
      name: '京醬鴨絲飯',
      store: '7-11',
      source: 'convenience',
      description: '京醬鴨絲飯：31g 蛋白質，500 kcal',
    })
    const reg = buildRestaurantMenuRegistry([ok])
    const grade = evaluateMenuItemConfidence(ok, reg)
    assert.ok(grade === 'A' || grade === 'B')
    assert.equal(isRuntimeRecommendable(ok), true)
  })

  it('marks estimated pending as C (search only)', () => {
    const pending = item({
      id: 'est-1',
      name: '測試餐',
      store: '7-11',
      description: '測試 · 估計營養（待交叉驗證）',
    })
    assert.equal(evaluateMenuItemConfidence(pending), 'D')
  })
})

describe('menu-backfill verification', () => {
  it('requires 2+ source priorities for restaurant', () => {
    const bad = restaurantVerificationOk({
      canonical_name: '王品牛排',
      restaurant_sources: [
        {
          priority: 'A',
          source_type: 'official_website',
          source_url: 'https://example.com',
          observed_at: '2026-01-01',
        },
      ],
      items: [],
      status: 'draft',
    })
    assert.equal(bad.ok, false)

    const good = restaurantVerificationOk({
      canonical_name: '王品牛排',
      restaurant_sources: [
        {
          priority: 'A',
          source_type: 'official_website',
          source_url: 'https://example.com/menu',
          observed_at: '2026-01-01',
        },
        {
          priority: 'B',
          source_type: 'ubereats',
          source_url: 'https://ubereats.com/store',
          observed_at: '2026-01-01',
        },
      ],
      items: [],
      status: 'draft',
    })
    assert.equal(good.ok, true)
  })

  it('flags nutrition conflicts without averaging', () => {
    const conflicts = detectNutritionConflicts([
      {
        priority: 'A',
        source_type: 'official_website',
        source_url: 'https://a.com',
        observed_at: '2026-01-01',
        nutrition: { calories: 500, protein_g: 30 },
      },
      {
        priority: 'B',
        source_type: 'ubereats',
        source_url: 'https://b.com',
        observed_at: '2026-01-01',
        nutrition: { calories: 620, protein_g: 38 },
      },
    ])
    assert.ok(conflicts.some(c => c.field === 'calories' && c.threshold_exceeded))
  })
})
