import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  classifyMealScene,
  generateFoodCandidates,
  applyFoodDNATemplate,
  estimatePortionAdjustments,
  requireUserConfirmation,
  buildNutritionEstimateDraft,
  finalizeNutritionEstimate,
  finalizeToFoodLogPayload,
  runPhotoAccuracyPipeline,
} from './accuracy-engine.ts'

function finalizeConfirmed(draft: ReturnType<typeof buildNutritionEstimateDraft>) {
  return finalizeNutritionEstimate(draft, { user_confirmed: true })
}

describe('Nutrition Accuracy Engine', () => {
  it('1 convenience chicken breast — B quick add', () => {
    const input = { label: '雞胸肉', store: '7-11' }
    const scene = classifyMealScene(input)
    assert.equal(scene.category, 'convenience_store')
    const draft = buildNutritionEstimateDraft(input, generateFoodCandidates(input, scene)[0]!)
    assert.equal(draft.accuracy_level, 'B')
    assert.equal(draft.can_quick_add, true)
    assert.ok(draft.macros.kcal > 0)
  })

  it('2 tea egg', () => {
    const draft = buildNutritionEstimateDraft({ label: '茶葉蛋', store: '全家' }, {
      id: 'c', display_name: '茶葉蛋', canonical_food_name: '茶葉蛋', confidence: 0.8, match_reason: 'x',
    })
    assert.equal(draft.template.canonical_food_name, '茶葉蛋')
    assert.ok(draft.macros.protein_g >= 5)
  })

  it('3 sweet potato', () => {
    const draft = buildNutritionEstimateDraft({ label: '地瓜' }, {
      id: 'c', display_name: '地瓜', canonical_food_name: '地瓜', confidence: 0.8, match_reason: 'x',
    })
    assert.ok(draft.macros.carbs_g > 20)
  })

  it('4 mcdonalds combo requires confirmation', () => {
    const input = { label: '麥當勞大麥克套餐', store: '麥當勞' }
    const scene = classifyMealScene(input)
    const draft = buildNutritionEstimateDraft(input, generateFoodCandidates(input, scene)[0]!)
    assert.equal(draft.requires_confirmation, true)
    assert.equal(draft.can_quick_add, false)
  })

  it('5 bubble tea half sugar — C confirm', () => {
    const input = { label: '半糖珍珠奶茶', store: '五十嵐' }
    const scene = classifyMealScene(input)
    const draft = buildNutritionEstimateDraft(input, generateFoodCandidates(input, scene)[0]!)
    assert.equal(draft.accuracy_level, 'C')
    const { questions } = requireUserConfirmation(scene, draft.template, draft.accuracy_level)
    assert.ok(questions.some(q => q.id === 'drink_sugar'))
  })

  it('6 chicken leg bento — multiple candidates', () => {
    const input = { label: '雞腿便當', photo_parse: true, source_type: 'ai_photo_only' as const }
    const { candidates } = runPhotoAccuracyPipeline(input)
    assert.ok(candidates.length >= 2)
  })

  it('7 braised snack high risk', () => {
    const scene = classifyMealScene({ label: '滷味' })
    assert.ok(scene.is_high_risk)
    assert.ok(scene.high_risk_tags.includes('braised_snack'))
  })

  it('8 fried chicken', () => {
    const draft = buildNutritionEstimateDraft({ label: '鹽酥雞' }, {
      id: 'c', display_name: '鹽酥雞', canonical_food_name: '鹽酥雞', confidence: 0.7, match_reason: 'x',
    })
    assert.equal(draft.template.fried_risk, 'high')
    assert.equal(draft.requires_confirmation, true)
  })

  it('9 hot pot', () => {
    const scene = classifyMealScene({ label: '個人火鍋', store: '石二鍋' })
    assert.equal(scene.category, 'hot_pot')
    assert.ok(scene.requires_confirmation)
  })

  it('10 bbq', () => {
    const draft = buildNutritionEstimateDraft({ label: '燒肉套餐' }, {
      id: 'c', display_name: '燒肉套餐', canonical_food_name: '燒肉套餐', confidence: 0.7, match_reason: 'x',
    })
    assert.ok(draft.macros.kcal > 700)
  })

  it('11 night market chicken cutlet portion question', () => {
    const input = { label: '夜市雞排' }
    const scene = classifyMealScene(input)
    const { questions } = requireUserConfirmation(scene, applyFoodDNATemplate({
      id: 'c', display_name: '夜市雞排', canonical_food_name: '夜市雞排', confidence: 0.6, match_reason: 'x',
    }, input), 'C')
    assert.ok(questions.length <= 2)
  })

  it('12 subway A level verified', () => {
    const draft = buildNutritionEstimateDraft({
      label: 'Subway 潛艇堡',
      store: 'Subway',
      source_type: 'verified_brand_menu',
    }, {
      id: 'c', display_name: 'Subway 潛艇堡', canonical_food_name: 'Subway 潛艇堡', confidence: 0.9, match_reason: 'x',
    })
    assert.equal(draft.accuracy_level, 'A')
    assert.equal(draft.can_quick_add, true)
  })

  it('13 healthy meal box', () => {
    const draft = buildNutritionEstimateDraft({ label: '舒肥雞胸健康餐盒', store: '森度餐廚' }, {
      id: 'c', display_name: '舒肥雞胸健康餐盒', canonical_food_name: '舒肥雞胸健康餐盒', confidence: 0.85, match_reason: 'x',
    })
    assert.equal(draft.template.template_id, 'healthy_meal_box')
    assert.ok(draft.macros.protein_g >= 30)
  })

  it('14 breakfast egg crepe', () => {
    const scene = classifyMealScene({ label: '蛋餅', store: '美而美' })
    assert.equal(scene.category, 'breakfast_shop')
  })

  it('15 beef noodle confirm', () => {
    const draft = buildNutritionEstimateDraft({ label: '牛肉麵' }, {
      id: 'c', display_name: '牛肉麵', canonical_food_name: '牛肉麵', confidence: 0.7, match_reason: 'x',
    })
    assert.equal(draft.requires_confirmation, true)
  })

  it('16 curry rice', () => {
    const draft = buildNutritionEstimateDraft({ label: '咖哩飯' }, {
      id: 'c', display_name: '咖哩飯', canonical_food_name: '咖哩飯', confidence: 0.7, match_reason: 'x',
    })
    assert.ok(draft.template.high_risk_tags.includes('curry_rice'))
  })

  it('17 teppanyaki', () => {
    const scene = classifyMealScene({ label: '鐵板燒套餐' })
    assert.ok(scene.high_risk_tags.includes('teppanyaki'))
  })

  it('18 salad dressing sauce question', () => {
    const input = { label: '沙拉加醬' }
    const scene = classifyMealScene(input)
    const { questions } = requireUserConfirmation(scene, applyFoodDNATemplate({
      id: 'c', display_name: '沙拉加醬', canonical_food_name: '沙拉加醬', confidence: 0.7, match_reason: 'x',
    }, input), 'C')
    assert.ok(questions.some(q => q.id === 'sauce_level'))
  })

  it('19 mall food court location context', () => {
    const scene = classifyMealScene({
      label: '牛肉烏龍麵',
      store: '丸龜製麵',
      location_context: '台北101美食街',
    })
    assert.equal(scene.location_context, '台北101美食街')
    assert.equal(scene.category, 'mall_food_court')
  })

  it('20 buffet', () => {
    const scene = classifyMealScene({ label: '自助餐' })
    assert.ok(scene.high_risk_tags.includes('buffet'))
  })

  it('21 AI photo cannot write without confirm', () => {
    const { draft, final } = runPhotoAccuracyPipeline({
      label: '雞腿便當',
      source_type: 'ai_photo_only',
    })
    assert.ok(draft.requires_confirmation || !final.ready_for_food_log)
    assert.equal(final.ready_for_food_log, false)
  })

  it('22 AI photo official Level A can write without template guess', () => {
    const { final } = runPhotoAccuracyPipeline({
      label: '椰香綠咖哩嫩雞飯',
      source_type: 'ai_photo_only',
    })
    if (final.accuracy_level === 'A' && final.ready_for_food_log) {
      assert.ok(final.calories > 0)
      assert.equal(final.source_type, 'verified_brand_menu')
    } else {
      assert.equal(final.ready_for_food_log, false)
    }
  })

  it('23 portion adjustment less rice lowers kcal', () => {
    const template = applyFoodDNATemplate({
      id: 'c', display_name: '滷雞腿便當', canonical_food_name: '滷雞腿便當', confidence: 0.8, match_reason: 'x',
    }, { label: '滷雞腿便當' })
    const base = estimatePortionAdjustments(template, {})
    const less = estimatePortionAdjustments(template, { rice_portion: 'half' })
    assert.ok(less.kcal < base.kcal)
  })

  it('24 add-on tea egg delta', () => {
    const template = applyFoodDNATemplate({
      id: 'c', display_name: '地瓜', canonical_food_name: '地瓜', confidence: 0.8, match_reason: 'x',
    }, { label: '地瓜' })
    const withEgg = estimatePortionAdjustments(template, { add_on_ids: ['tea_egg'] })
    const plain = estimatePortionAdjustments(template, {})
    assert.ok(withEgg.protein_g > plain.protein_g)
  })

  it('25 barcode official A', () => {
    const template = applyFoodDNATemplate({
      id: 'c', display_name: '高蛋白牛奶', canonical_food_name: '高蛋白牛奶', confidence: 0.95, match_reason: 'x',
    }, {
      label: '高蛋白牛奶',
      barcode_hit: true,
      verified_menu: {
        kcal: 150, protein_g: 20, carbs_g: 8, fat_g: 3,
        portion_size: 1, portion_unit: '瓶',
      },
      source_type: 'barcode',
    })
    assert.equal(template.accuracy_level, 'A')
  })

  it('26 unknown food D without verified menu', () => {
    const template = applyFoodDNATemplate({
      id: 'c', display_name: '神秘料理', canonical_food_name: '神秘料理', confidence: 0.3, match_reason: 'x',
    }, { label: '神秘料理', source_type: 'ai_photo_only' })
    assert.equal(template.accuracy_level, 'D')
    assert.equal(template.kcal, 0)
  })

  it('27 finalizeToFoodLogPayload blocks when not ready', () => {
    const draft = buildNutritionEstimateDraft({ label: '雞腿便當', source_type: 'ai_photo_only' }, {
      id: 'c', display_name: '雞腿便當', canonical_food_name: '雞腿便當', confidence: 0.5, match_reason: 'x',
    })
    const final = finalizeNutritionEstimate(draft, { user_confirmed: false })
    assert.equal(finalizeToFoodLogPayload(final, { id: '1', logged_at: '2026-06-24T12:00:00Z' }), null)
  })

  it('28 finalizeToFoodLogPayload succeeds for B', () => {
    const draft = buildNutritionEstimateDraft({ label: '雞胸肉', store: '7-11' }, {
      id: 'c', display_name: '雞胸肉', canonical_food_name: '雞胸肉', confidence: 0.9, match_reason: 'x',
    })
    const final = finalizeConfirmed(draft)
    const log = finalizeToFoodLogPayload(final, { id: '1', logged_at: '2026-06-24T12:00:00Z' })
    assert.ok(log)
    assert.ok(log!.calories > 0)
  })

  it('29 drink sugar adjustment', () => {
    const template = applyFoodDNATemplate({
      id: 'c', display_name: '半糖珍珠奶茶', canonical_food_name: '半糖珍珠奶茶', confidence: 0.7, match_reason: 'x',
    }, { label: '半糖珍珠奶茶' })
    const none = estimatePortionAdjustments(template, { drink_sugar: 'none' })
    const full = estimatePortionAdjustments(template, { drink_sugar: 'full' })
    assert.ok(none.kcal < full.kcal)
  })

  it('30 combo meal tag on fast food', () => {
    const scene = classifyMealScene({ label: '麥當勞套餐' })
    assert.ok(scene.high_risk_tags.includes('combo_meal'))
  })

  it('31 generateFoodCandidates never returns empty', () => {
    const input = { label: '測試食物' }
    const scene = classifyMealScene(input)
    const c = generateFoodCandidates(input, scene)
    assert.ok(c.length >= 1 && c.length <= 3)
  })

  it('32 applyFoodDNATemplate has risk fields', () => {
    const t = applyFoodDNATemplate({
      id: 'c', display_name: '炸雞腿便當', canonical_food_name: '炸雞腿便當', confidence: 0.7, match_reason: 'x',
    }, { label: '炸雞腿便當' })
    assert.ok(['low', 'medium', 'high'].includes(t.portion_risk))
    assert.ok(t.protein_density >= 0)
  })
})
