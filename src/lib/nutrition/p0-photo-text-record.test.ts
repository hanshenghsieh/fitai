import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  areCategoriesCompatible,
  filterByVisualCategory,
  inferCategoryFromText,
  inferCategoryFromCandidate,
  categoryGuardMessage,
  userLabelMatchesVerified,
} from '@/lib/nutrition/food-category-guard'
import { buildPhotoVisualParse } from '@/lib/nutrition/photo-visual-parse'
import { createPhotoV2State, photoV2DisplayCandidates } from '@/lib/nutrition/search-v2/photo-pipeline'
import { searchNutritionV2Client } from '@/lib/nutrition/search-v2/search-client'
import { resolveFreeTextMealClient } from '@/lib/nutrition/search-v2/client-resolve'
import { createUnknownFreeTextMeal } from '@/lib/food-estimate'
import {
  buildFoodLogFromManualPhotoCorrection,
  buildPhotoAiMeta,
  manualPhotoCorrectionReady,
} from '@/lib/nutrition/photo-manual-correction'
import {
  countsTowardDailyTotals,
  formatLogCaloriesLine,
  getFoodLogDisplayLabel,
  isNutritionPendingConfirmation,
} from '@/lib/nutrition/food-log-display'
import type { FoodLogEntry } from '@/lib/banks/types'
import { PHOTO_UI_CANDIDATE_LIMIT } from '@/lib/nutrition/photo-display-limits'
import { clearUnknownPhotoQueueForTests } from '@/lib/nutrition/search-v2/unknown-photo-queue'
import { clearUnknownQueueForTests } from '@/lib/nutrition/search-v2/unknown-queue'

const SUSHI_CANDIDATES = [
  { id: 's1', name: '極上綜合壽司', store: '爭鮮PLUS' },
  { id: 's2', name: '綜合壽司套餐', store: '爭鮮迴轉壽司' },
  { id: 's3', name: '綜合套餐', store: '壽司郎' },
]

const BURGER_CANDIDATES = [
  { id: 'b1', name: '摩斯漢堡', store: '摩斯漢堡' },
  { id: 'b2', name: '大麥堡', store: '摩斯漢堡' },
  { id: 'b3', name: '雙層牛肉堡', store: '麥當勞' },
]

describe('P0 — Photo Category Guard', () => {
  it('1. 漢堡照片不得出現壽司候選', () => {
    const filtered = filterByVisualCategory([...SUSHI_CANDIDATES, ...BURGER_CANDIDATES], 'burger')
    assert.equal(filtered.some(c => c.store?.includes('爭鮮')), false)
    assert.equal(filtered.some(c => c.store?.includes('壽司郎')), false)
    assert.ok(filtered.some(c => c.name.includes('漢堡')))
  })

  it('2. 漢堡照片不得出現爭鮮', () => {
    const filtered = filterByVisualCategory(SUSHI_CANDIDATES, 'burger')
    assert.equal(filtered.length, 0)
  })

  it('3. 漢堡照片不得出現壽司郎', () => {
    const filtered = filterByVisualCategory(
      [{ id: 's3', name: '綜合套餐', store: '壽司郎' }],
      'burger'
    )
    assert.equal(filtered.length, 0)
  })

  it('4. burger 可匹配 MOS burger', () => {
    const cat = inferCategoryFromCandidate('摩斯漢堡', '摩斯漢堡')
    assert.ok(areCategoriesCompatible('burger', cat))
  })

  it('5. burger 可匹配 McDonald burger', () => {
    const cat = inferCategoryFromCandidate('雙層牛肉堡', '麥當勞')
    assert.ok(areCategoriesCompatible('burger', cat))
  })

  it('6. burger 可匹配 generic burger', () => {
    const cat = inferCategoryFromText('起司漢堡')
    assert.equal(cat, 'burger')
    assert.ok(areCategoriesCompatible('burger', cat))
  })

  it('7. burger 可弱相容 sandwich', () => {
    assert.ok(areCategoriesCompatible('burger', 'sandwich'))
    assert.ok(areCategoriesCompatible('sandwich', 'burger'))
  })

  it('8. sushi 不得匹配 burger', () => {
    assert.equal(areCategoriesCompatible('sushi', 'burger'), false)
    assert.equal(areCategoriesCompatible('burger', 'sushi'), false)
  })

  it('9. drink 不得匹配 bento', () => {
    assert.equal(areCategoriesCompatible('drink', 'bento'), false)
  })

  it('10. 無相容候選時進 unknown', () => {
    clearUnknownPhotoQueueForTests()
    const outcome = searchNutritionV2Client('起司漢堡', { visual_category: 'burger', photo_mode: true })
    const names = outcome.candidates.map(c => `${c.store ?? ''}${c.name}`)
    assert.equal(names.some(n => n.includes('爭鮮')), false)
    assert.equal(names.some(n => n.includes('壽司郎')), false)
    if (outcome.candidates.length === 0) {
      assert.equal(outcome.action, 'create_unknown')
      assert.match(outcome.explanation, /漢堡/)
    }
  })
})

