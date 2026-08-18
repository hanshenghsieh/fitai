/**
 * Build 38 BUG 3 — regression tests for the "螺旋麵沙拉 + 小黃瓜 + 火腿 +
 * 美乃滋醬" compound-meal mismatch: a compound photo label got resolved as
 * a search for ONE single branded product, an unrelated Starbucks
 * ham-cheese-croissant surfaced as a trusted candidate purely from a
 * generic-ingredient substring overlap, and the correctly-categorized salad
 * candidate was hard-deleted by a low-confidence visual-category guess —
 * leaving the user with only wrong candidates and a disabled save button.
 *
 * CASE numbering matches the fix-phase request exactly.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { scoreNameMatch, searchFoodMenuExtended } from '@/lib/food-menu-lookup'
import { normalizeFoodName } from '@/lib/food-kb/normalize'
import { wholeFoodSearchCandidates } from '@/lib/nutrition/search-v2/whole-food-candidates'
import { applyVisualCategoryGuard } from '@/lib/nutrition/food-category-guard'
import {
  compoundMealCandidateFromLabel,
  requiredCompoundMatchCount,
} from '@/lib/nutrition/search-v2/compound-meal-candidate'
import {
  createPhotoV2State,
  updatePhotoV2State,
  photoV2ReadyForLog,
} from '@/lib/nutrition/search-v2/photo-pipeline'
import { searchNutritionV2Client } from '@/lib/nutrition/search-v2/search-client'
import { aiEstimateToCandidate } from '@/lib/nutrition/ai-nutrition-fallback'
import type { AiNutritionEstimate } from '@/lib/claude/schemas'

const PASTA_SALAD_LABEL = '螺旋麵沙拉 + 小黃瓜 + 火腿 + 美乃滋醬'

describe('Build 38 BUG 3 — compound meal / generic-ingredient guard', () => {
  it('CASE 1: compound pasta-salad label does not resolve to the wrong branded candidate and has a save path', () => {
    const state = createPhotoV2State(PASTA_SALAD_LABEL)

    // No unrelated branded composite product (the Starbucks item, or any
    // other croissant-type product) should appear anywhere in the outcome —
    // FIX 2 must have excluded it at the matcher level entirely.
    assert.equal(
      state.outcome.candidates.some(c => c.name.includes('可頌')),
      false,
      'branded croissant product must not appear as a candidate at all'
    )

    // Must not be stuck on an unresolved clarify session with only wrong
    // candidates — FIX 1 routes a non-Level-A compound label to the
    // ingredient-sum estimate instead.
    assert.equal(state.outcome.action, 'create_official')
    assert.equal(state.outcome.level, 'C')
    assert.ok(state.outcome.official_record)
    assert.equal(state.outcome.official_record?.nutrition_status, 'estimated')
    assert.ok((state.outcome.official_record?.macros.calories ?? 0) > 0)

    // A safe path to "加入今日紀錄" must exist: not ready before confirmation...
    assert.equal(photoV2ReadyForLog(state), false)
    // ...but ready once the user confirms the estimate.
    const confirmed = updatePhotoV2State(state, {
      user_confirmed: true,
      selected_candidate_id: state.outcome.official_record!.id,
    })
    assert.equal(photoV2ReadyForLog(confirmed), true)
  })

  it('CASE 2: bare "火腿" query does not trust branded composite items as ingredient matches', () => {
    const qNorm = normalizeFoodName('火腿')
    const brandedNames = ['火腿起司可頌', '火腿蛋吐司', '火腿潛艇堡', '火腿三明治', '火腿蛋餅', '火腿起司蛋凱薩堡']
    for (const name of brandedNames) {
      const score = scoreNameMatch(qNorm, name)
      assert.ok(
        score < 45,
        `"火腿" vs "${name}" scored ${score}, expected < 45 (below runtime-menu admission threshold)`
      )
    }
    // Real production menu data — must no longer surface as admitted candidates.
    const hits = searchFoodMenuExtended('火腿')
    assert.equal(hits.length, 0, `expected zero admitted candidates for bare "火腿", got: ${hits.map(h => h.name).join(', ')}`)
  })

  it('CASE 3: full product name "星巴克火腿起司可頌" still matches the real product (FIX 2 must not break legitimate full-name search)', () => {
    const qNorm = normalizeFoodName('星巴克火腿起司可頌')
    const score = scoreNameMatch(qNorm, '火腿起司可頌')
    assert.ok(score >= 45, `full product-name query scored ${score}, expected >= 45`)
  })

  it('CASE 4: bare "小黃瓜" still matches 小黃瓜（生） via the whole-food ingredient DB', () => {
    const hits = wholeFoodSearchCandidates('小黃瓜')
    assert.ok(hits.length > 0, 'expected at least one whole-food match for 小黃瓜')
    assert.ok(hits[0]!.name.includes('黃瓜'))
  })

  it('CASE 6: a high-lexical-confidence salad candidate is not hard-deleted by a low-confidence noodle guess, and can still outrank an unknown-category candidate', () => {
    const candidates = [
      { id: 'salad', name: '沙拉加醬', match_score: 82 },
      { id: 'unknown-item', name: '某某未分類商品', match_score: 20 },
    ]
    const guarded = applyVisualCategoryGuard(candidates, 'noodle', 'medium')
    // Soft downgrade, not hard delete — both candidates must survive.
    assert.equal(guarded.length, 2)
    const salad = guarded.find(c => c.id === 'salad')!
    const unknownItem = guarded.find(c => c.id === 'unknown-item')!
    assert.ok(
      salad.match_score > unknownItem.match_score,
      `expected known-but-conflicting salad (${salad.match_score}) to outrank unknown-category item (${unknownItem.match_score})`
    )
  })

  it('CASE 6b: a high-confidence hard-incompatible guess (burger vs sushi) still excludes — existing P0 guarantee unaffected', () => {
    const candidates = [{ id: 'sushi', name: '極上綜合壽司', store: '爭鮮PLUS', match_score: 90 }]
    const guarded = applyVisualCategoryGuard(candidates, 'burger', 'high')
    assert.equal(guarded.length, 0)
  })

  it('CASE 7: fully-unknown home-cooked compound label does not dead-end and is loggable as a photo-only record', () => {
    const state = createPhotoV2State('神秘食材甲 + 神秘食材乙')
    assert.equal(compoundMealCandidateFromLabel('神秘食材甲 + 神秘食材乙'), null)
    assert.equal(
      state.outcome.candidates.some(c => c.nutrition_status === 'official' && c.match_score > 60),
      false,
      'must not fabricate a confident match against an unrelated branded product'
    )
    // create_unknown (photo-only record) is always saveable — no disabled dead end.
    assert.equal(photoV2ReadyForLog(state), true)
  })

  it('CASE 8a: existing golden single-item cases are unaffected by the compound-query guard (qTokens.length === 1 path untouched)', () => {
    for (const q of ['蛋', '水煮蛋', '茶葉蛋', '溏心蛋', '飯糰', '御飯糰', '地瓜']) {
      // Sanity: single, undelimited dish names never hit the qTokens.length > 1
      // branch added in FIX 2 — regex extracts one contiguous CJK run.
      const tokens = normalizeFoodName(q).match(/[一-鿿]{2,}|[a-z0-9]{2,}/gi) ?? []
      assert.ok(tokens.length <= 1, `expected "${q}" to tokenize to <= 1 token, got ${JSON.stringify(tokens)}`)
    }
  })
})

/**
 * Build 38 BUG 4 — a real-device photo of a potato/cucumber salad was
 * vision-misidentified as 3 unrelated segments; only ONE of those segments
 * happened to fuzzy-match the whole-food ingredient DB. The old "at least 1
 * segment matched" rule let that single, coincidental match hijack the
 * outcome into a confident-looking partial "estimated" total AND pre-empt
 * the real create_unknown -> runAiNutritionFallback() path. CASE numbering
 * here matches this round's fix-phase request (distinct from BUG 3's CASE
 * 6/6b above, which is about the visual-category guard, not coverage).
 */
