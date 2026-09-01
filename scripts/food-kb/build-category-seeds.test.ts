import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildCategoryItems, validateGeneratedDrinks, type RuntimeMenuItem } from './build-category-seeds'
import { energyBalanceOk } from '@/lib/nutrition/menu-confidence-core'

function makeDrink(overrides: Partial<RuntimeMenuItem> & { id: string; name: string }): RuntimeMenuItem {
  return {
    store: '測試品牌',
    source: 'chain',
    category: 'lunch',
    role: 'drink',
    portionable: false,
    tags: [],
    calories: 100,
    protein_g: 0,
    carbs_g: 25,
    fat_g: 0,
    price: 30,
    photo_url: '',
    description: '測試',
    kb_category: 'bubbletea',
    ...overrides,
  }
}

describe('data invariant — reuses the existing energy-balance tolerance, no competing definition', () => {
  it('a well-formed generated drink satisfies energyBalanceOk (protein*4 + carbs*4 + fat*9 within tolerance of calories)', () => {
    const items = buildCategoryItems('bubbletea').filter(i => i.role === 'drink' && i.name === '冬瓜茶（大杯）')
    assert.ok(items.length > 0, 'expected at least one 冬瓜茶（大杯） in the generated bubbletea category')
    for (const item of items) {
      assert.equal(
        energyBalanceOk(item.calories, item.protein_g, item.carbs_g, item.fat_g),
        true,
        `${item.id} should satisfy the same energy-balance tolerance the production gate uses`
      )
    }
  })
})

describe('validateGeneratedDrinks — generator-time structural check', () => {
  it('flags a severe mismatch matching the original corruption signature (protein/carbs/fat swapped)', () => {
    const items = [makeDrink({ id: 'bad', name: '測試茶', calories: 80, protein_g: 3, carbs_g: 38, fat_g: 18 })]
    const issues = validateGeneratedDrinks(items)
    assert.equal(issues.length, 1)
    assert.equal(issues[0]!.severity, 'severe')
  })

  it('does not flag a well-balanced drink', () => {
    const items = [makeDrink({ id: 'good', name: '測試茶', calories: 180, protein_g: 0, carbs_g: 40, fat_g: 0 })]
    assert.deepEqual(validateGeneratedDrinks(items), [])
  })

  it('does not flag a near-zero-calorie tea hitting the tweak() floor-of-1 artifact', () => {
    const items = [makeDrink({ id: 'zero', name: '無糖綠茶', calories: 1, protein_g: 0, carbs_g: 0, fat_g: 0 })]
    assert.deepEqual(validateGeneratedDrinks(items), [])
  })

  it('treats mild pre-existing recipe imprecision as a warning, not severe', () => {
    // ratio 0.60 — outside the tight production band but nowhere near the
    // 3-4x mismatch signature of an actual argument-mapping bug.
    const items = [makeDrink({ id: 'mild', name: '拿鐵', calories: 170, protein_g: 12, carbs_g: 8, fat_g: 0 })]
    const issues = validateGeneratedDrinks(items)
    assert.equal(issues.length, 1)
    assert.equal(issues[0]!.severity, 'warning')
  })

  it('ignores non-drink roles', () => {
    const items = [makeDrink({ id: 'meal', name: '測試餐', role: 'combo', calories: 80, protein_g: 3, carbs_g: 38, fat_g: 18 })]
    assert.deepEqual(validateGeneratedDrinks(items), [])
  })
})

describe('bubbleteaBank() output — regression for the original corruption', () => {
  it('produces internally consistent, distinct macros per flavor (not swapped)', () => {
    const items = buildCategoryItems('bubbletea')
    const dongGua = items.find(i => i.name === '冬瓜茶（大杯）' && i.store === '迷客夏')
    assert.ok(dongGua)
    if (dongGua) {
      assert.equal(dongGua.protein_g, 0)
      assert.ok(dongGua.carbs_g > 20, 'carbs_g should carry the real carbohydrate value, not a swapped-in fat value')
      assert.equal(energyBalanceOk(dongGua.calories, dongGua.protein_g, dongGua.carbs_g, dongGua.fat_g), true)
    }
  })
})

describe('米漿 / 可樂 — regenerated output is correct', () => {
  it('米漿（中杯） has real protein and a plausible price (not the old $10 floor artifact)', () => {
    const items = buildCategoryItems('breakfast')
    const miJiang = items.find(i => i.name === '米漿（中杯）')
    assert.ok(miJiang)
    if (miJiang) {
      assert.ok(miJiang.protein_g >= 3, 'should carry the real protein value (~4g), not the old flat default')
      assert.ok(miJiang.price >= 25, 'should carry the real price (~$30), not the old misrouted/floored value')
      assert.equal(miJiang.category, 'breakfast', 'meal_category override must be honored, not silently forced to lunch')
    }
  })

  it('可樂（中杯） carries zero protein/fat and a plausible price', () => {
    const items = buildCategoryItems('fastfood')
    const cola = items.find(i => i.name === '可樂（中杯）')
    assert.ok(cola)
    if (cola) {
      assert.equal(cola.protein_g, 0)
      assert.equal(cola.fat_g, 0)
      assert.ok(cola.price >= 30, 'should carry the real price (~$35), not the old misrouted/floored value')
    }
  })
})
