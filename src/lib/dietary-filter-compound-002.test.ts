import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { computeTodayMealState } from '@/lib/engines/next-meal-engine'
import {
  foodAllowedByDiet,
  invalidateDietaryRecommendationCaches,
  normalizeDietaryPreferenceContext,
  normalizeDietaryRestrictions,
} from '@/lib/recommendation/dietary-preference-filter'
import { inferDietaryIngredientGroups } from '@/lib/recommendation/dietary-ingredient-ontology'
import { mealSuggestionAllowedByDiet, rollMealSuggestion } from '@/lib/meal-engine'

const root = new URL('../../', import.meta.url)
const source = (path: string) => readFileSync(new URL(path, root), 'utf8')

class MemoryStorage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

describe('BUGFIX-DIETARY-FILTER-COMPOUND-002', () => {
  it('infers pork and egg from compound dish names', () => {
    const cases = new Map([
      ['排骨飯', ['pork']],
      ['滷肉飯加蛋', ['pork', 'egg']],
      ['去肥控肉飯', ['pork']],
      ['蛋炒飯', ['egg']],
      ['培根蛋堡', ['pork', 'egg']],
      ['大腸臭臭鍋', ['pork']],
    ])
    for (const [name, expected] of cases) {
      const actual = inferDietaryIngredientGroups({ name })
      for (const group of expected) assert.equal(actual.has(group as never), true, `${name}:${group}`)
    }
  })

  it('infers beef, chicken, seafood and dairy compound ingredients', () => {
    const cases = new Map([
      ['牛肉麵', 'beef'],
      ['牛腩飯', 'beef'],
      ['雞腿飯', 'chicken'],
      ['雞胸沙拉', 'chicken'],
      ['海鮮炒麵', 'seafood'],
      ['鮪魚蛋吐司', 'seafood'],
      ['蝦仁炒飯', 'seafood'],
      ['奶油義大利麵', 'dairy'],
      ['起司蛋餅', 'dairy'],
      ['牛奶鍋', 'dairy'],
    ])
    for (const [name, expected] of cases) {
      assert.equal(inferDietaryIngredientGroups({ name }).has(expected as never), true, name)
    }
  })

  it('does not misclassify plant/protein exception phrases', () => {
    const safeCases = [
      ['素肉燥飯', 'pork'],
      ['素雞排', 'chicken'],
      ['高蛋白沙拉', 'egg'],
      ['植物蛋白飲', 'egg'],
      ['椰奶咖哩', 'dairy'],
      ['豆奶', 'dairy'],
      ['燕麥奶', 'dairy'],
      ['杏仁奶', 'dairy'],
    ] as const
    for (const [name, group] of safeCases) {
      assert.equal(inferDietaryIngredientGroups({ name }).has(group), false, name)
    }
  })

  it('enforces the explicit no_pork and no_egg acceptance list', () => {
    const context = { restrictions: ['no_pork', 'no_egg'] }
    for (const name of [
      '排骨飯', '滷肉飯', '滷肉飯加蛋', '去肥控肉飯', '控肉飯', '肉燥飯',
      '豬排飯', '培根蛋堡', '蛋炒飯', '茶葉蛋', '荷包蛋', '蛋餅',
    ]) {
      assert.equal(foodAllowedByDiet({ name }, context), false, name)
    }
    for (const name of ['素肉燥飯', '高蛋白沙拉', '植物蛋白飲', '椰奶咖哩', '燕麥奶', '豆漿']) {
      assert.equal(foodAllowedByDiet({ name }, context), true, name)
    }
  })

  it('maps allergens and no_milk to the strict canonical restrictions', () => {
    const normalized = normalizeDietaryPreferenceContext({
      restrictions: ['no_milk'],
      allergens: ['egg', 'shellfish', 'soy', 'wheat', 'sesame'],
    })
    for (const restriction of ['no_dairy', 'no_egg', 'no_seafood', 'no_soy', 'no_wheat', 'no_sesame']) {
      assert.equal(normalized.restrictions.includes(restriction), true, restriction)
    }
  })

  it('normalizes vegetarian subtype conflicts with explicit exclusions winning', () => {
    assert.deepEqual(
      normalizeDietaryRestrictions(['vegetarian', 'ovo_lacto', 'no_egg', 'no_dairy']),
      ['ovo_lacto_vegetarian', 'no_egg', 'no_dairy']
    )
    const context = { restrictions: ['ovo_lacto_vegetarian', 'no_egg', 'no_dairy'] }
    assert.equal(foodAllowedByDiet({ name: '雞腿飯' }, context), false)
    assert.equal(foodAllowedByDiet({ name: '起司蛋餅' }, context), false)
    assert.equal(foodAllowedByDiet({ name: '豆漿' }, context), true)
  })

  it('never restores excluded candidates when the filtered pool is empty', () => {
    const context = { restrictions: ['no_pork', 'no_egg'] }
    const candidates = ['排骨飯', '滷肉飯加蛋', '蛋炒飯'].map(name => ({ name }))
    const filtered = candidates.filter(item => foodAllowedByDiet(item, context))
    assert.deepEqual(filtered, [])
  })

  it('rejects stale or fallback suggestions in the final defensive gate', () => {
    const unsafeSuggestion = {
      lines: [{ item: { name: '滷肉飯加蛋', tags: [], category: 'lunch' } }],
    }
    assert.equal(
      mealSuggestionAllowedByDiet(unsafeSuggestion as never, {
        restrictions: ['no_pork', 'no_egg'],
      }),
      false
    )
  })

  it('clears dice, recommendation and variant session caches without touching unrelated state', () => {
    const session = new MemoryStorage()
    const local = new MemoryStorage()
    session.setItem('dice-session-2026-07-19-lunch', 'unsafe')
    session.setItem('today-recommendation-cache', 'unsafe')
    session.setItem('dish-variant-cache', 'unsafe')
    session.setItem('betterbit:record:selected-date', 'keep')
    local.setItem('recommendation-cache-v1', 'unsafe')
    local.setItem('dice-queue-v1', 'unsafe')
    local.setItem('bb_today_offline_v1', 'keep')

    const previousWindow = globalThis.window
    const previousSession = globalThis.sessionStorage
    const previousLocal = globalThis.localStorage
    Object.assign(globalThis, {
      window: { dispatchEvent() {} },
      sessionStorage: session,
      localStorage: local,
    })
    try {
      invalidateDietaryRecommendationCaches()
      assert.equal(session.getItem('dice-session-2026-07-19-lunch'), null)
      assert.equal(session.getItem('today-recommendation-cache'), null)
      assert.equal(session.getItem('dish-variant-cache'), null)
      assert.equal(local.getItem('recommendation-cache-v1'), null)
      assert.equal(local.getItem('dice-queue-v1'), null)
      assert.equal(session.getItem('betterbit:record:selected-date'), 'keep')
      assert.equal(local.getItem('bb_today_offline_v1'), 'keep')
    } finally {
      Object.assign(globalThis, {
        window: previousWindow,
        sessionStorage: previousSession,
        localStorage: previousLocal,
      })
    }
  })

  it('keeps 30 orchestrated dice rolls free of pork and egg', () => {
    const dietary = { restrictions: ['no_pork', 'no_egg'] }
    const dayState = {
      ...computeTodayMealState({
        todayFoodLogs: [],
        normalTargetKcal: 2000,
        proteinTargetG: 120,
        fatTargetG: 65,
        carbsTargetG: 250,
        mealSlot: 'lunch',
      }),
      allowDiceAndSuggest: true,
    }
    for (let roll = 0; roll < 30; roll += 1) {
      const result = rollMealSuggestion({
        meal_type: 'lunch',
        daily_targets: { calories: 2000, protein_g: 120, carbs_g: 250, fat_g: 65 },
        day_state: dayState,
        today_food_logs: [],
        seen_ids: [],
        rolls_used: roll,
        dietary_preferences: dietary,
        seed: 1777 + roll * 7919,
      }).suggestion
      assert.equal(mealSuggestionAllowedByDiet(result, dietary), true, `roll ${roll + 1}`)
    }
  })

  it('wires every active pipeline and final UI assembly to the shared filter', () => {
    const files = [
      'src/lib/recommendation/dish-first/engine.ts',
      'src/lib/recommendation/v2/engine.ts',
      'src/lib/eat-out-filters.ts',
      'src/lib/meal-engine.ts',
      'src/components/dashboard/DishRecommendationCard.tsx',
      'src/components/dashboard/TodayOS.tsx',
    ]
    for (const file of files) {
      assert.match(source(file), /foodAllowedByDiet|mealSuggestionAllowedByDiet/, file)
    }
  })

  it('persists normalized settings, rejects server save failure and refreshes runtime state', () => {
    const settings = source('src/components/betterbit-v2/settings/subpages/DietPreferencesSettingsView.tsx')
    const settingsPage = source('src/app/(app)/settings/diet/page.tsx')
    const today = source('src/components/dashboard/TodayOS.tsx')
    assert.match(settings, /if \(!prefRes\.ok\)/)
    assert.match(settings, /persistDietaryPreferenceContext/)
    assert.match(settings, /invalidateSettingsSave/)
    assert.match(settingsPage, /diet_restrictions/)
    assert.match(settings, /invalidateDietaryRecommendationCaches/)
    assert.match(today, /readPersistedDietaryPreferenceContext/)
    assert.match(today, /recommendationProfile\?\.is_vegetarian/)
    assert.match(today, /recommendationProfile\?\.is_vegan/)
    assert.match(today, /betterbit:diet-preferences-changed/)
    assert.match(today, /setDicePreviewByMeal\(\{\}\)/)
  })
})

