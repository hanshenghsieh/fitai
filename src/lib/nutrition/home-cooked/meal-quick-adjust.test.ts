import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildPhotoEstimatedMealDraft, applyUserQuickAdjust } from './meal-quick-adjust.ts'
import { DEFAULT_MEAL_QUICK_ADJUST } from './meal-portion-presets.ts'
import { enrichMealDraftFromLabel } from './meal-template-enrichment.ts'
import { parseMealLabelToDraft } from './parse-meal-label.ts'
import { calculateHomeCookedMeal } from './portion-calculator.ts'

describe('meal quick adjust', () => {
  it('enriches curry rice into rice, chicken, sauce, veg, onion', () => {
    const draft = enrichMealDraftFromLabel(
      parseMealLabelToDraft('白飯 + 日式咖哩雞肉 + 紅蘿蔔 + 馬鈴薯')
    )
    const labels = draft.ingredients.map(i => i.raw_label)
    assert.ok(labels.some(l => /飯/.test(l)))
    assert.ok(labels.some(l => /雞|肉/.test(l)))
    assert.ok(labels.some(l => /咖哩醬|咖喱醬/.test(l)))
    assert.ok(labels.some(l => /紅蘿蔔/.test(l)))
    assert.ok(labels.some(l => /馬鈴薯/.test(l)))
    assert.ok(labels.some(l => /洋蔥/.test(l)))
    assert.equal(draft.meal_cooking_method, 'boiled')
    assert.equal(draft.meal_oil_level, 'light')
  })

  it('applies different grams per ingredient type for normal portion', () => {
    const draft = buildPhotoEstimatedMealDraft('白飯 + 日式咖哩雞肉 + 紅蘿蔔 + 馬鈴薯')
    const rice = draft.ingredients.find(i => /飯/.test(i.raw_label))
    const carrot = draft.ingredients.find(i => /紅蘿蔔/.test(i.raw_label))
    const potato = draft.ingredients.find(i => /馬鈴薯/.test(i.raw_label))
    assert.ok(rice?.amount != null && carrot?.amount != null && potato?.amount != null)
    assert.notEqual(rice.amount, carrot.amount)
    assert.notEqual(carrot.amount, potato.amount)
  })

  it('large portion scales staple more than veg — not same grams for all', () => {
    const normal = buildPhotoEstimatedMealDraft('白飯 + 日式咖哩雞肉 + 紅蘿蔔 + 馬鈴薯')
    const large = applyUserQuickAdjust(normal, { ...DEFAULT_MEAL_QUICK_ADJUST, mealPortion: 'large' })
    const riceN = normal.ingredients.find(i => /飯/.test(i.raw_label))!.amount!
    const riceL = large.ingredients.find(i => /飯/.test(i.raw_label))!.amount!
    const carrotN = normal.ingredients.find(i => /紅蘿蔔/.test(i.raw_label))!.amount!
    const carrotL = large.ingredients.find(i => /紅蘿蔔/.test(i.raw_label))!.amount!
    assert.ok(riceL > riceN)
    assert.ok(carrotL > carrotN)
    assert.notEqual(riceL - riceN, carrotL - carrotN)
  })

  it('stores estimated and adjusted weight meta', () => {
    const draft = buildPhotoEstimatedMealDraft('白飯 + 日式咖哩雞肉 + 紅蘿蔔 + 馬鈴薯')
    assert.ok(draft.ingredient_weights && draft.ingredient_weights.length >= 3)
    const w = draft.ingredient_weights![0]!
    assert.equal(w.estimated_weight_g, w.adjusted_weight_g)
    assert.equal(w.source, 'photo_estimate')

    const adjusted = applyUserQuickAdjust(draft, { ...DEFAULT_MEAL_QUICK_ADJUST, riceLevel: 'more' })
    const riceMeta = adjusted.ingredient_weights?.find(m => /飯/.test(m.raw_label))
    assert.ok(riceMeta)
    assert.equal(riceMeta!.source, 'user_adjusted')
    assert.ok(riceMeta!.adjusted_weight_g >= riceMeta!.estimated_weight_g)
  })

  it('produces calculable meal totals', () => {
    const draft = buildPhotoEstimatedMealDraft('白飯 + 日式咖哩雞肉 + 紅蘿蔔 + 馬鈴薯')
    const totals = calculateHomeCookedMeal(draft)
    assert.ok(totals)
    assert.ok(totals!.calories > 0)
    assert.ok(totals!.protein_g > 0)
  })
})
