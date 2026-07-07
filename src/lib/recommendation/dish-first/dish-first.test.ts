import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { computeTodayMealState } from '@/lib/engines/next-meal-engine'
import {
  getDishTemplateById,
  getVariantsForTemplate,
  getBrandItemsForTemplate,
  resolveDishByLabel,
} from '@/lib/recommendation/dish-first/catalog'
import { resolveBrandDisplayGroups } from '@/lib/recommendation/dish-first/brand-display'
import { rollDishFirstRecommendation, getBrandItemsForTemplateResolved } from '@/lib/recommendation/dish-first/engine'
import { recommendationDisplayName, templateRequiresSpecificVariant } from '@/lib/recommendation/dish-first/display'
import { scoreDishTemplateForUserDay, scoreDishVariantForUserDay, pickBestVariantForDay } from '@/lib/recommendation/dish-first/score'
import { searchDishCatalog } from '@/lib/recommendation/dish-first/search'
import { buildFoodLogFromDishRecommendation } from '@/lib/recommendation/dish-first/log'
import { buildDishFirstConvenienceMealsForDay, pickDishHintForMealSlot } from '@/lib/recommendation/dish-first/weekly-plan'
import { normalizeLegacyFoodItemToDishRecommendation } from '@/lib/recommendation/dish-first/legacy'
import { searchFoodMenu } from '@/lib/food-search'
import { getP0FoodById } from '@/lib/nutrition/p0-common-foods/catalog'
import { getFoodTypeFieldVisibility } from '@/lib/nutrition/food-type-ui'

function dayState(overrides: Partial<ReturnType<typeof computeTodayMealState>> = {}) {
  const base = computeTodayMealState({
    todayFoodLogs: [],
    normalTargetKcal: 1800,
    proteinTargetG: 120,
    mealSlot: 'lunch',
  })
  return { ...base, allowDiceAndSuggest: true, ...overrides }
}

describe('dish-first catalog', () => {
  it('loads chicken leg rice template with variants and brands', () => {
    const template = getDishTemplateById('dish_chicken_leg_rice')!
    assert.equal(template.name, '雞腿飯')
    assert.equal(getVariantsForTemplate('dish_chicken_leg_rice').length, 3)
    assert.ok(getBrandItemsForTemplate('dish_chicken_leg_rice').length >= 4)
  })

  it('groups chicken leg rice brands by cooking style', () => {
    const template = getDishTemplateById('dish_chicken_leg_rice')!
    const variants = getVariantsForTemplate(template.id)
    const brands = getBrandItemsForTemplate(template.id)
    const groups = resolveBrandDisplayGroups({ template, selectedVariant: null, variants, brandItems: brands })
    assert.ok(groups.some(g => g.label.includes('滷') || g.variantId === 'variant_braised_chicken_leg_rice'))
    assert.ok(groups.some(g => g.variantId === 'variant_fried_chicken_leg_rice'))

    const grilled = variants.find(v => v.name === '烤雞腿飯')!
    const grilledGroups = resolveBrandDisplayGroups({
      template,
      selectedVariant: grilled,
      variants,
      brandItems: brands,
    })
    const primary = grilledGroups[0]?.items ?? []
    assert.ok(!primary.some(b => /炸/.test(b.itemName)), 'grilled selection should not prioritize fried brands')
    const friedBrand = brands.find(b => b.itemName.includes('炸'))!
    const fried = variants.find(v => v.name === '炸雞腿飯')!
    const friedGroups = resolveBrandDisplayGroups({
      template,
      selectedVariant: fried,
      variants,
      brandItems: brands,
    })
    assert.ok(friedGroups[0]?.items.some(b => b.id === friedBrand.id))
  })

  it('resolves 悟饕雞腿飯 to chicken leg rice template', () => {
    const resolved = resolveDishByLabel('悟饕雞腿飯')
    assert.equal(resolved.template?.name, '雞腿飯')
    assert.equal(resolved.brandItem?.brandName, '悟饕')
  })
})

