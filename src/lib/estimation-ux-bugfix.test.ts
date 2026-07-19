import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import {
  classifyEstimatedFood,
  createEstimatedFoodItem,
  estimatedWeightForDraft,
} from '@/lib/nutrition/estimated-meal-model'
import {
  calculateFoodRecordNutrition,
  defaultFoodRecordDraft,
} from '@/lib/nutrition/p0-common-foods/calculate'
import { applyFoodRecordToLog } from '@/lib/nutrition/p0-common-foods/apply-to-log'
import type { FoodType, PortionPresetId } from '@/lib/nutrition/p0-common-foods/types'
import { searchFoodMenu } from '@/lib/food-search'

function estimate(name: string, overrideType?: FoodType) {
  const classification = classifyEstimatedFood(name)
  const item = createEstimatedFoodItem(name, classification, overrideType)
  const draft = defaultFoodRecordDraft(item)
  return { classification, item, draft, nutrition: calculateFoodRecordNutrition(item, draft) }
}

function caloriesForPreset(name: string, preset: PortionPresetId): number {
  const { item, draft } = estimate(name)
  const amount = preset === 'small'
    ? item.smallAmount
    : preset === 'large'
      ? item.largeAmount
      : item.normalAmount
  return calculateFoodRecordNutrition(item, { ...draft, portionPreset: preset, amount }).calories
}

