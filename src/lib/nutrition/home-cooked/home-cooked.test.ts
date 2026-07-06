import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseMealLabelToDraft } from './parse-meal-label.ts'
import { calculateHomeCookedMeal, isHomeCookedDraftComplete } from './portion-calculator.ts'
import { resolveWholeFoodLabel } from './whole-food-registry.ts'

describe('home-cooked portion flow', () => {
  it('parses composite meal label into ingredients', () => {
    const draft = parseMealLabelToDraft('鮭魚塊 + 豆腐 + 高麗菜 + 紅蘿蔔 + 豆芽菜 + 咖哩醬汁 + 炒絞肉')
    assert.ok(draft.ingredients.length >= 5)
    assert.ok(draft.ingredients.some(i => i.food_id === 'salmon'))
    assert.ok(draft.ingredients.some(i => i.food_id === 'tofu'))
    assert.ok(draft.ingredients.some(i => i.food_id === 'cabbage'))
  })

  it('calculates 200g salmon nutrition', () => {
    const { food } = resolveWholeFoodLabel('鮭魚塊')
    assert.ok(food)
    const draft = parseMealLabelToDraft('鮭魚塊')
    draft.ingredients[0]!.amount = 200
    draft.ingredients[0]!.unit = 'g'
    draft.has_sauce = false
    const totals = calculateHomeCookedMeal(draft)
    assert.ok(totals)
    // salmon 208 kcal/100g → 200g ≈ 416 kcal
    assert.equal(totals!.calories, 416)
    assert.equal(totals!.protein_g, 40)
    assert.equal(isHomeCookedDraftComplete(draft), true)
  })

  it('sums multi-ingredient meal', () => {
    const draft = parseMealLabelToDraft('豆腐 + 高麗菜')
    draft.ingredients.find(i => i.food_id === 'tofu')!.amount = 150
    draft.ingredients.find(i => i.food_id === 'cabbage')!.amount = 100
    const totals = calculateHomeCookedMeal(draft)
    assert.ok(totals)
    assert.ok(totals!.calories > 100)
    assert.equal(totals!.items.length, 2)
  })
})