describe('Build 38 BUG 4 — compound coverage gate', () => {
  it('requiredCompoundMatchCount locks the exact systemic rule', () => {
    assert.equal(requiredCompoundMatchCount(1), 1)
    assert.equal(requiredCompoundMatchCount(2), 2)
    assert.equal(requiredCompoundMatchCount(3), 2)
    assert.equal(requiredCompoundMatchCount(4), 2)
    assert.equal(requiredCompoundMatchCount(5), 3)
    assert.equal(requiredCompoundMatchCount(6), 3)
    assert.equal(requiredCompoundMatchCount(7), 4)
  })

  it('CASE 5: 2-segment label with only 1 of 2 matched must NOT produce a partial aggregate', () => {
    // "小黃瓜" resolves via the whole-food DB; the other segment is nonsense.
    const result = compoundMealCandidateFromLabel('小黃瓜 + 未知神秘配料XYZ')
    assert.equal(result, null)
  })

  it('CASE 5b: 4-segment label with only 1 of 4 matched (the real incident shape) must NOT produce a partial aggregate', () => {
    // Reproduces the reported incident's segment shape (3 vision-misread
    // items + 1 coincidental ingredient-DB hit) without hardcoding it in
    // production code — this is a regression fixture, not a prompt rule.
    const result = compoundMealCandidateFromLabel('未知食物甲 + 未知食物乙／未知食物丙 + 小黃瓜')
    assert.equal(result, null)
  })

  it('CASE 6: sufficient coverage (2 of 2) still produces an aggregate with correct macro conservation', () => {
    const result = compoundMealCandidateFromLabel('小黃瓜 + 火腿')
    assert.ok(result, 'expected an aggregate candidate when both segments resolve')
    const cucumber = wholeFoodSearchCandidates('小黃瓜')[0]!
    const ham = wholeFoodSearchCandidates('火腿')[0]!
    assert.equal(result!.macros.calories, (cucumber.macros.calories ?? 0) + (ham.macros.calories ?? 0))
    assert.equal(
      Math.round((result!.macros.protein ?? 0) * 10) / 10,
      Math.round(((cucumber.macros.protein ?? 0) + (ham.macros.protein ?? 0)) * 10) / 10
    )
  })

  it('CASE 6b: sufficient coverage for a 4-segment label (>= half) still produces an aggregate', () => {
    // 螺旋麵沙拉 unmatched, 小黃瓜/火腿/美乃滋醬 matched — 3 of 4 clears the
    // required-2-of-4 threshold from requiredCompoundMatchCount(4).
    const result = compoundMealCandidateFromLabel('螺旋麵沙拉 + 小黃瓜 + 火腿 + 美乃滋醬')
    assert.ok(result, 'expected the previously-fixed 3/4 coverage case to still produce an aggregate')
  })

  it('CASE 7: insufficient coverage restores create_unknown so the real AI fallback condition is reachable', () => {
    // Regression fixture reproducing the reported incident's exact segment
    // shape (3 vision-misread items, only 1 of which coincidentally hits the
    // whole-food ingredient DB) — a fixture reproducing a real bug report is
    // not the same as hardcoding a rule into production code.
    const label = '未知視覺誤判食材甲 + 未知視覺誤判食材乙／未知視覺誤判食材丙'
    assert.equal(compoundMealCandidateFromLabel(label), null)

    // The full photo pipeline must fall through to whatever the normal
    // (non-compound-guarded) search produces for this label.
    const normalOutcome = searchNutritionV2Client(label)
    const state = createPhotoV2State(label)
    assert.equal(state.outcome.action, normalOutcome.action)
    assert.equal(
      state.outcome.action,
      'create_unknown',
      'expected the API-layer AI-fallback trigger condition (action === "create_unknown") to be reachable'
    )
  })

  it('CASE 8: nutrition provenance distinguishes a real AI estimate from a compound-DB estimate', () => {
    const compoundCandidate = compoundMealCandidateFromLabel('小黃瓜 + 火腿')
    assert.equal(compoundCandidate?.estimate_provenance, 'compound_db_estimate')

    const estimate: AiNutritionEstimate = {
      canonical_name: '任意食物',
      estimated_weight_g: 100,
      calories: 100,
      protein_g: 5,
      carbs_g: 10,
      fat_g: 2,
      confidence: 0.5,
      reason: '測試',
      source_type: 'ai_estimate',
    }
    const aiCandidate = aiEstimateToCandidate(estimate, false)
    assert.equal(aiCandidate.estimate_provenance, 'ai_estimate')
    assert.notEqual(compoundCandidate?.estimate_provenance, aiCandidate.estimate_provenance)
  })

  it('CASE 9: a fully unrecognized single (non-compound) food still reaches create_unknown', () => {
    const state = createPhotoV2State('完全無法辨識的神秘食物')
    assert.equal(state.outcome.action, 'create_unknown')
    assert.equal(photoV2ReadyForLog(state), true)
  })
})

