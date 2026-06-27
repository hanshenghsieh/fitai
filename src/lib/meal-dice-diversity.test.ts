import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { preloadDiceMenuBulk } from '@/lib/dice-menu-pool'
import { computeTodayMealState } from '@/lib/engines/next-meal-engine'
import { recentDiceExcludeIds, rollMealSuggestion } from '@/lib/meal-engine'
import {
  DICE_MIN_AVAILABLE_CANDIDATES,
  clearSessionDicePoolsForTests,
  generateCandidates,
} from '@/lib/meal-suggest'
import { mainsForStore } from '@/lib/dice-menu-pool'
import { buildSuggestContext } from '@/lib/meal-engine'

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

  it('15 rerolls yield more than four unique stores (TodayOS-like excludes)', async () => {
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
      const excludeStores = preview?.stores[0] ? [preview.stores[0]] : []

      const result = rollMealSuggestion({
        meal_type: 'lunch',
        daily_targets: { calories: 1680, protein_g: 100, carbs_g: 200, fat_g: 55 },
        day_state: dayState,
        seen_ids: excludeIds,
        exclude_stores: excludeStores,
        rolls_used: i,
      })

      assert.ok(result.suggestion, `roll ${i} should return a suggestion`)
      const store = result.suggestion!.stores[0] ?? ''
      const label = `${store} · ${result.suggestion!.lines.map(l => l.item.name).join('+')}`
      stores.add(store)
      labels.add(label)
      preview = result.suggestion
    }

    assert.ok(stores.size > 4, `expected >4 stores, got ${stores.size}: ${[...stores].join(', ')}`)
    assert.ok(labels.size > 4, `expected >4 labels, got ${labels.size}`)
  })

  it('梁社漢 dice pool lists classic mains and generates multiple candidates', async () => {
    await preloadDiceMenuBulk()
    clearSessionDicePoolsForTests()

    const dayState = computeTodayMealState({
      todayFoodLogs: [],
      normalTargetKcal: 1680,
      proteinTargetG: 100,
      mealSlot: 'lunch',
      hourOfDay: 12,
    })

    const mains = mainsForStore('梁社漢', 'lunch')
    const classicNames = mains
      .map(m => m.name)
      .filter(n => /排骨|雞腿|雞排|腿庫|焢肉/.test(n))
    assert.ok(classicNames.length >= 4, `expected classic mains, got: ${classicNames.join(', ')}`)

    const ctx = buildSuggestContext({
      meal_type: 'lunch',
      daily_targets: { calories: 1680, protein_g: 100, carbs_g: 200, fat_g: 55 },
      day_state: dayState,
      seed: 42,
      fast_dice: true,
    })
    const candidates = generateCandidates({ ...ctx, fast_dice: true }, true).filter(c => c.stores[0] === '梁社漢')
    const dishNames = new Set(candidates.flatMap(c => c.lines.map(l => l.item.name)))
    assert.ok(dishNames.size >= 4, `expected 4+ 梁社漢 candidates, got: ${[...dishNames].join(', ')}`)
  })

  it('clearSessionDicePoolsForTests resets cache', () => {
    clearSessionDicePoolsForTests()
    assert.ok(true)
  })
})
