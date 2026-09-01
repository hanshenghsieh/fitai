import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { drink } from './helpers'

describe('drink() — single named-field API', () => {
  it('maps calories correctly', () => {
    assert.equal(drink({ name: 'X', calories: 120, protein_g: 0, carbs_g: 30, price: 35 }).calories, 120)
  })

  it('maps protein_g correctly', () => {
    assert.equal(drink({ name: 'X', calories: 120, protein_g: 7, carbs_g: 30, price: 35 }).protein_g, 7)
  })

  it('maps carbs_g correctly', () => {
    assert.equal(drink({ name: 'X', calories: 120, protein_g: 0, carbs_g: 42, price: 35 }).carbs_g, 42)
  })

  it('maps fat_g correctly when given explicitly', () => {
    assert.equal(drink({ name: 'X', calories: 120, protein_g: 0, carbs_g: 30, fat_g: 6, price: 35 }).fat_g, 6)
  })

  it('maps price correctly', () => {
    assert.equal(drink({ name: 'X', calories: 120, protein_g: 0, carbs_g: 30, price: 88 }).price, 88)
  })

  it('preserves tags', () => {
    const item = drink({ name: 'X', calories: 100, protein_g: 0, carbs_g: 20, price: 30, tags: ['bubble_tea'] })
    assert.deepEqual(item.tags, ['drink', 'bubble_tea'])
  })

  it('preserves aliases', () => {
    const item = drink({ name: 'X', calories: 100, protein_g: 0, carbs_g: 20, price: 30, aliases: ['冬瓜飲', '冬瓜露'] })
    assert.deepEqual(item.aliases, ['冬瓜飲', '冬瓜露'])
  })

  it('zero-protein drinks remain zero-protein (no hidden default)', () => {
    assert.equal(drink({ name: 'X', calories: 100, protein_g: 0, carbs_g: 25, price: 30 }).protein_g, 0)
  })

  it('zero-fat drinks remain zero-fat when fat_g is explicitly 0', () => {
    assert.equal(drink({ name: 'X', calories: 100, protein_g: 0, carbs_g: 25, fat_g: 0, price: 30 }).fat_g, 0)
  })

  it('a high-carb drink does not become high-protein (no field confusion)', () => {
    const item = drink({ name: 'X', calories: 400, protein_g: 0, carbs_g: 100, price: 50 })
    assert.equal(item.protein_g, 0)
    assert.equal(item.carbs_g, 100)
  })

  it('honors an explicit meal_category instead of silently forcing lunch', () => {
    // The old overload hard-coded meal_category: 'lunch' unconditionally,
    // ignoring any extra.meal_category the call site specified — this
    // silently miscategorized breakfast drinks (米漿/豆漿/紅茶) as lunch items.
    const item = drink({ name: '米漿', calories: 180, protein_g: 4, carbs_g: 28, fat_g: 6, price: 30, meal_category: 'breakfast' })
    assert.equal(item.meal_category, 'breakfast')
  })

  it('defaults meal_category to lunch when not specified (unchanged default)', () => {
    const item = drink({ name: 'X', calories: 100, protein_g: 0, carbs_g: 20, price: 30 })
    assert.equal(item.meal_category, 'lunch')
  })

  it('defaults fat_g to 10% of carbs_g only when genuinely unknown', () => {
    const item = drink({ name: 'X', calories: 100, protein_g: 0, carbs_g: 40, price: 30 })
    assert.equal(item.fat_g, 4)
  })

  it('defaults sugar_g to 70% of carbs_g only when genuinely unknown', () => {
    const item = drink({ name: 'X', calories: 100, protein_g: 0, carbs_g: 40, price: 30 })
    assert.equal(item.sugar_g, 28)
  })

  it('reproduces the exact 冬瓜茶 bug shape correctly — regression for the original corruption', () => {
    // Old positional call `drink('冬瓜茶', 120, 0, 30, 0, 35, {...})`-equivalent
    // intent: calories=120, protein=0, carbs=30, fat=0, price=35. The named
    // form must produce exactly this — no field can silently land elsewhere.
    const item = drink({ name: '冬瓜茶', calories: 120, protein_g: 0, carbs_g: 30, fat_g: 0, price: 35 })
    assert.equal(item.calories, 120)
    assert.equal(item.protein_g, 0)
    assert.equal(item.carbs_g, 30)
    assert.equal(item.fat_g, 0)
    assert.equal(item.price, 35)
  })

  it('reproduces the exact 米漿 bug shape correctly — regression for the 7-argument corruption', () => {
    // Old call `drink('米漿（中杯）', 180, 4, 28, 6, 30, {...})` had one
    // argument too many for the 6-param overload; the trailing options
    // object was silently dropped and price/fat/carbs all landed wrong.
    const item = drink({ name: '米漿（中杯）', calories: 180, protein_g: 4, carbs_g: 28, fat_g: 6, price: 30, meal_category: 'breakfast' })
    assert.equal(item.protein_g, 4)
    assert.equal(item.carbs_g, 28)
    assert.equal(item.fat_g, 6)
    assert.equal(item.price, 30)
    assert.equal(item.meal_category, 'breakfast')
  })

  it('reproduces the exact 可樂 bug shape correctly', () => {
    const item = drink({ name: '可樂（中杯）', calories: 180, protein_g: 0, carbs_g: 46, fat_g: 0, price: 35 })
    assert.equal(item.protein_g, 0)
    assert.equal(item.carbs_g, 46)
    assert.equal(item.fat_g, 0)
    assert.equal(item.price, 35)
  })
})
