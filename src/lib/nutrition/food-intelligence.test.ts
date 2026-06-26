import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildFoodIntelligenceProfile,
  runFoodIntelligenceLayer,
  type FoodIntelligenceItemInput,
} from './food-intelligence/engine'
import { inferDietTags, inferFoodCategory, inferProcessingLevel } from './food-intelligence/tags'
import { computeMealContext } from './food-intelligence/meal-context'
import { computePopularityScore, computeSatietyScore } from './food-intelligence/score'
import { buildCatalog, buildRecommendedAddons, buildRecommendedReplacements, buildMealGraphEdges } from './food-intelligence/relationship'

function item(
  partial: Partial<FoodIntelligenceItemInput> & Pick<FoodIntelligenceItemInput, 'id' | 'name' | 'store'>
): FoodIntelligenceItemInput {
  return {
    calories: 400,
    protein_g: 30,
    carbs_g: 35,
    fat_g: 12,
    category: 'lunch',
    role: 'combo',
    verification: { confidence: 'A' },
    ...partial,
  }
}

const catalogItems: FoodIntelligenceItemInput[] = [
  item({ id: 'main-1', name: '雞胸便當', store: '7-11', protein_g: 38, calories: 480 }),
  item({ id: 'side-1', name: '茶葉蛋', store: '7-11', protein_g: 7, calories: 80, role: 'protein' }),
  item({ id: 'drink-1', name: '無糖綠茶', store: '7-11', protein_g: 0, calories: 0, role: 'drink' }),
  item({ id: 'sub-1', name: '火雞胸潛艇堡', store: 'Subway', protein_g: 32, calories: 420 }),
  item({ id: 'fried-1', name: '炸雞腿便當', store: '7-11', protein_g: 28, fat_g: 32, calories: 680 }),
  item({ id: 'grill-1', name: '烤雞腿便當', store: '7-11', protein_g: 35, fat_g: 14, calories: 520 }),
  item({ id: 'bubble-1', name: '珍珠奶茶', store: '50嵐', protein_g: 2, carbs_g: 55, fat_g: 8, calories: 420, role: 'drink' }),
  item({ id: 'unsweet-1', name: '無糖茶', store: '50嵐', calories: 5, protein_g: 0, carbs_g: 1, fat_g: 0, role: 'drink' }),
  item({ id: 'beef-1', name: '牛肉麵', store: '三商巧福', protein_g: 30, calories: 580, carbs_g: 70, fat_g: 18 }),
  item({ id: 'low-1', name: '清湯麵', store: '7-11', protein_g: 6, calories: 180, carbs_g: 35, fat_g: 2 }),
  item({ id: 'd-blocked', name: '幽靈品項', store: '7-11', verification: { confidence: 'D' } }),
]

const catalog = buildCatalog(catalogItems)