describe('dish-first variant scoring', () => {
  it('scoreDishVariantForUserDay deprioritizes milk hot pot when calories low', () => {
    const template = getDishTemplateById('dish_hot_pot')!
    const variants = getVariantsForTemplate(template.id)
    const milk = variants.find(v => v.name === '牛奶火鍋')!
    const kombu = variants.find(v => v.name === '昆布鍋')!
    const day = dayState({ remainingCalories: 280 })
    assert.ok(scoreDishVariantForUserDay(kombu, template, day).total > scoreDishVariantForUserDay(milk, template, day).total)
  })

  it('egg pancake and rice ball have multiple variants', () => {
    assert.ok(getVariantsForTemplate('dish_egg_pancake').length >= 5)
    assert.ok(getVariantsForTemplate('dish_rice_ball').length >= 4)
    assert.ok(getVariantsForTemplate('dish_lu_wei').length >= 6)
  })

  it('fried variant scores lower when remaining calories are low', () => {
    const template = getDishTemplateById('dish_chicken_leg_rice')!
    const variants = getVariantsForTemplate(template.id)
    const fried = variants.find(v => v.name.includes('炸'))!
    const braised = variants.find(v => v.name.includes('滷'))!
    const lowCalDay = dayState({ remainingCalories: 180, effectiveMealCalTarget: 500 })
    const friedScore = scoreDishTemplateForUserDay(template, lowCalDay, fried).total
    const braisedScore = scoreDishTemplateForUserDay(template, lowCalDay, braised).total
    assert.ok(braisedScore > friedScore)
    assert.equal(pickBestVariantForDay(variants, template, lowCalDay)?.name, braised.name)
  })
})