describe('CASE E — P0 photo-portion fix: mixed meal (rice + vegetables + bone-in chicken) totals exactly sum its items', () => {
  const MIXED_MEAL_LABEL = '白飯 + 青江菜 + 櫛瓜 + 帶骨雞腿'

  it('all 4 segments of the reported bug-report meal resolve (previously the chicken segment failed to match at all)', () => {
    const result = compoundMealCandidateFromLabel(MIXED_MEAL_LABEL)
    assert.ok(result, 'expected an aggregate candidate for the full 4-segment meal')
    assert.equal(result!.explanation.includes('未辨識'), false, 'expected all 4 segments to match, not a partial sum')
  })

  it('the compound total is exactly the sum of each segment resolved independently (macro conservation)', () => {
    const result = compoundMealCandidateFromLabel(MIXED_MEAL_LABEL)!
    const rice = wholeFoodSearchCandidates('白飯')[0]!
    const veg1 = wholeFoodSearchCandidates('青江菜')[0]!
    const veg2 = wholeFoodSearchCandidates('櫛瓜')[0]!
    const chicken = wholeFoodSearchCandidates('帶骨雞腿')[0]!
    const expectedCalories =
      (rice.macros.calories ?? 0) + (veg1.macros.calories ?? 0) + (veg2.macros.calories ?? 0) + (chicken.macros.calories ?? 0)
    assert.equal(result.macros.calories, expectedCalories)
  })

  it('with an explicit "4塊" count on the chicken segment, the total reflects 4 pieces, not 1 (the actual bug-report scenario)', () => {
    const withCount = compoundMealCandidateFromLabel('白飯 + 青江菜 + 櫛瓜 + 4塊帶骨雞腿')!
    const withoutCount = compoundMealCandidateFromLabel(MIXED_MEAL_LABEL)!
    assert.ok(withCount.macros.calories! > withoutCount.macros.calories!)
  })

  it('the P0 bug-report meal (rice + greens + zucchini + 4 pieces of bone-in chicken thigh) now lands close to the reported plausible manual-estimate range, well above the previously-reported 352 kcal', () => {
    const result = compoundMealCandidateFromLabel('白飯 + 青江菜 + 櫛瓜 + 4塊帶骨雞腿')!
    // Rice/veg here fall back to the 100g reference (no explicit weight in
    // the label) — a real photo where the AI also reports rice/veg portion
    // text would land higher still via buildQuantifiedLabel. This asserts
    // the fix's direction and magnitude, not a single "true" number: must be
    // meaningfully above the reported 352 kcal bug, not just marginally.
    assert.ok(
      result.macros.calories! >= 450,
      `expected total calories meaningfully above the reported 352 kcal bug, got ${result.macros.calories}`
    )
    assert.notEqual(result.macros.calories, 352)
  })
})