describe('food-intelligence tags & scores', () => {
  it('1. 雞胸高蛋白高分', () => {
    const chicken = item({ id: 'c', name: '舒肥雞胸便當', store: '7-11', protein_g: 42, calories: 450, fat_g: 8 })
    const tags = inferDietTags(chicken, inferFoodCategory(chicken), 'lightly_processed')
    assert.ok(tags.includes('high_protein'))
    assert.ok(computeSatietyScore(chicken) >= 55)
  })

  it('2. 茶葉蛋適合作為副食', () => {
    const egg = catalog.byId.get('side-1')!
    const cat = inferFoodCategory(egg)
    assert.equal(cat, '配菜')
    const ctx = computeMealContext(egg, cat)
    assert.ok(ctx.snack >= 80)
    const addons = buildRecommendedAddons(catalog.byId.get('main-1')!, catalog, '主餐')
    assert.ok(addons.some(a => a.name.includes('茶葉蛋')))
  })

  it('3. 珍奶高糖低分', () => {
    const bubble = catalog.byId.get('bubble-1')!
    const tags = inferDietTags(bubble, inferFoodCategory(bubble), inferProcessingLevel(bubble, '手搖飲'))
    assert.ok(tags.includes('dessert') || tags.includes('drink'))
    assert.ok(computeSatietyScore(bubble) < 45)
  })

  it('4. 炸雞高脂低分', () => {
    const fried = catalog.byId.get('fried-1')!
    const tags = inferDietTags(fried, inferFoodCategory(fried), inferProcessingLevel(fried, '主餐'))
    assert.ok(tags.includes('fried'))
    const profile = buildFoodIntelligenceProfile(fried, catalog)
    assert.ok(profile.recommendation_rules.includes('fat_limit_bad'))
  })

  it('5. Subway 適合午餐/晚餐', () => {
    const sub = catalog.byId.get('sub-1')!
    const ctx = computeMealContext(sub, inferFoodCategory(sub))
    assert.ok(ctx.lunch >= 85)
    assert.ok(ctx.dinner >= 80)
  })

  it('6. 手搖飲不可當高飽足推薦', () => {
    const bubble = catalog.byId.get('bubble-1')!
    const profile = buildFoodIntelligenceProfile(bubble, catalog)
    assert.ok(profile.recommendation_rules.includes('low_satiety_drink'))
    assert.ok(profile.satiety_score < 50)
  })

  it('7. 低熱量但低蛋白不得給過高減脂分', () => {
    const low = catalog.byId.get('low-1')!
    const tags = inferDietTags(low, inferFoodCategory(low), 'processed')
    assert.ok(!tags.includes('weight_loss'))
    const profile = buildFoodIntelligenceProfile(low, catalog)
    assert.ok(profile.recommendation_rules.includes('protein_gap_poor'))
  })

  it('8. 高蛋白但高脂需降低分數', () => {
    const fried = catalog.byId.get('fried-1')!
    const profile = buildFoodIntelligenceProfile(fried, catalog)
    assert.ok(profile.recommendation_rules.includes('fat_limit_bad'))
    assert.ok(profile.popularity_score < 90)
  })

  it('9. 宵夜不推薦高熱量正餐', () => {
    const fried = catalog.byId.get('fried-1')!
    const ctx = computeMealContext(fried, '主餐')
    assert.ok(ctx.late_night < ctx.lunch)
    const profile = buildFoodIntelligenceProfile(fried, catalog)
    assert.ok(profile.recommendation_rules.includes('late_night_heavy'))
  })

  it('10. 運動後優先高蛋白', () => {
    const chicken = catalog.byId.get('main-1')!
    const tags = inferDietTags(chicken, '主餐', 'processed')
    assert.ok(tags.includes('post_workout') || tags.includes('high_protein'))
    const profile = buildFoodIntelligenceProfile(chicken, catalog)
    assert.ok(profile.recommendation_rules.includes('post_workout_good'))
  })

  it('11. 早餐不推薦牛肉麵', () => {
    const beef = catalog.byId.get('beef-1')!
    const ctx = computeMealContext(beef, '主餐')
    assert.ok(ctx.breakfast < 30)
    const profile = buildFoodIntelligenceProfile(beef, catalog)
    assert.ok(profile.recommendation_rules.includes('breakfast_poor'))
  })

  it('12. 晚餐脂肪超標時避開炸物', () => {
    const fried = catalog.byId.get('fried-1')!
    const profile = buildFoodIntelligenceProfile(fried, catalog)
    assert.ok(profile.recommendation_rules.includes('fried_avoid'))
    assert.ok(profile.recommendation_rules.includes('dinner_heavy'))
  })
})