describe('dish-first recommendation roll', () => {
  it('recommends dish template first with calorie range and brands', () => {
    const roll = rollDishFirstRecommendation({
      meal_type: 'lunch',
      day_state: dayState({ proteinGap: 32, remainingCalories: 900 }),
    })
    assert.ok(roll.result)
    assert.ok(roll.result!.template.name)
    assert.ok(roll.result!.template.typicalCalories.mid > 0)
    assert.ok(roll.result!.reasons.length > 0)
  })

  it('chicken breast bento uses rice portion variants instead of brand rows', () => {
    const template = getDishTemplateById('dish_chicken_breast_bento')!
    assert.equal(templateRequiresSpecificVariant(template), true)
    const variants = getVariantsForTemplate(template.id)
    const normal = variants.find(v => v.name === '正常飯')
    const less = variants.find(v => v.name === '少飯')
    assert.ok(normal, 'expected 正常飯 variant')
    assert.ok(less, 'expected 少飯 variant')
    assert.ok(normal!.typicalCalories.mid >= 450, `正常飯 should be ~500+ kcal, got ${normal!.typicalCalories.mid}`)
    assert.ok(normal!.typicalCalories.mid <= 600)
    assert.ok(less!.typicalCalories.mid < normal!.typicalCalories.mid)

    const brands = getBrandItemsForTemplateResolved(template.id)
    assert.ok(!brands.some(b => /半飯|少飯|正常飯/.test(b.itemName)), 'rice portions should not appear as brands')
    assert.ok(brands.some(b => b.brandName === '便當店' && b.itemName === '雞胸便當'))
  })

  it('prefers less rice chicken breast bento when remaining calories are low', () => {
    const template = getDishTemplateById('dish_chicken_breast_bento')!
    const variants = getVariantsForTemplate(template.id)
    const lowCalDay = dayState({ remainingCalories: 320, proteinGap: 20 })
    const picked = pickBestVariantForDay(variants, template, lowCalDay)
    assert.ok(picked)
    assert.match(picked!.name, /半飯|少飯/)
  })

  it('beef noodle includes reference brands from v2 catalog', () => {
    const brands = getBrandItemsForTemplateResolved('dish_beef_noodle')
    assert.ok(brands.length >= 2, `expected brands for 牛肉麵, got ${brands.length}`)
    assert.ok(brands.some(b => b.brandName.includes('鬍鬚張') || b.brandName.includes('三商')))
  })

  it('rerolls cycle through more than two templates', () => {
    const day = dayState({ proteinGap: 24, remainingCalories: 900 })
    const seen = new Set<string>()
    let queue = { recentlyShownTemplateIds: [] as string[], cursor: 0 }
    for (let i = 0; i < 6; i++) {
      const roll = rollDishFirstRecommendation({
        meal_type: 'lunch',
        day_state: day,
        seed: 1000 + i * 7919,
        queue_state: queue,
      })
      assert.ok(roll.result, `roll ${i} should return a template`)
      seen.add(roll.result!.template.id)
      queue = roll.queue_state
    }
    assert.ok(seen.size >= 4, `expected variety, only saw: ${[...seen].join(', ')}`)
  })

  it('hot pot recommends a specific variant not generic 火鍋', () => {
    const template = getDishTemplateById('dish_hot_pot')!
    assert.equal(templateRequiresSpecificVariant(template), true)
    const variants = getVariantsForTemplate('dish_hot_pot')
    assert.ok(variants.length >= 10)
    assert.ok(variants.some(v => v.name === '羊肉火鍋'))
    assert.ok(variants.some(v => v.name === '海鮮火鍋'))
    assert.ok(variants.some(v => v.name === '牛奶火鍋'))
    assert.ok(variants.some(v => v.name === '昆布鍋'))
    assert.ok(variants.some(v => v.name === '牛肉火鍋'))

    const day = dayState({ proteinGap: 48, remainingCalories: 900 })
    const roll = rollDishFirstRecommendation({ meal_type: 'lunch', day_state: day, seed: 42 })
    if (roll.result?.template.id === 'dish_hot_pot') {
      assert.ok(roll.result.variant, 'hot pot must include a specific variant')
      assert.notEqual(recommendationDisplayName(roll.result.template, roll.result.variant), '火鍋')
    }

    const seafood = variants.find(v => v.name === '海鮮火鍋')!
    const milk = variants.find(v => v.name === '牛奶火鍋')!
    const lowCalDay = dayState({ remainingCalories: 250 })
    assert.ok(
      pickBestVariantForDay(variants, template, lowCalDay)!.typicalFat!.mid <
        milk.typicalFat!.mid
    )
    assert.ok(seafood.typicalFat!.mid < milk.typicalFat!.mid)
  })

  it('logs variant as dish_variant', () => {
    const template = getDishTemplateById('dish_chicken_leg_rice')!
    const variant = getVariantsForTemplate(template.id).find(v => v.name === '滷雞腿飯')!
    const log = buildFoodLogFromDishRecommendation({
      result: {
        template,
        variant,
        brandItems: getBrandItemsForTemplate(template.id),
        score: {
          total: 0,
          calorieFit: 0,
          proteinFit: 0,
          fatPenalty: 0,
          adjustability: 0,
          confidence: 0,
          variantPenalty: 0,
        },
        reasons: [],
        benefitPoints: [],
        eatingTips: [],
      },
      selectedVariant: variant,
    })
    assert.equal(log.name, '滷雞腿飯')
    assert.equal(log.dish_log_meta?.logType, 'dish_variant')
    assert.equal(log.dish_log_meta?.dishVariantId, variant.id)
  })

  it('logs brand as brand_item', () => {
    const template = getDishTemplateById('dish_chicken_leg_rice')!
    const brandItems = getBrandItemsForTemplate(template.id)
    const brand = brandItems.find(b => b.brandName.includes('悟饕')) ?? brandItems[0]
    assert.ok(brand, 'expected at least one brand for chicken leg rice')
    const log = buildFoodLogFromDishRecommendation({
      result: {
        template,
        brandItems,
        score: {
          total: 0,
          calorieFit: 0,
          proteinFit: 0,
          fatPenalty: 0,
          adjustability: 0,
          confidence: 0,
          variantPenalty: 0,
        },
        reasons: [],
        benefitPoints: [],
        eatingTips: [],
      },
      selectedBrandItem: brand,
    })
    assert.equal(log.dish_log_meta?.logType, 'brand_item')
    assert.equal(log.dish_log_meta?.brandItemId, brand.id)
    assert.ok(log.name.includes(brand.brandName))
    assert.equal(log.calories, brand.calories)
  })
})

