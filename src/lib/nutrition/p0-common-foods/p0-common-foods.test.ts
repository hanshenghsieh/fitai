import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getP0FoodById } from './catalog'
import { searchP0CommonFoods } from './search'
import { getFoodTypeFieldVisibility } from '../food-type-ui'
import { calculateFoodRecordNutrition, defaultFoodRecordDraft, foodTypeSubtitle } from './calculate'
import { getP0Catalog } from './catalog'
import { resolvePortionContextFromLabel } from './portion-context'
import { resolveP0FoodByLabel } from './resolve-p0-food'
import { foodRecordDraftFromLog, resolveFoodItemForLog } from './draft-from-log'
import { patchFoodRecordOnLog } from './apply-to-log'
import { countsTowardDailyTotals, isNutritionPendingConfirmation } from '../food-log-display'
import type { FoodLogEntry } from '@/lib/banks/types'

function mockLog(name: string): FoodLogEntry {
  return {
    id: `log-${Date.now()}`,
    name,
    display_label: name,
    calories: null,
    protein_g: null,
    logged_at: new Date().toISOString(),
    user_declared: true,
    source: 'free_text',
    capture_status: 'photo_only',
    nutrition_status: 'estimated',
  }
}

describe('P0 common foods search', () => {
  it('finds 白醋 for 白醋, 醋, vinegar', () => {
    assert.equal(searchP0CommonFoods('白醋', 3)[0]?.item.name, '白醋')
    const vinegarHits = searchP0CommonFoods('vinegar', 5).map(h => h.item.name)
    assert.ok(vinegarHits.includes('白醋'))
    const cuHits = searchP0CommonFoods('醋', 5).map(h => h.item.name)
    assert.ok(cuHits.includes('白醋'))
  })

  it('finds 牛小排 first for 牛小排 and short rib aliases', () => {
    assert.equal(searchP0CommonFoods('牛小排', 3)[0]?.item.name, '牛小排')
    const shortRib = searchP0CommonFoods('short rib', 5).map(h => h.item.name)
    assert.ok(shortRib.includes('牛小排'))
    const boneless = searchP0CommonFoods('無骨牛小排', 5).map(h => h.item.name)
    assert.ok(boneless.includes('牛小排'))
  })

  it('finds 菲力牛排 for 菲力牛排, 菲力牛, 菲力, filet mignon', () => {
    assert.equal(searchP0CommonFoods('菲力牛排', 3)[0]?.item.name, '菲力牛排')
    assert.equal(searchP0CommonFoods('菲力牛', 3)[0]?.item.name, '菲力牛排')
    assert.ok(searchP0CommonFoods('菲力', 5).map(h => h.item.name).includes('菲力牛排'))
    assert.equal(resolveP0FoodByLabel('filet mignon')?.name, '菲力牛排')
  })

  it('steak cuts resolve by alias', () => {
    assert.equal(resolveP0FoodByLabel('沙朗牛')?.name, '沙朗牛排')
    assert.equal(resolveP0FoodByLabel('sirloin')?.name, '沙朗牛排')
    assert.equal(resolveP0FoodByLabel('ribeye')?.name, '肋眼牛排')
    assert.equal(resolveP0FoodByLabel('flat iron steak')?.name, '板腱牛')
    assert.equal(resolveP0FoodByLabel('new york strip')?.name, '紐約客牛排')
  })
})

describe('foodType field visibility', () => {
  it('白醋 only shows sauce fields', () => {
    const item = getP0FoodById('bb_p0_0592')
    assert.equal(item?.name, '白醋')
    const fields = getFoodTypeFieldVisibility(item!)
    assert.equal(fields.portion, true)
    assert.equal(fields.portionLabel, '用量')
    assert.equal(fields.oil, false)
    assert.equal(fields.cooking, false)
    assert.equal(fields.sauce, false)
  })

  it('菲力牛排 shows ingredient cooking fields', () => {
    const item = getP0FoodById('bb_p0_0013')
    assert.equal(item?.foodType, 'ingredient')
    const fields = getFoodTypeFieldVisibility(item!)
    assert.equal(fields.oil, true)
    assert.equal(fields.cooking, true)
    assert.equal(fields.sauce, true)
  })
})