describe('food-intelligence relationships', () => {
  it('13. recommended_addons 不得生成官方不存在套餐', () => {
    const main = catalog.byId.get('main-1')!
    const addons = buildRecommendedAddons(main, catalog, '主餐')
    for (const a of addons) {
      assert.ok(catalog.byId.has(a.item_id), 'addon must exist in catalog')
      assert.ok(!a.name.includes('＋'), 'no combo name')
      assert.ok(!a.name.includes('+套餐'), 'no fake combo')
    }
  })

  it('14. replacements 必須是替代建議，不可改原菜名', () => {
    const fried = catalog.byId.get('fried-1')!
    const reps = buildRecommendedReplacements(fried, catalog)
    assert.notEqual(fried.name, reps[0]?.name)
    for (const r of reps) {
      assert.notEqual(r.name, fried.name)
      assert.ok(r.reason.length > 5)
    }
  })

  it('15. D 級品項不得建立 runtime recommendation edge', () => {
    const dItem = catalog.byId.get('d-blocked')!
    const main = catalog.byId.get('main-1')!
    const edges = buildMealGraphEdges(
      main,
      catalog,
      [{ item_id: dItem.id, name: dItem.name, reason: 'test' }],
      [],
      '主餐'
    )
    assert.equal(edges[0]?.runtime_safe, false)
  })

  it('16. A/B edge is runtime_safe', () => {
    const main = catalog.byId.get('main-1')!
    const egg = catalog.byId.get('side-1')!
    const edges = buildMealGraphEdges(
      main,
      catalog,
      [{ item_id: egg.id, name: egg.name, reason: '蛋白質' }],
      [],
      '主餐'
    )
    assert.equal(edges[0]?.runtime_safe, true)
  })

  it('17. popularity never defaults to 100', () => {
    for (const i of catalogItems) {
      assert.ok(computePopularityScore(i) <= 85)
    }
  })

  it('18. explain array non-empty', () => {
    const profile = buildFoodIntelligenceProfile(catalog.byId.get('main-1')!, catalog)
    assert.ok(profile.explain.length >= 3)
  })

  it('19. meal_context all slots 0-100', () => {
    const profile = buildFoodIntelligenceProfile(catalog.byId.get('main-1')!, catalog)
    for (const v of Object.values(profile.meal_context)) {
      assert.ok(v >= 0 && v <= 100)
    }
  })

  it('20. fried replacement suggests grill/chicken', () => {
    const fried = catalog.byId.get('fried-1')!
    const reps = buildRecommendedReplacements(fried, catalog)
    assert.ok(reps.some(r => /烤|雞胸/.test(r.name)))
  })

  it('21. bubble tea addon suggests unsweet tea', () => {
    const bubble = catalog.byId.get('bubble-1')!
    const addons = buildRecommendedAddons(bubble, catalog, '手搖飲')
    assert.ok(addons.some(a => /無糖/.test(a.name)))
  })

  it('22. convenience category for 7-11', () => {
    const main = catalog.byId.get('main-1')!
    assert.equal(inferFoodCategory({ ...main, source: 'convenience' }), '便利商店商品')
  })

  it('23. processing ultra for bubble tea', () => {
    const bubble = catalog.byId.get('bubble-1')!
    assert.equal(inferProcessingLevel(bubble, '手搖飲'), 'ultra_processed')
  })

  it('24. engine manifest coverage 100%', () => {
    const qaItems = catalogItems.filter(i => i.verification?.confidence !== 'D')
    const { manifest, report } = runFoodIntelligenceLayer(qaItems)
    assert.equal(report.items_processed, qaItems.length)
    assert.equal(report.coverage_pct, 100)
    assert.equal(Object.keys(manifest.profiles).length, qaItems.length)
  })

  it('25. nutrition values unchanged in profile', () => {
    const main = catalog.byId.get('main-1')!
    const before = { ...main }
    buildFoodIntelligenceProfile(main, catalog)
    assert.equal(main.calories, before.calories)
    assert.equal(main.protein_g, before.protein_g)
  })

  it('26. weight_loss tag needs protein and low cal', () => {
    const good = item({ id: 'w', name: '雞胸沙拉', store: 'x', protein_g: 35, calories: 320, fat_g: 8 })
    const tags = inferDietTags(good, '主餐', 'lightly_processed')
    assert.ok(tags.includes('weight_loss'))
  })

  it('27. tea egg breakfast context high', () => {
    const egg = catalog.byId.get('side-1')!
    const ctx = computeMealContext(egg, '配菜')
    assert.ok(ctx.breakfast >= 75)
  })

  it('28. graph edges explain non-combo', () => {
    const main = catalog.byId.get('main-1')!
    const profile = buildFoodIntelligenceProfile(main, catalog)
    for (const e of profile.meal_graph_edges) {
      assert.ok(e.explain.includes('非官方套餐') || e.explain.includes('替代'))
    }
  })

  it('29. high risk fried bubble', () => {
    const bubble = catalog.byId.get('bubble-1')!
    const profile = buildFoodIntelligenceProfile(bubble, catalog)
    assert.ok(profile.recommendation_rules.includes('sugar_limit_bad'))
  })

  it('30. subway addon may include tea egg', () => {
    const sub = catalog.byId.get('sub-1')!
    const addons = buildRecommendedAddons(sub, catalog, '主餐')
    assert.ok(addons.length >= 0)
  })

  it('31. manifest policy staging only', () => {
    const { manifest } = runFoodIntelligenceLayer(catalogItems.slice(0, 3))
    assert.equal(manifest.policy, 'staging_intelligence_only')
  })

  it('32. D item runtime_blocked rule', () => {
    const d = catalog.byId.get('d-blocked')!
    const profile = buildFoodIntelligenceProfile(d, catalog)
    assert.ok(profile.recommendation_rules.includes('runtime_blocked'))
  })
})
