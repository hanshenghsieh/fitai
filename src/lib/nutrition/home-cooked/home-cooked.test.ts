import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isCompositeMealLabel, parseMealLabelToDraft } from './parse-meal-label.ts'
import { calculateHomeCookedMeal, isHomeCookedDraftComplete } from './portion-calculator.ts'
import { resolveWholeFoodLabel } from './whole-food-registry.ts'
import { lookupMealOilGrams } from './cooking-adjustments.ts'

describe('home-cooked portion flow (BetterBit XLSX model)', () => {
  it('parses composite meal label into ingredients', () => {
    const draft = parseMealLabelToDraft('鮭魚塊 + 豆腐 + 高麗菜 + 紅蘿蔔 + 炒絞肉')
    assert.ok(draft.ingredients.length >= 4)
    assert.ok(draft.ingredients.some(i => i.food_id === 'sf001'))
    assert.ok(draft.ingredients.some(i => i.food_id === 'so001'))
    assert.ok(draft.ingredients.some(i => i.food_id === 'vg004'))
  })

  it('detects composite meal labels', () => {
    assert.equal(isCompositeMealLabel('白飯 + 日式咖哩雞肉 + 紅蘿蔔'), true)
    assert.equal(isCompositeMealLabel('白飯'), false)
  })

  it('calculates 200g salmon from IngredientDB SF001', () => {
    const { food } = resolveWholeFoodLabel('鮭魚塊')
    assert.ok(food)
    assert.equal(food!.id, 'sf001')
    const draft = parseMealLabelToDraft('鮭魚塊')
    draft.ingredients[0]!.amount = 200
    draft.meal_cooking_method = 'steamed'
    draft.meal_oil_level = 'none'
    draft.sauce_level = 'none'
    const totals = calculateHomeCookedMeal(draft)
    assert.ok(totals)
    assert.equal(totals!.calories, 412)
    assert.equal(totals!.protein_g, 44.2)
    assert.equal(isHomeCookedDraftComplete(draft), true)
  })

  it('adds meal oil from Oil_Rules sheet', () => {
    assert.equal(lookupMealOilGrams('stir_fried', 'normal'), 10)
    const draft = parseMealLabelToDraft('鮭魚塊')
    draft.ingredients[0]!.amount = 100
    draft.meal_cooking_method = 'stir_fried'
    draft.meal_oil_level = 'normal'
    draft.sauce_level = 'none'
    const totals = calculateHomeCookedMeal(draft)
    assert.ok(totals)
    assert.equal(totals!.meal_oil_g, 10)
    assert.ok(totals!.calories > 206)
  })

  it('adds sauce from Sauce_Rules sheet', () => {
    const draft = parseMealLabelToDraft('鮭魚塊')
    draft.ingredients[0]!.amount = 100
    draft.sauce_level = 'normal'
    draft.meal_oil_level = 'none'
    draft.meal_cooking_method = 'boiled'
    const totals = calculateHomeCookedMeal(draft)
    assert.ok(totals)
    assert.equal(totals!.calories, 206 + 40)
  })
})
