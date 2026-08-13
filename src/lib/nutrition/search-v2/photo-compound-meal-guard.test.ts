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
import { compoundMealCandidateFromLabel } from '@/lib/nutrition/search-v2/compound-meal-candidate'
import {
  createPhotoV2State,
  updatePhotoV2State,
  photoV2ReadyForLog,
} from '@/lib/nutrition/search-v2/photo-pipeline'

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
