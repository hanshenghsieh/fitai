/**
 * Build 38 BUG 7 — a confirmed AI-fallback (or compound-DB) estimate got
 * silently downgraded to an unknown/photo-only record at save time.
 * Root cause: finalizePhotoV2ToFoodLogPayload()'s
 * `if (resolved.action === 'create_unknown' || resolved.level === 'C')`
 * also caught a properly-resolved, user-confirmed Level C estimate
 * (action: 'create_official', level: 'C' — exactly what route.ts's AI
 * fallback and the compound guard both produce), discarding its real
 * macros into the unknown branch even though photoV2ReadyForLog already
 * required user_confirmed + a real official_record before this function
 * ever runs. Fixed by narrowing the condition to
 * `resolved.action === 'create_unknown'` only — the correct
 * isAiEstimate-aware branch immediately below was already written
 * correctly and is now reachable. CASE numbering matches the fix-phase
 * request (CASE 1/2/4-10 here; CASE 3 is in
 * photo-settings-runtime-reopen.test.ts).
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createPhotoV2State,
  photoV2ReadyForLog,
  updatePhotoV2State,
  finalizePhotoV2ToFoodLogPayload,
} from '@/lib/nutrition/search-v2/photo-pipeline'
import { aiEstimateToCandidate } from '@/lib/nutrition/ai-nutrition-fallback'
import { compoundMealCandidateFromLabel } from '@/lib/nutrition/search-v2/compound-meal-candidate'
import { logToDisplayItems } from '@/components/dashboard/TodayOS'
import { enrichFoodLog } from '@/lib/food-log-macros'
import type { AiNutritionEstimate } from '@/lib/claude/schemas'
import type { PhotoV2State } from '@/lib/nutrition/search-v2/photo-pipeline'
import type { FoodLogEntry } from '@/lib/banks/types'

function aiFallbackState(label: string, estimate: AiNutritionEstimate): PhotoV2State {
  const base = createPhotoV2State(label, { photo_id: 'photo-repro' })
  const aiCandidate = aiEstimateToCandidate(estimate, false)
  return {
    ...base,
    outcome: {
      level: 'C',
      action: 'create_official',
      query: label,
      explanation: aiCandidate.explanation,
      candidates: [aiCandidate],
      official_record: aiCandidate,
    },
  } satisfies PhotoV2State
}

const GENERIC_ESTIMATE: AiNutritionEstimate = {
  canonical_name: '不存在於資料庫的通用測試食物名稱',
  estimated_weight_g: 90,
  calories: 99,
  protein_g: 12,
  carbs_g: 2,
  fat_g: 4,
  confidence: 0.5,
  reason: '測試用估算',
  source_type: 'ai_estimate',
}

describe('Build 38 BUG 7 — CASE 1: AI fallback happy path readiness gate', () => {
  it('not ready before confirm, ready after confirm', () => {
    const state = aiFallbackState('不存在於資料庫的通用測試食物名稱', GENERIC_ESTIMATE)
    assert.equal(state.outcome.action, 'create_official')
    assert.equal(state.outcome.level, 'C')
    assert.equal(state.outcome.official_record?.nutrition_status, 'estimated')
    assert.equal(state.outcome.official_record?.estimate_provenance, 'ai_estimate')
    assert.equal(photoV2ReadyForLog(state), false)

    const confirmed = updatePhotoV2State(state, { user_confirmed: true })
    assert.equal(photoV2ReadyForLog(confirmed), true)
  })
})

describe('Build 38 BUG 7 — CASE 2: confirmed AI estimate finalize preserves real macros', () => {
  it('finalizePhotoV2ToFoodLogPayload returns the real AI estimate, never null/0/unknown', () => {
    const state = updatePhotoV2State(
      aiFallbackState('不存在於資料庫的通用測試食物名稱', GENERIC_ESTIMATE),
      { user_confirmed: true }
    )
    const payload = finalizePhotoV2ToFoodLogPayload(state, { id: 'case2' })
    assert.ok(payload)
    assert.equal(payload!.calories, 99)
    assert.equal(payload!.protein_g, 12)
    assert.equal(payload!.carbs_g, 2)
    assert.equal(payload!.fat_g, 4)
    assert.equal(payload!.nutrition_status, 'estimated')
    assert.equal(payload!.nutrition_confidence, 'C')
    assert.equal(payload!.capture_status, 'resolved')
    assert.equal(payload!.match_type, 'ai_nutrition_estimate')
    assert.notEqual(payload!.nutrition_status, 'unknown')
  })
})

describe('Build 38 BUG 7 — CASE 4: core invariant — confirmed AI estimate survives even with zero DB match', () => {
  it('a completely fabricated, DB-absent label still saves its confirmed AI estimate', () => {
    // Deliberately nonsense/synthetic — must never exist in any real DB —
    // this is the exact shape of the real incident (a descriptive
    // AI-generated dish name with no matching row), reproduced generically.
    const label = '完全不存在於任何資料庫的合成測試食物名稱ZZZ'
    const state = updatePhotoV2State(aiFallbackState(label, { ...GENERIC_ESTIMATE, canonical_name: label }), {
      user_confirmed: true,
    })
    assert.equal(photoV2ReadyForLog(state), true)
    const payload = finalizePhotoV2ToFoodLogPayload(state, { id: 'case4' })
    assert.ok(payload, 'a confirmed AI estimate must save even when the DB has no matching row')
    assert.equal(payload!.calories, 99)
    assert.equal(payload!.nutrition_status, 'estimated')
  })
})

describe('Build 38 BUG 7 — CASE 5: unconfirmed AI estimate cannot be saved (confirmation gate preserved)', () => {
  it('finalizePhotoV2ToFoodLogPayload returns null before user_confirmed', () => {
    const state = aiFallbackState('不存在於資料庫的通用測試食物名稱', GENERIC_ESTIMATE)
    assert.equal(photoV2ReadyForLog(state), false)
    assert.equal(finalizePhotoV2ToFoodLogPayload(state, { id: 'case5' }), null)
  })
})

describe('Build 38 BUG 7 — CASE 6: genuine unknown is unaffected by this fix', () => {
  it('create_unknown still finalizes to null macros / nutrition_status unknown / photo_only', () => {
    const state = createPhotoV2State('完全無法辨識的神秘食物')
    assert.equal(state.outcome.action, 'create_unknown')
    assert.equal(photoV2ReadyForLog(state), true)
    const payload = finalizePhotoV2ToFoodLogPayload(state, { id: 'case6' })
    assert.ok(payload)
    assert.equal(payload!.calories, null)
    assert.equal(payload!.protein_g, null)
    assert.equal(payload!.carbs_g, null)
    assert.equal(payload!.fat_g, null)
    assert.equal(payload!.nutrition_status, 'unknown')
    assert.equal(payload!.capture_status, 'photo_only')
  })
})

describe('Build 38 BUG 7 — CASE 7: Level A official match unaffected', () => {
  it('a trusted Level A match still finalizes as official, unconfirmed, no gate change', () => {
    const state = createPhotoV2State('711竹筍排骨湯')
    if (state.outcome.level === 'A') {
      assert.equal(photoV2ReadyForLog(state), true)
      const payload = finalizePhotoV2ToFoodLogPayload(state, { id: 'case7' })
      assert.ok(payload)
      assert.equal(payload!.nutrition_status, 'official')
      assert.ok(payload!.calories! > 0)
    }
  })
})

describe('Build 38 BUG 7 — CASE 8: Level B candidate-confirmation flow unaffected', () => {
  it('竹筍湯 still requires clarification, unrelated to the Level C fix', () => {
    const state = createPhotoV2State('竹筍湯')
    assert.equal(state.outcome.action, 'clarify')
    assert.ok(state.clarification)
    assert.equal(photoV2ReadyForLog(state), false)
  })
})

describe('Build 38 BUG 7 — CASE 9: compound_db_estimate also survives despite no exact DB name', () => {
  it('a confirmed compound-DB estimate finalizes with real macros, not unknown', () => {
    const compoundCandidate = compoundMealCandidateFromLabel('小黃瓜 + 火腿')
    assert.ok(compoundCandidate)
    assert.equal(compoundCandidate!.estimate_provenance, 'compound_db_estimate')

    const base = createPhotoV2State('小黃瓜 + 火腿')
    let state: PhotoV2State = {
      ...base,
      outcome: {
        level: 'C',
        action: 'create_official',
        query: '小黃瓜 + 火腿',
        explanation: compoundCandidate!.explanation,
        candidates: [compoundCandidate!],
        official_record: compoundCandidate!,
      },
    }
    state = updatePhotoV2State(state, { user_confirmed: true })
    assert.equal(photoV2ReadyForLog(state), true)
    const payload = finalizePhotoV2ToFoodLogPayload(state, { id: 'case9' })
    assert.ok(payload)
    assert.equal(payload!.nutrition_status, 'estimated')
    assert.ok((payload!.calories ?? 0) > 0)
    assert.notEqual(payload!.nutrition_status, 'unknown')
  })
})

describe('Build 38 BUG 7 — CASE 10: persistence round trip (finalize -> FoodLog -> enrich -> display)', () => {
  it('macros and status survive the full downstream chain a saved log goes through on Today', () => {
    const state = updatePhotoV2State(
      aiFallbackState('不存在於資料庫的通用測試食物名稱', GENERIC_ESTIMATE),
      { user_confirmed: true }
    )
    const payload = finalizePhotoV2ToFoodLogPayload(state, { id: 'case10' })
    assert.ok(payload)

    const log = {
      id: payload!.id,
      name: payload!.display_label ?? payload!.name,
      calories: payload!.calories,
      protein_g: payload!.protein_g,
      carbs_g: payload!.carbs_g,
      fat_g: payload!.fat_g,
      nutrition_status: payload!.nutrition_status,
      nutrition_confidence: payload!.nutrition_confidence,
      capture_status: payload!.capture_status,
      source: 'photo',
      slot: 'lunch',
      logged_at: payload!.logged_at,
      user_declared: true,
    } as unknown as FoodLogEntry

    // enrichFoodLog is run on every loaded/committed log (see food-log-macros.ts).
    const enriched = enrichFoodLog(log)
    assert.equal(enriched.calories, 99)
    assert.equal(enriched.nutrition_status, 'estimated')

    // logToDisplayItems is what the Today recommendation card actually renders.
    const items = logToDisplayItems(enriched)
    assert.equal(items.length, 1)
    assert.equal(items[0]!.calories, 99)
    assert.equal(items[0]!.protein_g, 12)
    assert.equal(items[0]!.carbs_g, 2)
    assert.equal(items[0]!.fat_g, 4)
  })
})
