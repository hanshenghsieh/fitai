import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { classifyDishBand, macroInBand } from './recommendation-qa/macro-bands'
import {
  energyBalanceOk,
  portionPlausible,
  inferNutritionSource,
  auditMenuItem,
} from './recommendation-qa/item-qa'
import { buildRecommendationExplanation } from './recommendation-qa/recommendation-qa'
import type { MealSuggestion } from '@/lib/meal-engine-types'
import { buildRestaurantMenuRegistry } from './restaurant-menu-registry'

describe('recommendation-qa macro bands', () => {
  it('classifies chicken bento', () => {
    assert.equal(classifyDishBand('燒肉飯（飯吃 75%）'), 'chicken_bento')
    assert.equal(classifyDishBand('舒肥雞胸便當'), 'chicken_bento')
    assert.equal(classifyDishBand('滷肉飯'), 'rice_bowl')
  })

  it('flags macro outlier for chicken bento', () => {
    assert.equal(
      macroInBand('chicken_bento', { calories: 380, protein_g: 65, fat_g: 5, carbs_g: 20 }),
      false
    )
    assert.equal(
      macroInBand('chicken_bento', { calories: 520, protein_g: 42, fat_g: 14, carbs_g: 55 }),
      true
    )
  })
})

describe('recommendation-qa nutrition checks', () => {
  it('detects impossible protein density', () => {
    assert.equal(portionPlausible(380, 65, 20, 5), false)
    assert.equal(portionPlausible(520, 42, 55, 14), true)
  })

  it('energy balance tolerance', () => {
    assert.equal(energyBalanceOk(500, 35, 50, 12), true)
    assert.equal(energyBalanceOk(500, 5, 5, 2), false)
  })

  it('infers estimated pending source', () => {
    const tier = inferNutritionSource({
      id: 'x',
      name: '測試',
      store: '測試店',
      source: 'chain',
      category: 'lunch',
      role: 'combo',
      portionable: false,
      tags: [],
      calories: 500,
      protein_g: 20,
      carbs_g: 50,
      fat_g: 15,
      price: 100,
      photo_url: '',
      description: '測試 · 估計營養（待交叉驗證）',
    })
    assert.equal(tier, 'estimated_pending')
  })
})

describe('recommendation-qa explainability', () => {
  it('builds non-empty explanation for protein gap', () => {
    const suggestion: MealSuggestion = {
      id: 'test',
      meal_type: 'lunch',
      lines: [],
      totals: { calories: 450, protein_g: 38, carbs_g: 40, fat_g: 12, price: 120 },
      highlight: '',
      highlight_key: 'high_protein',
      stores: ['7-11'],
      nutrition_score: 80,
    }
    const text = buildRecommendationExplanation(suggestion, {
      meal_type: 'lunch',
      daily_targets: { calories: 1800, protein_g: 120, carbs_g: 180, fat_g: 55 },
      day_state: {
        alreadyCalories: 600,
        alreadyProtein: 30,
        todayTarget: 1800,
        remainingCalories: 1200,
        proteinGap: 70,
        recoveryActive: false,
        overTargetProtection: false,
        skipMealRecommendation: false,
        allowDiceAndSuggest: true,
        highProteinPriority: true,
        weeklyProtectionActive: false,
        adaptiveMetabolismActive: false,
        sleepProtectionActive: false,
        effectiveMealCalTarget: 720,
        effectiveMealProteinTarget: 48,
      },
    })
    assert.ok(text.includes('蛋白質'))
    assert.ok(text.length > 30)
  })
})

describe('recommendation-qa item audit', () => {
  it('marks placeholder bulk item as D', () => {
    const item = {
      id: 'bulk-1',
      name: '韓式炸雞（半份）',
      store: '鼎泰豐',
      source: 'chain' as const,
      category: 'lunch' as const,
      role: 'combo' as const,
      portionable: false,
      tags: [],
      calories: 480,
      protein_g: 28,
      carbs_g: 28,
      fat_g: 28,
      price: 200,
      photo_url: '',
      description: '鼎泰豐 · 韓式炸雞（半份） · 估計營養（待交叉驗證）',
    }
    const registry = buildRestaurantMenuRegistry([item])
    const result = auditMenuItem(item, registry, new Map())
    assert.equal(result.confidence, 'D')
    assert.equal(result.recommendable, false)
    assert.equal(result.placeholder_menu, true)
  })
})