describe('dish-first weekly plan', () => {
  it('builds three dish-first convenience meals for a day', () => {
    const meals = buildDishFirstConvenienceMealsForDay({
      nutrition: { dailyCalories: 1800, proteinGrams: 120, carbsGrams: 180, fatGrams: 60 },
      dayIndex: 2,
    })
    assert.equal(meals.length, 3)
    assert.equal(meals[0]?.meal_type, 'breakfast')
    assert.equal(meals[1]?.meal_type, 'lunch')
    assert.equal(meals[2]?.meal_type, 'dinner')
    assert.ok(meals.every(m => m.items[0]?.store === '餐點推薦'))
    assert.ok(meals.every(m => m.total_calories > 0))
    const names = meals.map(m => m.items[0]?.name)
    assert.equal(new Set(names).size, names.length, 'each meal slot should get a different dish')
  })

  it('pickDishHintForMealSlot returns a template name', () => {
    const hint = pickDishHintForMealSlot({
      mealSlot: 'lunch',
      dailyCalories: 1800,
      proteinGrams: 120,
      proteinGap: 25,
    })
    assert.ok(hint)
    assert.ok(hint!.length >= 2)
  })
})

describe('dish-first search', () => {
  it('search 雞腿飯 returns template first', () => {
    const hits = searchDishCatalog('雞腿飯', 5)
    assert.equal(hits[0]?.kind, 'template')
    assert.equal(hits[0]?.template?.name, '雞腿飯')
  })

  it('search 炸雞腿飯 returns variant', () => {
    const hits = searchDishCatalog('炸雞腿飯', 5)
    assert.ok(hits.some(h => h.kind === 'variant' && h.variant?.name === '炸雞腿飯'))
  })

  it('search 雞胸滷味 returns lu wei variant first', () => {
    const hits = searchDishCatalog('雞胸滷味', 5)
    assert.equal(hits[0]?.kind, 'variant')
    assert.ok(hits[0]?.variant?.name.includes('雞胸'))
  })

  it('search 牛奶火鍋 returns milk hot pot variant', () => {
    const hits = searchDishCatalog('牛奶火鍋', 5)
    assert.ok(hits.some(h => h.kind === 'variant' && /牛奶/.test(h.variant?.name ?? '')))
  })

  it('search 雞胸便當正常飯 returns rice portion variant', () => {
    const hits = searchDishCatalog('雞胸便當正常飯', 5)
    assert.ok(hits.some(h => h.kind === 'variant' && h.variant?.name === '正常飯'))
  })

  it('search 悟饕雞腿飯 returns brand linked to template', () => {
    const hits = searchDishCatalog('悟饕雞腿飯', 5)
    assert.ok(hits.some(h => h.kind === 'brand' && h.template?.name === '雞腿飯'))
  })

  it('food-search merges dish hits before menu', () => {
    const hits = searchFoodMenu('雞腿飯', 6)
    assert.equal(hits[0]?.searchSource, 'dish')
    assert.equal(hits[0]?.dishTemplateId, 'dish_chicken_leg_rice')
  })
})

describe('dish-first legacy adapter', () => {
  it('legacy brand meal maps to dish template card data', () => {
    const dish = normalizeLegacyFoodItemToDishRecommendation({
      store: '悟饕',
      name: '雞腿飯',
      calories: 850,
      protein_g: 38,
      meal_type: 'lunch',
    })
    assert.equal(dish?.template.name, '雞腿飯')
    assert.ok(dish?.brandItems.some(b => b.brandName === '悟饕'))
  })
})

describe('foodType regression after dish-first', () => {
  it('白醋 sauce fields unchanged', () => {
    const item = getP0FoodById('bb_p0_0592')!
    const fields = getFoodTypeFieldVisibility(item)
    assert.equal(fields.sauce, false)
    assert.equal(fields.oil, false)
  })

  it('mantou staple unchanged', () => {
    const item = getP0FoodById('bb_p0_0531')!
    assert.equal(item.foodType, 'staple')
    assert.equal(item.supportsSauce, false)
    assert.equal(item.kcalDefault, 220)
  })

  it('fillet steak ingredient still resolvable', () => {
    assert.equal(getP0FoodById('bb_p0_0013')?.name, '菲力牛排')
  })
})