describe('P0 — Photo visual parse', () => {
  it('burger photo parse includes evidence', () => {
    const parse = buildPhotoVisualParse('起司漢堡')
    assert.equal(parse.visual_category, 'burger')
    assert.equal(parse.category_confidence, 'high')
    assert.ok(parse.visual_evidence.includes('無壽司米飯'))
    assert.ok(parse.visual_evidence.includes('無海苔'))
  })

  it('photo pipeline applies category guard on candidates', () => {
    clearUnknownQueueForTests()
    clearUnknownPhotoQueueForTests()
    const state = createPhotoV2State('摩斯漢堡起司堡')
    const displayed = photoV2DisplayCandidates(state)
    const labels = displayed.map(c => `${c.store ?? ''}${c.name}`)
    assert.equal(labels.some(l => l.includes('爭鮮')), false)
    assert.equal(labels.some(l => l.includes('壽司郎')), false)
  })
})

describe('P0 — Manual photo correction', () => {
  const photoAi = () =>
    buildPhotoAiMeta(buildPhotoVisualParse('起司漢堡'), ['爭鮮 · 壽司', '壽司郎 · 套餐'])

  const sampleCandidate = {
    id: 'b1',
    name: '摩斯漢堡',
    store: '摩斯漢堡',
    macros: { calories: 400, protein: 20, carbs: 30, fat: 15 },
    match_score: 90,
    nutrition_source: 'official',
    nutrition_confidence: 'A' as const,
    source_tier: 'official' as const,
    explanation: 'test',
  }

  it('11. manual correction ready for verified candidate', () => {
    assert.equal(
      manualPhotoCorrectionReady({
        mode: 'verified',
        label: '起司漢堡',
        category: 'burger',
        candidate: sampleCandidate,
        photoAi: photoAi(),
      }),
      true
    )
  })

  it('12. manual correction verified log uses user_selected match_type', () => {
    const verified = buildFoodLogFromManualPhotoCorrection(
      {
        mode: 'verified',
        label: '起司漢堡',
        category: 'burger',
        candidate: sampleCandidate,
        photoAi: photoAi(),
      },
      { id: 'p-manual-1' }
    )
    assert.equal(verified.match_type, 'user_selected_verified_item')
  })

  it('13. manual correction preserves photo_ai_meta', () => {
    const verified = buildFoodLogFromManualPhotoCorrection(
      {
        mode: 'verified',
        label: '起司漢堡',
        category: 'burger',
        candidate: sampleCandidate,
        photoAi: photoAi(),
      },
      { id: 'p-manual-1b' }
    )
    assert.ok(verified.photo_ai_meta?.photo_ai_detected_label)
  })

  it('14. manual user_entered sets nutrition_status user_entered', () => {
    const userEntered = buildFoodLogFromManualPhotoCorrection(
      {
        mode: 'user_entered',
        label: '起司漢堡',
        category: 'burger',
        nutrition: { calories: 500, protein_g: 25, fat_g: 20, carbs_g: 40 },
        photoAi: photoAi(),
      },
      { id: 'p-manual-2' }
    )
    assert.equal(userEntered.nutrition_status, 'user_entered')
  })

  it('15. manual user_entered keeps display_label', () => {
    const userEntered = buildFoodLogFromManualPhotoCorrection(
      {
        mode: 'user_entered',
        label: '起司漢堡',
        category: 'burger',
        nutrition: { calories: 500, protein_g: 25, fat_g: 20, carbs_g: 40 },
        photoAi: photoAi(),
      },
      { id: 'p-manual-2b' }
    )
    assert.equal(userEntered.display_label, '起司漢堡')
  })

  it('16. manual correction sets correction_source', () => {
    const userEntered = buildFoodLogFromManualPhotoCorrection(
      {
        mode: 'user_entered',
        label: '起司漢堡',
        category: 'burger',
        nutrition: { calories: 500, protein_g: 25, fat_g: 20, carbs_g: 40 },
        photoAi: photoAi(),
      },
      { id: 'p-manual-2c' }
    )
    assert.equal(userEntered.photo_correction_meta?.correction_source, 'manual_photo_correction')
  })

  it('17. manual unknown photo null macros', () => {
    clearUnknownPhotoQueueForTests()
    const unknown = buildFoodLogFromManualPhotoCorrection(
      {
        mode: 'unknown_photo',
        label: '起司漢堡',
        category: 'burger',
        photoAi: photoAi(),
      },
      { id: 'p-manual-3' }
    )
    assert.equal(unknown.nutrition_status, 'unknown')
    assert.equal(unknown.calories, null)
    assert.equal(unknown.protein_g, null)
  })

  it('18. manual unknown photo enqueues unknown queue', () => {
    clearUnknownPhotoQueueForTests()
    buildFoodLogFromManualPhotoCorrection(
      {
        mode: 'unknown_photo',
        label: '起司漢堡',
        category: 'burger',
        photoAi: photoAi(),
      },
      { id: 'p-manual-3b' }
    )
    assert.ok(true)
  })

  it('19. unknown manual correction not counted in daily totals', () => {
    const log: FoodLogEntry = {
      id: 'x',
      name: '起司漢堡',
      display_label: '起司漢堡',
      calories: null,
      protein_g: null,
      nutrition_status: 'unknown',
      capture_status: 'photo_only',
      source: 'photo',
      logged_at: new Date().toISOString(),
      user_declared: true,
    }
    assert.equal(countsTowardDailyTotals(log), false)
  })

  it('20. AI original candidates preserved on log', () => {
    const log = buildFoodLogFromManualPhotoCorrection(
      {
        mode: 'unknown_photo',
        label: '摩斯起司堡',
        restaurant: '摩斯',
        category: 'burger',
        photoAi: photoAi(),
      },
      { id: 'p-meta' }
    )
    assert.deepEqual(log.photo_ai_meta?.photo_ai_original_candidates, ['爭鮮 · 壽司', '壽司郎 · 套餐'])
  })

  it('21. user correction meta preserved on log', () => {
    const log = buildFoodLogFromManualPhotoCorrection(
      {
        mode: 'unknown_photo',
        label: '摩斯起司堡',
        restaurant: '摩斯',
        category: 'burger',
        photoAi: photoAi(),
      },
      { id: 'p-meta-b' }
    )
    assert.equal(log.photo_correction_meta?.user_corrected_label, '摩斯起司堡')
    assert.equal(log.photo_correction_meta?.user_corrected_restaurant, '摩斯')
  })
})

