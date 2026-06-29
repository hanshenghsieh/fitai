import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getRecommendationFoodsV2 } from './food-data'
import { isMainRecommendableItem, filterMainRecommendablePool } from './pool-rules'
import { scoreMealForUserToday, tierFilter } from './score-meal'
import {
  buildRecommendationQueue,
  countBrandInQueue,
  queueHasUniqueIds,
} from './queue'
import {
  buildRecommendationReasons,
  confidenceDisplayLabel,
  confidenceDisclaimer,
  pickRecommendationWithFallback,
} from './reason-copy'
import {
  formatRecommendationCalories,
  formatRecommendationMacroGrams,
  usesApproximatePrefix,
} from './display-macro'
import { rollRecommendationV2 } from './engine'
import type { RecommendationFoodV2, UserNutritionState } from './types'
import { OFFICIAL_TRUST_BONUS } from './types'
import { computeTodayMealState } from '@/lib/engines/next-meal-engine'

const items = getRecommendationFoodsV2()

function baseState(overrides: Partial<UserNutritionState> = {}): UserNutritionState {
  return {
    remainingCalories: 800,
    proteinGap: 28,
    remainingFat: 40,
    remainingCarbs: 120,
    mealTime: 'lunch',
    effectiveMealCalTarget: 520,
    ...overrides,
  }
}

function findByRole(role: RecommendationFoodV2['meal_role']): RecommendationFoodV2 {
  const found = items.find(i => i.meal_role === role)
  assert.ok(found, `missing fixture for role ${role}`)
  return found
}

function findMainEstimated(): RecommendationFoodV2 {
  const found = items.find(i => i.confidence_level === 'estimated' && isMainRecommendableItem(i))
  assert.ok(found)
  return found
}

function findMainOfficial(): RecommendationFoodV2 {
  const found = items.find(i => i.confidence_level === 'official' && isMainRecommendableItem(i))
  assert.ok(found)
  return found
}

describe('recommendation v2 pool rules', () => {
  it('soup cannot be main recommendation', () => {
    assert.equal(isMainRecommendableItem(findByRole('soup')), false)
  })
  it('drink cannot be main recommendation', () => {
    assert.equal(isMainRecommendableItem(findByRole('drink')), false)
  })
  it('side cannot be main recommendation', () => {
    assert.equal(isMainRecommendableItem(findByRole('side')), false)
  })
  it('snack cannot be main recommendation', () => {
    assert.equal(isMainRecommendableItem(findByRole('snack')), false)
  })
  it('dessert cannot be main recommendation', () => {
    assert.equal(isMainRecommendableItem(findByRole('dessert')), false)
  })
  it('estimated data can enter main recommendation pool', () => {
    assert.equal(isMainRecommendableItem(findMainEstimated()), true)
  })
  it('low_estimate is excluded from main recommendation pool by default', () => {
    const low = items.find(i => i.confidence_level === 'low_estimate')
    assert.ok(low)
    assert.equal(isMainRecommendableItem(low!), false)
  })
})

describe('recommendation v2 queue', () => {
  it('queue has no duplicate item ids', () => {
    const queue = buildRecommendationQueue(items, baseState(), [], 42)
    assert.equal(queueHasUniqueIds(queue), true)
  })
  it('recently shown ids are excluded from scoring', () => {
    const pool = filterMainRecommendablePool(items, 'lunch')
    const target = pool[0]!
    const scored = scoreMealForUserToday({
      item: target,
      remainingCalories: 800,
      proteinGap: 28,
      remainingFat: 40,
      remainingCarbs: 120,
      mealTime: 'lunch',
      recentlyShownIds: [target.id],
      effectiveMealCalTarget: 520,
    })
    assert.equal(scored.excluded, true)
  })
  it('same brand appears at most 3 times in a 20-item queue', () => {
    const queue = buildRecommendationQueue(items, baseState(), [], 99)
    assert.ok(countBrandInQueue(queue, items) <= 3)
  })
})

describe('recommendation v2 scoring', () => {
  it('official data receives trust bonus over estimated at same macros', () => {
    const est = findMainEstimated()
    const off = findMainOfficial()
    const state = baseState()
    const baseInput = { ...state, recentlyShownIds: [] as string[] }
    const estScore = scoreMealForUserToday({ item: est, ...baseInput }).score
    const offScore = scoreMealForUserToday({ item: off, ...baseInput }).score
    assert.ok(offScore - estScore >= OFFICIAL_TRUST_BONUS - 15)
  })

  it('high protein items rank above low protein when protein gap is high', () => {
    const high = items.find(i => i.name.includes('舒肥雞胸餐盒'))!
    const low = items.find(i => i.name.includes('鮪魚沙拉捲'))!
    const state = baseState({ proteinGap: 40, remainingCalories: 900 })
    const highScore = scoreMealForUserToday({ item: high, ...state, recentlyShownIds: [] }).score
    const lowScore = scoreMealForUserToday({ item: low, ...state, recentlyShownIds: [] }).score
    assert.ok(highScore > lowScore)
  })

  it('high calorie items are downranked when remaining calories are low', () => {
    const heavy = items.find(i => i.name.includes('滷雞腿便當') && i.name.includes('正常飯'))!
    const light = items.find(i => i.name === '雞胸肉＋地瓜＋茶葉蛋')!
    const state = baseState({ remainingCalories: 380, proteinGap: 10, effectiveMealCalTarget: 350 })
    const heavyScore = scoreMealForUserToday({ item: heavy, ...state, recentlyShownIds: [] }).score
    const lightScore = scoreMealForUserToday({ item: light, ...state, recentlyShownIds: [] }).score
    assert.ok(lightScore > heavyScore)
  })
})

