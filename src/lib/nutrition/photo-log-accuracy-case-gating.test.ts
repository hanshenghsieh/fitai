import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createPhotoAccuracyState, photoAccuracyStateFromV2 } from './photo-log-accuracy'
import { createPhotoV2State } from './search-v2/photo-pipeline'
import { aiEstimateToCandidate } from './ai-nutrition-fallback'
import type { AiNutritionEstimate } from '@/lib/claude/schemas'

const PHOTO_LABEL = '溏心蛋（半熟水煮蛋）'

describe('Build 38 BUG 2 Task C — the three CASEs are mutually exclusive (Regression 8)', () => {
  it('CASE 1 (trusted Level A canonical match): shows nutrition only, never the product candidate selector', () => {
    const state = createPhotoAccuracyState(PHOTO_LABEL, { photo_id: 'case1' })
    assert.equal(state.v2.outcome.level, 'A')
    assert.equal(state.show_macros, true)
    assert.equal(state.show_candidate_picker, false)
    assert.equal(state.is_ai_estimate, false)
  })

  it('CASE 2 (ambiguous Level B, multiple reasonable candidates, not yet picked): shows the picker only, no premature macro card', () => {
    const state = createPhotoAccuracyState('三明治', { photo_id: 'case2' })
    assert.equal(state.v2.outcome.level, 'B')
    assert.equal(state.show_candidate_picker, true)
    assert.equal(state.show_macros, false)
  })

  it('CASE 2 resolved (user picks + confirms): picker hides, macro card shows — never both at once', () => {
    let state = createPhotoAccuracyState('三明治', { photo_id: 'case2b' })
    const pickedId = state.candidates[0]!.id
    const v2After = state.v2
    const updated = photoAccuracyStateFromV2({
      ...v2After,
      selected_candidate_id: pickedId,
      user_confirmed: true,
    })
    assert.equal(updated.show_candidate_picker, false)
    assert.equal(updated.show_macros, true)
  })

  it('CASE 3 (AI fallback, Level C): shows an AI-estimate-labeled macro card, never a multi-item picker', () => {
    const base = createPhotoV2State('未知食物不在資料庫', { photo_id: 'case3' })
    const estimate: AiNutritionEstimate = {
      canonical_name: '未知食物不在資料庫',
      estimated_weight_g: 100,
      calories: 150,
      protein_g: 10,
      carbs_g: 15,
      fat_g: 5,
      confidence: 0.6,
      reason: '測試用估算',
      source_type: 'ai_estimate',
    }
    const aiCandidate = aiEstimateToCandidate(estimate, false)
    const v2WithAiEstimate = {
      ...base,
      outcome: {
        level: 'C' as const,
        action: 'create_official' as const,
        query: '未知食物不在資料庫',
        explanation: aiCandidate.explanation,
        candidates: [aiCandidate],
        official_record: aiCandidate,
      },
    }
    const state = photoAccuracyStateFromV2(v2WithAiEstimate)
    assert.equal(state.is_ai_estimate, true)
    assert.equal(state.show_macros, true)
    assert.equal(state.show_candidate_picker, false)
    assert.equal(state.nutrition_status, 'estimated')
  })

  it('CASE 1/2/3 never simultaneously true: show_macros and show_candidate_picker are always mutually exclusive', () => {
    const cases = [
      createPhotoAccuracyState(PHOTO_LABEL, { photo_id: 'x1' }),
      createPhotoAccuracyState('三明治', { photo_id: 'x2' }),
      createPhotoAccuracyState('蛋', { photo_id: 'x3' }),
      createPhotoAccuracyState('茶葉蛋', { photo_id: 'x4' }),
    ]
    for (const state of cases) {
      assert.ok(
        !(state.show_macros && state.show_candidate_picker),
        `both show_macros and show_candidate_picker were true for query "${state.label}"`
      )
    }
  })
})