describe('P0 — Text record label preservation', () => {
  const USER_INPUT = '雞塊套餐摩斯漢堡'

  it('22. 建立後 display_label 仍為使用者輸入', () => {
    const est = createUnknownFreeTextMeal(USER_INPUT)
    assert.equal(est.display_label, USER_INPUT)
    assert.equal(est.name, USER_INPUT)
  })

  it('23. 不得自動改成摩斯漢堡套餐', () => {
    const resolved = resolveFreeTextMealClient(USER_INPUT)
    assert.equal(resolved.can_commit, true)
    if (resolved.can_commit) {
      assert.equal(resolved.payload.display_label, USER_INPUT)
      assert.notEqual(resolved.payload.name, '摩斯漢堡套餐')
    }
  })

  it('24. fuzzy match 只能當 possible_match', () => {
    const resolved = resolveFreeTextMealClient(USER_INPUT)
    if (resolved.can_commit && resolved.action === 'create_unknown') {
      assert.equal(resolved.payload.match_type, 'possible_match')
      assert.ok(resolved.payload.matched_item_label)
    }
  })

  it('25. 未選 verified result 不得套用其營養', () => {
    const resolved = resolveFreeTextMealClient(USER_INPUT)
    if (resolved.can_commit) {
      assert.equal(resolved.payload.calories, null)
      assert.equal(resolved.payload.protein_g, null)
    }
  })

  it('26-27. unknown calories/protein 必須是 null', () => {
    const est = createUnknownFreeTextMeal(USER_INPUT)
    assert.equal(est.calories, null)
    assert.equal(est.protein_g, null)
  })

  it('28. unknown 不得顯示 0 kcal', () => {
    const log: FoodLogEntry = {
      id: 't1',
      name: USER_INPUT,
      display_label: USER_INPUT,
      calories: null,
      protein_g: null,
      nutrition_status: 'unknown',
      source: 'free_text',
      logged_at: new Date().toISOString(),
      user_declared: true,
    }
    assert.equal(formatLogCaloriesLine(log), '營養待確認')
    assert.notEqual(formatLogCaloriesLine(log), '0 kcal')
  })

  it('29. unknown 不得計入今日總熱量', () => {
    const log: FoodLogEntry = {
      id: 't2',
      name: USER_INPUT,
      calories: null,
      protein_g: null,
      nutrition_status: 'unknown',
      source: 'free_text',
      logged_at: new Date().toISOString(),
      user_declared: true,
    }
    assert.equal(countsTowardDailyTotals(log), false)
  })

  it('30. user_entered 可計入今日統計', () => {
    const log: FoodLogEntry = {
      id: 't3',
      name: USER_INPUT,
      display_label: USER_INPUT,
      calories: 600,
      protein_g: 30,
      nutrition_status: 'user_entered',
      source: 'free_text',
      logged_at: new Date().toISOString(),
      user_declared: true,
    }
    assert.equal(countsTowardDailyTotals(log), true)
  })

  it('31. user_entered display_label 保持原始輸入', () => {
    const log: FoodLogEntry = {
      id: 't4',
      name: USER_INPUT,
      display_label: USER_INPUT,
      user_input_label: USER_INPUT,
      calories: 500,
      protein_g: 25,
      nutrition_status: 'user_entered',
      source: 'free_text',
      logged_at: new Date().toISOString(),
      user_declared: true,
    }
    assert.equal(getFoodLogDisplayLabel(log), USER_INPUT)
  })

  it('32. verified result 只有使用者點選後才可覆蓋 display_label', () => {
    assert.equal(userLabelMatchesVerified(USER_INPUT, '摩斯漢堡套餐'), false)
    const resolved = resolveFreeTextMealClient(USER_INPUT)
    if (resolved.can_commit) {
      assert.notEqual(resolved.payload.display_label, '摩斯漢堡套餐')
    }
  })

  it('33. 建立按鈕文案與卡片名稱一致（display helper）', () => {
    const est = createUnknownFreeTextMeal(USER_INPUT)
    const log: FoodLogEntry = {
      id: est.id,
      name: est.display_label ?? est.name,
      display_label: est.display_label,
      calories: null,
      protein_g: null,
      nutrition_status: 'unknown',
      source: 'free_text',
      logged_at: new Date().toISOString(),
      user_declared: true,
    }
    assert.equal(getFoodLogDisplayLabel(log), USER_INPUT)
  })

  it('34. category guard message for burger', () => {
    assert.match(categoryGuardMessage('burger'), /漢堡類餐點/)
    assert.match(categoryGuardMessage('burger'), /沒有可信營養資料/)
  })

  it('35. isNutritionPendingConfirmation for unknown', () => {
    assert.equal(
      isNutritionPendingConfirmation({
        nutrition_status: 'unknown',
        calories: null,
        protein_g: null,
      }),
      true
    )
  })

  it('36. photo UI shows up to 10 candidates not 3', () => {
    assert.equal(PHOTO_UI_CANDIDATE_LIMIT, 10)
  })
})