describe('recommendation v2 display', () => {
  it('estimated data shows 約 prefix', () => {
    assert.equal(usesApproximatePrefix('estimated'), true)
    assert.match(formatRecommendationCalories(520, 'estimated'), /^約 /)
    assert.match(formatRecommendationMacroGrams(31, '蛋白質', 'estimated'), /約/)
  })
  it('official data does not force 約 prefix', () => {
    assert.equal(usesApproximatePrefix('official'), false)
    assert.equal(formatRecommendationCalories(520, 'official'), '520 kcal')
    assert.equal(formatRecommendationMacroGrams(31, '蛋白質', 'official'), '蛋白質 31g')
  })
})

describe('recommendation v2 fallback', () => {
  it('fallback never returns soup drink snack dessert as main', () => {
    const blockedRoles = new Set(['soup', 'drink', 'side', 'snack', 'dessert'])
    for (const tier of [1, 2, 3, 4, 5] as const) {
      for (const item of tierFilter(items, tier, { remainingCalories: 1200, proteinGap: 50, mealTime: 'lunch' })) {
        assert.equal(blockedRoles.has(item.meal_role), false)
      }
    }
    const result = pickRecommendationWithFallback(items, baseState({ remainingCalories: 200, proteinGap: 60 }), [], null)
    assert.ok(result)
    assert.equal(blockedRoles.has(result!.primary.meal_role), false)
  })
})

describe('recommendation v2 confidence copy', () => {
  it('estimated shows standard portion disclaimer', () => {
    assert.equal(confidenceDisplayLabel('estimated'), '標準份量估算')
    assert.match(confidenceDisclaimer('estimated') ?? '', /標準份量/)
  })
  it('official shows official label', () => {
    assert.equal(confidenceDisplayLabel('official'), '官方營養資料')
    assert.equal(confidenceDisclaimer('official'), null)
  })
  it('recommendation reasons vary by confidence_level', () => {
    const official = findMainOfficial()
    const estimated = findMainEstimated()
    const offReasons = buildRecommendationReasons({ item: official, addons: [], state: baseState(), tier: 1 })
    const estReasons = buildRecommendationReasons({ item: estimated, addons: [], state: baseState(), tier: 1 })
    assert.equal(offReasons.reasons[0]?.code, 'trust_official')
    assert.equal(estReasons.reasons[0]?.code, 'trust_estimated')
  })
})

describe('recommendation v2 engine integration', () => {
  it('rollRecommendationV2 returns suggestion with reasons', () => {
    const dayState = computeTodayMealState({
      todayFoodLogs: [],
      normalTargetKcal: 1800,
      proteinTargetG: 120,
      mealSlot: 'lunch',
    })
    const result = rollRecommendationV2({
      meal_type: 'lunch',
      daily_targets: { calories: 1800, protein_g: 120, carbs_g: 180, fat_g: 60 },
      day_state: dayState,
      today_food_logs: [],
      seed: 7,
    })
    assert.ok(result.suggestion)
    assert.ok(result.suggestion!.recommendation_reason?.length)
  })

  it('sequential queue picks different ids on next roll', () => {
    const dayState = computeTodayMealState({
      todayFoodLogs: [],
      normalTargetKcal: 1800,
      proteinTargetG: 120,
      mealSlot: 'lunch',
    })
    const first = rollRecommendationV2({
      meal_type: 'lunch',
      daily_targets: { calories: 1800, protein_g: 120, carbs_g: 180, fat_g: 60 },
      day_state: dayState,
      today_food_logs: [],
      seed: 11,
    })
    const second = rollRecommendationV2({
      meal_type: 'lunch',
      daily_targets: { calories: 1800, protein_g: 120, carbs_g: 180, fat_g: 60 },
      day_state: dayState,
      today_food_logs: [],
      queue_state: first.queue_state,
      seed: 11,
    })
    assert.ok(first.suggestion && second.suggestion)
    if (first.queue_state && first.queue_state.itemIds.length > 1) {
      assert.notEqual(first.suggestion!.id, second.suggestion!.id)
    }
  })

  it('exclude_names skips blocked meals on reroll', () => {
    const dayState = computeTodayMealState({
      todayFoodLogs: [],
      normalTargetKcal: 1916,
      proteinTargetG: 89,
      mealSlot: 'dinner',
      hourOfDay: 1,
    })
    const blockedState = {
      ...dayState,
      alreadyCalories: 1600,
      remainingCalories: 316,
      proteinGap: 14,
      todayTarget: 1916,
      effectiveMealCalTarget: 316,
      allowDiceAndSuggest: true,
      overTargetProtection: false,
      skipMealRecommendation: false,
    }
    const first = rollRecommendationV2({
      meal_type: 'dinner',
      daily_targets: { calories: 1916, protein_g: 89, carbs_g: 262, fat_g: 68, water_ml: 2310 },
      day_state: blockedState,
      today_food_logs: [],
      seed: 42,
    })
    assert.ok(first.suggestion)
    const blockedName = first.suggestion!.lines[0]!.item.name
    const second = rollRecommendationV2({
      meal_type: 'dinner',
      daily_targets: { calories: 1916, protein_g: 89, carbs_g: 262, fat_g: 68, water_ml: 2310 },
      day_state: blockedState,
      today_food_logs: [],
      exclude_names: [blockedName],
      seed: 43,
    })
    assert.ok(second.suggestion)
    assert.notEqual(second.suggestion!.lines[0]!.item.name, blockedName)
  })
})
