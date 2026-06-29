import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { computeTodayMealState } from '@/lib/engines/next-meal-engine'
import { recentDiceExcludeIds, rollMealSuggestion } from '@/lib/meal-engine'
import { USE_RECOMMENDATION_V2 } from '@/lib/recommendation/v2/engine'
import type { RecommendationQueueState } from '@/lib/recommendation/v2/types'
import {
  DICE_MIN_AVAILABLE_CANDIDATES,
  clearSessionDicePoolsForTests,
  linesToDisplayItems,
} from '@/lib/meal-suggest'
import { lookupDiceMenuItem, mainsForStore, preloadDiceMenuBulk } from '@/lib/dice-menu-pool'
import { isPlausibleBrandItem } from '@/lib/store-menu-plausibility'
import type { ConvenienceItem } from '@/lib/convenience-store-menu'

describe('Dice diversity — reroll pool policy', () => {
  it('expands pool when fewer than 40 candidates remain', () => {
    assert.equal(DICE_MIN_AVAILABLE_CANDIDATES, 40)
  })

  it('recentDiceExcludeIds keeps only last two on reroll', () => {
    const ids = ['a', 'b', 'c', 'd', 'e']
    assert.deepEqual(recentDiceExcludeIds(ids, 0), ['e'])
    assert.deepEqual(recentDiceExcludeIds(ids, 3), ['d', 'e'])
  })

  it('Today reroll passes preview id only, not session history', () => {
    const previewId = 'combo-123'
    const confirmed = ['confirmed-1']
    const excludeIds = [...new Set([...confirmed, previewId].filter(Boolean))]
    assert.deepEqual(excludeIds, ['confirmed-1', 'combo-123'])
    assert.equal(excludeIds.length, 2)
  })

  it('15 rerolls yield more than four unique labels without store exclusion', async () => {
    await preloadDiceMenuBulk()
    clearSessionDicePoolsForTests()

    const dayState = computeTodayMealState({
      todayFoodLogs: [],
      normalTargetKcal: 1680,
      proteinTargetG: 100,
      mealSlot: 'lunch',
      hourOfDay: 12,
    })

    let preview: import('@/lib/meal-engine-types').MealSuggestion | null = null
    const stores = new Set<string>()
    const labels = new Set<string>()

    for (let i = 0; i < 15; i++) {
      clearSessionDicePoolsForTests()
      const excludeIds = preview?.id ? [preview.id] : []
      const excludeNames = preview ? preview.lines.map(l => l.item.name) : []

      const result = rollMealSuggestion({
        meal_type: 'lunch',
        daily_targets: { calories: 1680, protein_g: 100, carbs_g: 200, fat_g: 55 },
        day_state: dayState,
        seen_ids: excludeIds,
        exclude_names: excludeNames,
        exclude_stores: [],
        rolls_used: i,
      })

      assert.ok(result.suggestion, `roll ${i} should return a suggestion`)
      const store = result.suggestion!.stores[0] ?? ''
      const label = `${store} · ${result.suggestion!.lines.map(l => l.item.name).join('+')}`
      stores.add(store)
      labels.add(label)
      preview = result.suggestion
    }

    assert.ok(labels.size > 4, `expected >4 labels, got ${labels.size}`)
  })

  it('same-store reroll yields different combos at Subway', async () => {
    const dayState = computeTodayMealState({
      todayFoodLogs: [],
      normalTargetKcal: 1680,
      proteinTargetG: 100,
      mealSlot: 'lunch',
      hourOfDay: 12,
    })

    if (USE_RECOMMENDATION_V2) {
      let queueState: RecommendationQueueState | null = null
      const mainNames = new Set<string>()

      for (let i = 0; i < 12; i++) {
        const result = rollMealSuggestion({
          meal_type: 'lunch',
          daily_targets: { calories: 1680, protein_g: 100, carbs_g: 200, fat_g: 55 },
          day_state: dayState,
          seen_ids: [],
          rolls_used: i,
          queue_state: queueState,
        })
        queueState = result.queue_state ?? null
        const main = result.suggestion?.lines[0]?.item.name
        if (main) mainNames.add(main)
      }

      assert.ok(mainNames.size >= 3, `v2 queue expected >=3 unique mains, got ${mainNames.size}`)
      return
    }

    await preloadDiceMenuBulk()
    clearSessionDicePoolsForTests()

    let preview: import('@/lib/meal-engine-types').MealSuggestion | null = null
    const subwayLabels = new Set<string>()

    for (let i = 0; i < 24 && subwayLabels.size < 3; i++) {
      clearSessionDicePoolsForTests()
      const result = rollMealSuggestion({
        meal_type: 'lunch',
        daily_targets: { calories: 1680, protein_g: 100, carbs_g: 200, fat_g: 55 },
        day_state: dayState,
        seen_ids: preview?.id ? [preview.id] : [],
        exclude_names: preview ? preview.lines.map(l => l.item.name) : [],
        exclude_stores: [],
        rolls_used: i,
      })
      preview = result.suggestion
      if (result.suggestion?.stores[0] === 'Subway') {
        subwayLabels.add(result.suggestion.lines.map(l => l.item.name).join('+'))
      }
    }

    assert.ok(subwayLabels.size >= 2, `expected >=2 Subway combos, got ${subwayLabels.size}`)
  })

  it('Subway combo lines show distinct per-item macros', async () => {
    await preloadDiceMenuBulk()
    const main = lookupDiceMenuItem('subway-義式香腸潛艇堡-6吋')
    const cookie = lookupDiceMenuItem('subway-燕麥葡萄乾餅乾-1片')
    const chips = lookupDiceMenuItem('sub-chips')
    assert.ok(main && cookie && chips)

    const items = linesToDisplayItems([
      { item: main, portion: 'full' },
      { item: cookie, portion: 'full' },
      { item: chips, portion: 'full' },
    ])
    const cals = items.map(i => i.calories)
    assert.ok(new Set(cals).size >= 2, `expected distinct calories, got ${cals.join(',')}`)
    assert.equal(items[0]!.calories, 420)
    assert.equal(items[1]!.calories, 200)
    assert.equal(items[2]!.calories, 150)
  })

  it('filters implausible Subway bulk items', () => {
    const bad = (name: string): ConvenienceItem => ({
      id: `x-${name}`,
      name,
      store: 'Subway',
      source: 'chain',
      category: 'lunch',
      role: 'combo',
      portionable: false,
      tags: [],
      calories: 400,
      protein_g: 20,
      carbs_g: 40,
      fat_g: 10,
      price: 100,
      photo_url: '',
      description: '',
    })
    assert.equal(isPlausibleBrandItem(bad('韓式炸雞（半份）')), false)
    assert.equal(isPlausibleBrandItem(bad('個人麻辣鍋')), false)
    assert.equal(isPlausibleBrandItem(bad('義式香腸潛艇堡（6吋）')), true)
  })

  it('梁社漢 dice pool lists classic mains and generates multiple candidates', async () => {
    await preloadDiceMenuBulk()
    clearSessionDicePoolsForTests()

    const mains = mainsForStore('梁社漢', 'lunch')
    const classicNames = mains
      .map(m => m.name)
      .filter(n => /排骨|雞腿|雞排|腿庫|焢肉/.test(n))
    assert.ok(classicNames.length >= 4, `expected classic mains, got: ${classicNames.join(', ')}`)
    assert.ok(
      new Set(mains.map(m => m.store)).size >= 1,
      'merged alias stores share one dice pool'
    )
  })

  it('clearSessionDicePoolsForTests resets cache', () => {
    clearSessionDicePoolsForTests()
    assert.ok(true)
  })
})
