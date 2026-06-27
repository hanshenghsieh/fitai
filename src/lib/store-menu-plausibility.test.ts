import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { ConvenienceItem } from './convenience-store-menu'
import { isPlausibleBrandItem } from './store-menu-plausibility'

function item(partial: Partial<ConvenienceItem> & Pick<ConvenienceItem, 'name' | 'store'>): ConvenienceItem {
  return {
    id: partial.id ?? `${partial.store}-${partial.name}`,
    name: partial.name,
    store: partial.store,
    source: partial.source ?? 'chain',
    category: partial.category ?? 'lunch',
    role: partial.role ?? 'main',
    portionable: false,
    tags: [],
    calories: partial.calories ?? 500,
    protein_g: partial.protein_g ?? 20,
    carbs_g: 0,
    fat_g: 0,
    price: partial.price ?? 120,
    photo_url: '',
    description: '',
  }
}

describe('store-menu-plausibility', () => {
  it('blocks KFC 香雞飯', () => {
    assert.equal(
      isPlausibleBrandItem(item({ store: '肯德基', name: '香雞飯套餐' })),
      false
    )
    assert.equal(isPlausibleBrandItem(item({ store: '肯德基', name: '香雞飯' })), false)
  })

  it('allows KFC real items like 咔啦脆雞腿堡', () => {
    assert.equal(
      isPlausibleBrandItem(item({ store: '肯德基', name: '咔啦脆雞腿堡' })),
      true
    )
    assert.equal(isPlausibleBrandItem(item({ store: '肯德基', name: '蛋塔（1個）' })), true)
  })

  it('blocks 三商巧福 酸辣湯', () => {
    assert.equal(isPlausibleBrandItem(item({ store: '三商巧福', name: '酸辣湯' })), false)
  })

  it('allows 八方雲集 酸辣湯', () => {
    assert.equal(isPlausibleBrandItem(item({ store: '八方雲集', name: '酸辣湯' })), true)
  })

  it('allows 三商巧福 real items like 牛肉麵', () => {
    assert.equal(isPlausibleBrandItem(item({ store: '三商巧福', name: '原味牛肉麵' })), true)
    assert.equal(isPlausibleBrandItem(item({ store: '三商巧福', name: '水餃（10顆）' })), true)
  })

  it('blocks cafeteria sides on KFC', () => {
    assert.equal(isPlausibleBrandItem(item({ store: '肯德基', name: '白飯（一碗）' })), false)
    assert.equal(isPlausibleBrandItem(item({ store: '肯德基', name: '滷肉飯' })), false)
  })

  it('blocks 三商巧福 bulk fastfood templates', () => {
    assert.equal(isPlausibleBrandItem(item({ store: '三商巧福', name: '咔啦脆雞堡' })), false)
    assert.equal(isPlausibleBrandItem(item({ store: '三商巧福', name: '夏威夷披薩（8吋）' })), false)
  })
})