describe('P0 nutrition calculate', () => {
  it('白醋 10ml is near 0 kcal', () => {
    const item = getP0FoodById('bb_p0_0592')!
    const draft = defaultFoodRecordDraft(item)
    const nutrition = calculateFoodRecordNutrition(item, draft)
    assert.ok(nutrition.calories <= 2)
  })

  it('菲力牛排 default portion is 150g with updated macros', () => {
    const item = getP0FoodById('bb_p0_0013')!
    assert.equal(item.kcalBase, 205)
    assert.equal(item.proteinBase_g, 27)
    assert.equal(item.normalAmount, 150)
    const draft = {
      ...defaultFoodRecordDraft(item),
      oilLevel: 'none' as const,
      sauceLevel: 'none' as const,
    }
    assert.equal(draft.amount, 150)
    const nutrition = calculateFoodRecordNutrition(item, draft)
    assert.equal(nutrition.calories, 308)
  })

  it('牛小排 portion changes calories', () => {
    const item = getP0FoodById('bb_p0_0001')!
    const small = calculateFoodRecordNutrition(item, {
      ...defaultFoodRecordDraft(item),
      portionPreset: 'small',
      amount: item.smallAmount,
    })
    const large = calculateFoodRecordNutrition(item, {
      ...defaultFoodRecordDraft(item),
      portionPreset: 'large',
      amount: item.largeAmount,
    })
    assert.ok(large.calories > small.calories)
  })
})

describe('patchFoodRecordOnLog clears pending status', () => {
  it('unknown log becomes estimated and counts toward totals', () => {
    const item = getP0FoodById('bb_p0_0013')!
    const log: FoodLogEntry = {
      id: 'log-unknown',
      name: '菲力牛排',
      display_label: '菲力牛排',
      calories: null,
      protein_g: null,
      logged_at: new Date().toISOString(),
      user_declared: true,
      source: 'free_text',
      nutrition_status: 'unknown',
      capture_status: 'photo_only',
    }
    const draft = defaultFoodRecordDraft(item)
    const patch = patchFoodRecordOnLog(log, item, draft)

    assert.equal(patch.nutrition_status, 'estimated')
    assert.equal(patch.capture_status, 'resolved')
    assert.ok((patch.calories ?? 0) > 0)
    assert.ok((patch.protein_g ?? 0) > 0)

    const updated = { ...log, ...patch } as FoodLogEntry
    assert.equal(isNutritionPendingConfirmation(updated), false)
    assert.equal(countsTowardDailyTotals(updated), true)
  })
})

describe('P0 catalog connectivity audit', () => {
  it('every P0 canonical name resolves to itself', () => {
    const failures: string[] = []
    for (const item of getP0Catalog()) {
      const resolved = resolveP0FoodByLabel(item.name)
      if (!resolved || resolved.id !== item.id) {
        failures.push(item.name)
      }
    }
    assert.equal(failures.length, 0, `P0 names not self-resolving: ${failures.slice(0, 10).join(', ')}`)
  })

  it('portion context connects P0 for core ingredients', () => {
    for (const q of ['菲力牛排', '雞胸', '鮭魚', '白飯', '白醋', '拿鐵', '洋芋片']) {
      const ctx = resolvePortionContextFromLabel(q)
      assert.equal(ctx.kind, 'p0', `expected P0 portion for ${q}, got ${ctx.kind}`)
    }
  })
})

describe('meal edit resolves P0 by label', () => {
  it('resolves 菲力牛排 log without food_record_meta', () => {
    const log = mockLog('菲力牛排')
    const item = resolveFoodItemForLog(log)
    assert.equal(item?.name, '菲力牛排')
    assert.ok(foodRecordDraftFromLog(log))
  })

  it('resolves alias 菲力牛 to 菲力牛排', () => {
    const log = mockLog('菲力牛')
    assert.equal(resolveFoodItemForLog(log)?.name, '菲力牛排')
  })
})

