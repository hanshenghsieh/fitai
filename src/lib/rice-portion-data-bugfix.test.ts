import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import {
  getP0Catalog,
  getP0FoodById,
  getP0FoodByNormalizedLabel,
} from '@/lib/nutrition/p0-common-foods/catalog'
import {
  calculateFoodRecordNutrition,
  defaultFoodRecordDraft,
  inferPresetFromAmount,
} from '@/lib/nutrition/p0-common-foods/calculate'
import { applyFoodRecordToLog } from '@/lib/nutrition/p0-common-foods/apply-to-log'
import { foodSearchHitForP0, searchFoodMenu } from '@/lib/food-search'
import {
  calculateWhiteRiceNutrition,
  WHITE_RICE_CANONICAL_ID,
  WHITE_RICE_DEPRECATED_VARIANT_IDS,
  WHITE_RICE_PORTIONS,
} from '@/lib/nutrition/rice-portion-profile'

describe('BUGFIX-RICE-PORTION-DATA-003', () => {
  it('keeps one canonical cooked-white-rice profile at 130 kcal per 100g', () => {
    const rice = getP0FoodById(WHITE_RICE_CANONICAL_ID)
    assert.ok(rice)
    assert.equal(rice.foodType, 'staple')
    assert.equal(rice.baseAmount, 100)
    assert.equal(rice.kcalBase, 130)
    assert.equal(rice.carbsBase_g, 28)
    assert.equal(rice.proteinBase_g, 2.7)
    assert.equal(rice.fatBase_g, 0.3)
    assert.equal(rice.smallAmount, 75)
    assert.equal(rice.normalAmount, 150)
    assert.equal(rice.largeAmount, 210)
    assert.equal(rice.defaultUnit, 'g')
    assert.equal(rice.supportsSauce, false)
  })

  it('removes the three contradictory 600/650 kcal rice rows from runtime catalog', () => {
    const ids = new Set(getP0Catalog().map(item => item.id))
    for (const id of WHITE_RICE_DEPRECATED_VARIANT_IDS) {
      assert.equal(ids.has(id), false, id)
    }
    assert.equal(getP0Catalog().filter(item => item.name.includes('白飯')).length, 1)
  })

  it('redirects bowl aliases to the same canonical rice item', () => {
    for (const alias of ['白飯', '半碗白飯', '一碗白飯', '大碗白飯', '便當白飯']) {
      assert.equal(getP0FoodByNormalizedLabel(alias)?.id, WHITE_RICE_CANONICAL_ID, alias)
    }
  })

  it('calculates half, normal and large bowls from grams with proportional macros', () => {
    const half = calculateWhiteRiceNutrition(WHITE_RICE_PORTIONS.half_bowl.amount)
    const normal = calculateWhiteRiceNutrition(WHITE_RICE_PORTIONS.bowl.amount)
    const large = calculateWhiteRiceNutrition(WHITE_RICE_PORTIONS.large_bowl.amount)
    assert.equal(half.calories, 98)
    assert.equal(normal.calories, 195)
    assert.equal(large.calories, 273)
    assert.notEqual(half.calories, normal.calories)
    assert.equal(half.carbs_g, 21)
    assert.equal(normal.carbs_g, 42)
    assert.equal(large.carbs_g, 58.8)
    assert.equal(half.protein_g, 2)
    assert.equal(normal.protein_g, 4.1)
    assert.equal(half.fat_g, 0.2)
    assert.equal(normal.fat_g, 0.5)
  })

  it('maps alias wording to selected portion metadata without creating new foods', () => {
    const rice = getP0FoodById(WHITE_RICE_CANONICAL_ID)!
    const cases = [
      ['半碗白飯', 75, 98, '半碗'],
      ['一碗白飯', 150, 195, '一碗'],
      ['大碗白飯', 210, 273, '大碗'],
    ] as const
    for (const [query, amount, calories, label] of cases) {
      const hit = foodSearchHitForP0(rice, 95, query)
      assert.equal(hit.p0FoodId, WHITE_RICE_CANONICAL_ID)
      assert.equal(hit.name, '白飯')
      assert.equal(hit.initialPortionAmount, amount)
      assert.equal(hit.portionLabel, label)
      assert.equal(hit.calories, calories)
    }
  })

  it('dedupes the merged 白飯 search to its canonical P0 result', () => {
    const hits = searchFoodMenu('白飯', 8)
    const riceHits = hits.filter(hit => /白飯/.test(hit.name))
    assert.deepEqual(
      riceHits.map(hit => ({
        id: hit.p0FoodId,
        calories: hit.calories,
        amount: hit.initialPortionAmount,
      })),
      [{ id: WHITE_RICE_CANONICAL_ID, calories: 195, amount: 150 }]
    )
    assert.equal(hits.some(hit => hit.calories === 600 || hit.calories === 650), false)
  })

  it('uses selected portion metadata in the existing record payload path', () => {
    const rice = getP0FoodById(WHITE_RICE_CANONICAL_ID)!
    const amount = WHITE_RICE_PORTIONS.half_bowl.amount
    const draft = {
      ...defaultFoodRecordDraft(rice),
      amount,
      portionPreset: inferPresetFromAmount(rice, amount),
    }
    const nutrition = calculateFoodRecordNutrition(rice, draft)
    const payload = applyFoodRecordToLog(rice, draft, {
      user_input_label: '半碗白飯',
      matched_item_label: '白飯',
      match_type: 'user_selected_p0_food',
      source: 'search',
    })
    assert.equal(nutrition.calories, 98)
    assert.equal(payload.name, '白飯')
    assert.equal(payload.calories, 98)
    assert.equal(payload.carbs_g, 21)
    assert.equal(payload.food_record_meta?.amount, 75)
    assert.equal(payload.food_record_meta?.unit, 'g')
  })

  it('wires selected search portion metadata into the P0 confirmation draft', () => {
    const source = readFileSync(
      new URL('../components/dashboard/TodayOS.tsx', import.meta.url),
      'utf8'
    )
    assert.match(source, /item\.initialPortionAmount != null/)
    assert.match(source, /amount: item\.initialPortionAmount/)
    assert.match(source, /initialDraft=\{p0InitialDraft\}/)
  })
})