describe('BUGFIX-ESTIMATION-UX-001', () => {
  it('classifies 大腸臭臭鍋 as a complete hot-pot meal', () => {
    const result = classifyEstimatedFood('大腸臭臭鍋')
    assert.equal(result.foodType, 'meal')
    assert.equal(result.family, 'hot_pot')
    assert.equal(result.source, 'dish_family')
    assert.equal(result.confidence, 'medium')
  })

  it('uses a whole-meal serving model and reasonable calories for 大腸臭臭鍋', () => {
    const { item, draft, nutrition } = estimate('大腸臭臭鍋')
    assert.equal(item.servingModel, 'whole_meal')
    assert.equal(item.defaultUnit, '份')
    assert.equal(item.normalAmount, 1)
    assert.equal(item.estimatedWeight_g, 650)
    assert.ok(nutrition.calories >= 650 && nutrition.calories <= 850)
    assert.notEqual(item.largeAmount, 220)
    assert.equal(estimatedWeightForDraft(item, draft), 650)
  })

  it('applies consistent 0.8 / 1.0 / 1.2 complete-meal multipliers', () => {
    assert.equal(caloriesForPreset('大腸臭臭鍋', 'small'), 600)
    assert.equal(caloriesForPreset('大腸臭臭鍋', 'normal'), 750)
    assert.equal(caloriesForPreset('大腸臭臭鍋', 'large'), 900)
  })

  it('supports custom whole-meal multipliers without breaking manual nutrition', () => {
    const { item, draft } = estimate('大腸臭臭鍋')
    const custom = { ...draft, portionPreset: 'custom' as const, amount: 1.1 }
    assert.equal(calculateFoodRecordNutrition(item, custom).calories, 825)
    assert.equal(estimatedWeightForDraft(item, custom), 715)
    assert.equal(
      calculateFoodRecordNutrition(item, {
        ...custom,
        manualOverride: { calories: 810, protein_g: 30, carbs_g: 55, fat_g: 35 },
      }).calories,
      810
    )
  })

  it('classifies the acceptance foods into distinct serving types', () => {
    const cases: Array<[string, FoodType]> = [
      ['牛肉麵', 'meal'],
      ['雞胸肉', 'ingredient'],
      ['白飯', 'staple'],
      ['可樂', 'drink'],
      ['醬油', 'sauce'],
      ['洋芋片', 'snack'],
    ]
    for (const [name, expected] of cases) {
      assert.equal(classifyEstimatedFood(name).foodType, expected, name)
    }
  })

  it('provides complete-meal fallbacks for required dish families', () => {
    const cases: Array<[string, string]> = [
      ['大腸臭臭鍋', 'hot_pot'],
      ['牛肉麵', 'beef_noodle'],
      ['雞腿便當', 'bento'],
      ['海鮮義大利麵', 'pasta'],
      ['雞肉咖哩飯', 'curry_rice'],
      ['肉絲炒飯', 'fried_rice'],
      ['豚骨拉麵', 'ramen'],
      ['滷味拼盤', 'luwei_platter'],
      ['早餐套餐', 'breakfast_set'],
      ['雞胸沙拉餐', 'salad_meal'],
    ]
    for (const [name, family] of cases) {
      const classification = classifyEstimatedFood(name)
      assert.equal(classification.foodType, 'meal', name)
      assert.equal(classification.family, family, name)
      const item = createEstimatedFoodItem(name, classification)
      assert.equal(item.servingModel, 'whole_meal', name)
      assert.ok((item.estimatedWeight_g ?? 0) >= 250, `${name} needs a whole-meal display weight`)
    }
  })

  it('only asks for manual type when deterministic metadata and keywords cannot classify', () => {
    const result = classifyEstimatedFood('阿嬤特製金牌料理')
    assert.equal(result.foodType, null)
    assert.equal(result.source, 'unknown')
    assert.equal(result.confidence, 'low')
  })

  it('rebuilds serving and calorie models after a manual type override', () => {
    const classification = classifyEstimatedFood('大腸臭臭鍋')
    const meal = createEstimatedFoodItem('大腸臭臭鍋', classification)
    const ingredient = createEstimatedFoodItem('大腸臭臭鍋', classification, 'ingredient')
    assert.equal(meal.defaultUnit, '份')
    assert.equal(meal.kcalDefault, 750)
    assert.equal(ingredient.defaultUnit, 'g')
    assert.equal(ingredient.baseAmount, 100)
    assert.notEqual(
      calculateFoodRecordNutrition(ingredient, defaultFoodRecordDraft(ingredient)).calories,
      calculateFoodRecordNutrition(meal, defaultFoodRecordDraft(meal)).calories
    )
  })

  it('counts explicitly named hot-pot starch, but never assumes one', () => {
    assert.equal(estimate('大腸臭臭鍋').nutrition.calories, 750)
    assert.equal(estimate('大腸臭臭鍋加王子麵').nutrition.calories, 1030)
  })

  it('preserves the existing add-to-record payload path', () => {
    const { item, draft, nutrition } = estimate('大腸臭臭鍋')
    const log = applyFoodRecordToLog(item, draft, {
      slot: 'dinner',
      source: 'free_text',
      match_type: 'user_custom_estimate',
    })
    assert.equal(log.name, '大腸臭臭鍋')
    assert.equal(log.calories, nutrition.calories)
    assert.equal(log.protein_g, nutrition.protein_g)
    assert.equal(log.slot, 'dinner')
    assert.equal(log.source, 'free_text')
    assert.equal(log.nutrition_status, 'estimated')
  })

  it('prioritizes Chinese compound-dish subjects over ingredient and drink modifiers', () => {
    const cases: Array<[string, FoodType, string]> = [
      ['牛奶海鮮鍋', 'meal', 'hot_pot'],
      ['牛奶鍋', 'meal', 'hot_pot'],
      ['起司牛奶鍋', 'meal', 'hot_pot'],
      ['海鮮火鍋', 'meal', 'hot_pot'],
      ['奶油義大利麵', 'meal', 'pasta'],
      ['番茄牛肉麵', 'meal', 'beef_noodle'],
      ['咖哩牛肉飯', 'meal', 'generic_meal'],
      ['可樂雞翅', 'meal', 'generic_meal'],
      ['啤酒雞', 'meal', 'generic_meal'],
      ['牛奶燕麥粥', 'meal', 'generic_meal'],
    ]
    for (const [name, type, family] of cases) {
      const result = classifyEstimatedFood(name)
      assert.equal(result.foodType, type, name)
      assert.equal(result.family, family, name)
    }
  })

  it('keeps true drinks and ingredient-like foods out of the compound meal fallback', () => {
    const cases: Array<[string, FoodType]> = [
      ['牛奶', 'drink'],
      ['抹茶牛奶', 'drink'],
      ['咖啡牛奶', 'drink'],
      ['茶葉蛋', 'snack'],
    ]
    for (const [name, type] of cases) {
      assert.equal(classifyEstimatedFood(name).foodType, type, name)
    }
  })

  it('uses selected dish metadata before reclassifying the raw query', () => {
    const selected = {
      canonicalName: '海鮮火鍋',
      category: '火鍋',
      foodType: 'meal' as const,
      sourceType: 'database_estimate' as const,
      calories: 850,
      protein_g: 38,
      carbs_g: 58,
      fat_g: 34,
      aliases: ['海鮮鍋'],
      dishTemplateId: 'dish_hot_pot',
      dishVariantId: 'variant_hotpot_seafood',
    }
    const classification = classifyEstimatedFood('牛奶海鮮鍋', selected)
    const item = createEstimatedFoodItem('牛奶海鮮鍋', classification)
    const nutrition = calculateFoodRecordNutrition(item, defaultFoodRecordDraft(item))
    assert.equal(classification.source, 'selected_metadata')
    assert.equal(classification.family, 'hot_pot')
    assert.equal(item.canonicalName, '海鮮火鍋')
    assert.equal(item.defaultUnit, '份')
    assert.equal(item.estimatedWeight_g, 650)
    assert.equal(nutrition.calories, 850)
    assert.equal(nutrition.protein_g, 38)
  })

  it('carries dish search metadata needed by the portion confirmation flow', () => {
    const hits = searchFoodMenu('牛奶海鮮鍋', 8)
    const seafood = hits.find(hit => hit.name === '海鮮火鍋')
    assert.ok(seafood, 'expected 海鮮火鍋 search result')
    assert.equal(seafood.dishTemplateId, 'dish_hot_pot')
    assert.equal(seafood.canonicalCategory, '火鍋')
    assert.equal(seafood.foodType, 'meal')
    assert.equal(seafood.calories, 850)
    assert.ok((seafood.aliases?.length ?? 0) > 0)
  })

  it('gives the footer distinct selected-result and raw-estimate semantics', () => {
    const moreSource = readFileSync(
      new URL('../components/dashboard/today/TodayFoodMore.tsx', import.meta.url),
      'utf8'
    )
    const todaySource = readFileSync(
      new URL('../components/dashboard/TodayOS.tsx', import.meta.url),
      'utf8'
    )
    assert.match(moreSource, /selectedSearchHit/)
    assert.match(moreSource, /onPickSearch\(selected\)/)
    assert.match(moreSource, /onCreateEstimate\(trimmed\)/)
    assert.match(moreSource, /`建立「\$\{trimmed\}」`/)
    assert.doesNotMatch(moreSource, /onClick=\{\(\) => onPickSearch\(item\)\}/)
    assert.match(todaySource, /setPendingEstimate\(\{ query: trimmedQuery \|\| item\.name, selectedHit: item \}\)/)
    assert.match(todaySource, /selectedHit=\{pendingEstimate\?\.selectedHit\}/)
    assert.match(todaySource, /matched_item_label: item\.canonicalName \?\? item\.name/)
  })
})