describe('P0 smoke search list', () => {
  const beefQueries = [
    '牛小排',
    '菲力牛排',
    '菲力牛',
    '沙朗牛排',
    '肋眼牛排',
    '板腱牛',
    '牛五花',
    '牛肋條',
    '牛肉片',
    '牛排',
  ]
  const otherQueries = [
    '雞胸肉',
    '雞腿排',
    '鮭魚',
    '鯖魚',
    '白飯',
    '地瓜',
    '白醋',
    '醬油',
    '拿鐵',
    '無糖茶',
    '洋芋片',
  ]

  for (const q of beefQueries) {
    it(`beef smoke: ${q}`, () => {
      assert.ok(searchP0CommonFoods(q, 3).length > 0, `expected hits for ${q}`)
    })
  }

  for (const q of otherQueries) {
    it(`basic smoke: ${q}`, () => {
      assert.ok(searchP0CommonFoods(q, 3).length > 0, `expected hits for ${q}`)
    })
  }
})

describe('staple smoke — no meal modifiers', () => {
  const STAPLE_QUERIES = ['饅頭', '白飯', '地瓜', '吐司', '飯糰']

  for (const q of STAPLE_QUERIES) {
    it(`${q} resolves as staple without sauce/rice/oil UI`, () => {
      const hit = searchP0CommonFoods(q, 3)[0]
      assert.ok(hit, `expected search hit for ${q}`)
      const { item } = hit
      assert.equal(item.foodType, 'staple', `${q} should be staple, got ${item.foodType}`)
      assert.equal(item.supportsSauce, false, `${q} should not support sauce`)
      assert.equal(item.supportsRiceAmount, false, `${q} should not support rice amount`)
      const fields = getFoodTypeFieldVisibility(item)
      assert.equal(fields.sauce, false, `${q} UI should hide sauce`)
      assert.equal(fields.rice, false, `${q} UI should hide rice`)
      assert.equal(fields.oil, false, `${q} UI should hide oil`)
      assert.equal(fields.cooking, false, `${q} UI should hide cooking`)
    })
  }

  it('饅頭 portion calories match per-100g estimate', () => {
    const item = getP0FoodById('bb_p0_0531')!
    assert.equal(item.name, '饅頭')
    assert.equal(item.foodType, 'staple')
    assert.equal(item.category, '主食 / 麵食')
    assert.equal(item.sourceType, 'database_estimate')
    assert.equal(item.kcalBase, 220)

    const small = calculateFoodRecordNutrition(item, {
      ...defaultFoodRecordDraft(item),
      portionPreset: 'small',
      amount: 70,
    })
    const normal = calculateFoodRecordNutrition(item, defaultFoodRecordDraft(item))
    const large = calculateFoodRecordNutrition(item, {
      ...defaultFoodRecordDraft(item),
      portionPreset: 'large',
      amount: 130,
    })

    assert.equal(small.calories, 154)
    assert.equal(normal.calories, 220)
    assert.equal(large.calories, 286)
    assert.equal(foodTypeSubtitle(item, normal), '主食 · 資料庫估算')
  })

  it('菜包 is a single snack bun (~200 kcal), not a combo meal', () => {
    const item = getP0FoodById('bb_p0_0530')!
    assert.equal(item.name, '菜包')
    assert.equal(item.foodType, 'snack')
    assert.equal(item.supportsSauce, false)
    const fields = getFoodTypeFieldVisibility(item)
    assert.equal(fields.sauce, false)
    assert.equal(fields.rice, false)
    assert.equal(fields.mealHint, undefined)

    const normal = calculateFoodRecordNutrition(item, defaultFoodRecordDraft(item))
    assert.equal(normal.calories, 200)
    assert.ok(normal.calories < 300, '菜包不應接近便當級熱量')
  })

  it('meal combo items still show meal modifiers', () => {
    const hits = searchP0CommonFoods('牛肉麵', 3)
    const item = hits.find(h => h.item.name.includes('牛肉麵'))?.item
    assert.ok(item, 'expected 牛肉麵 in P0 catalog')
    assert.equal(item.foodType, 'meal')
    const fields = getFoodTypeFieldVisibility(item)
    assert.equal(fields.sauce, item.supportsSauce)
    assert.equal(fields.rice, item.supportsRiceAmount)
  })

  it('ingredient items keep cooking/oil fields', () => {
    const item = getP0FoodById('bb_p0_0013')!
    assert.equal(item.foodType, 'ingredient')
    const fields = getFoodTypeFieldVisibility(item)
    assert.equal(fields.oil, true)
    assert.equal(fields.cooking, true)
  })
})
