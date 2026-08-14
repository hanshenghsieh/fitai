/**
 * Build 38 BUG 6 — estimate_provenance was silently dropped by
 * buildPhotoMatchSnapshot()'s slimCandidate() manual field whitelist (added
 * before estimate_provenance existed, never updated). Fixed by adding the
 * field to the whitelist. CASE numbering matches the fix-phase request.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  createPhotoV2State,
  photoV2ReadyForLog,
  updatePhotoV2State,
} from '@/lib/nutrition/search-v2/photo-pipeline'
import { buildPhotoMatchSnapshot, slimCandidate } from '@/lib/nutrition/photo-match-snapshot'
import { aiEstimateToCandidate } from '@/lib/nutrition/ai-nutrition-fallback'
import { compoundMealCandidateFromLabel } from '@/lib/nutrition/search-v2/compound-meal-candidate'
import { photoAccuracyStateFromV2, updatePhotoAccuracyState } from '@/lib/nutrition/photo-log-accuracy'
import { AccuracyConfirmSection } from '@/components/dashboard/today/PhotoLogSheet'
import type { AiNutritionEstimate } from '@/lib/claude/schemas'
import type { PhotoV2State } from '@/lib/nutrition/search-v2/photo-pipeline'
import type { SearchV2Candidate } from '@/lib/nutrition/search-v2/types'

function realWorldAiFallbackSnapshot(label: string, estimate: AiNutritionEstimate) {
  // STEP 1 — server, LEVEL 1 (matches createPhotoV2State in /api/food-photo/match).
  let v2 = createPhotoV2State(label, { photo_id: 'photo-repro' })
  // STEP 2 — route.ts's exact AI-fallback merge shape.
  const aiCandidate = aiEstimateToCandidate(estimate, false)
  v2 = {
    ...v2,
    outcome: {
      level: 'C',
      action: 'create_official',
      query: label,
      explanation: aiCandidate.explanation,
      candidates: [aiCandidate],
      official_record: aiCandidate,
    },
  } satisfies PhotoV2State
  // STEP 3 — the exact function route.ts calls before jsonWithCors(...).
  const snapshot = buildPhotoMatchSnapshot(v2)
  // STEP 4 — real HTTP JSON body round-trip.
  const wire = JSON.parse(JSON.stringify({ success: true, photo_v2: snapshot }))
  return wire.photo_v2 as PhotoV2State
}

describe('Build 38 BUG 6 — CASE 1: ai_estimate provenance survives the real round-trip', () => {
  it('estimate_provenance stays "ai_estimate" through buildPhotoMatchSnapshot + JSON round-trip', () => {
    const photo_v2 = realWorldAiFallbackSnapshot('炸蝦', {
      canonical_name: '炸蝦',
      estimated_weight_g: 120,
      calories: 280,
      protein_g: 18,
      carbs_g: 18,
      fat_g: 14,
      confidence: 0.55,
      reason: '依常見炸蝦份量估算',
      source_type: 'ai_estimate',
    })
    const accuracy = photoAccuracyStateFromV2(photo_v2)
    assert.equal(accuracy.estimate_provenance, 'ai_estimate')
  })
})

describe('Build 38 BUG 6 — CASE 2: compound_db_estimate provenance survives the real round-trip', () => {
  it('a compound-DB candidate keeps estimate_provenance through the same snapshot path', () => {
    // 小黃瓜 + 火腿 both resolve via the whole-food DB (2 of 2 — clears the
    // compound coverage gate from the previous fix round).
    const compoundCandidate = compoundMealCandidateFromLabel('小黃瓜 + 火腿')
    assert.ok(compoundCandidate)
    assert.equal(compoundCandidate!.estimate_provenance, 'compound_db_estimate')

    const slimmed = slimCandidate(compoundCandidate!)
    const wireRoundTripped = JSON.parse(JSON.stringify(slimmed)) as SearchV2Candidate
    assert.equal(wireRoundTripped.estimate_provenance, 'compound_db_estimate')
  })
})

describe('Build 38 BUG 6 — CASE 3: a candidate with no estimate_provenance is unaffected', () => {
  it('a normal official/onr candidate stays undefined, never fabricated', () => {
    const candidate: SearchV2Candidate = {
      id: 'menu-1',
      name: '雞腿便當',
      store: '7-11',
      macros: { calories: 500, protein: 25, fat: 15, carbs: 60, fiber: null, sugar: null, sodium: null },
      nutrition_status: 'official',
      nutrition_confidence: 'A',
      nutrition_source: 'Runtime Menu',
      source_tier: 'onr',
      match_score: 95,
      explanation: 'test',
    }
    const slimmed = slimCandidate(candidate)
    assert.equal(slimmed.estimate_provenance, undefined)
    const wireRoundTripped = JSON.parse(JSON.stringify(slimmed)) as SearchV2Candidate
    assert.equal(wireRoundTripped.estimate_provenance, undefined)
  })
})

function levelCAiFallbackAccuracy() {
  const photo_v2 = realWorldAiFallbackSnapshot('炸蝦', {
    canonical_name: '炸蝦',
    estimated_weight_g: 120,
    calories: 280,
    protein_g: 18,
    carbs_g: 18,
    fat_g: 14,
    confidence: 0.55,
    reason: '依常見炸蝦份量估算',
    source_type: 'ai_estimate',
  })
  return photoAccuracyStateFromV2(photo_v2)
}

describe('Build 38 BUG 6 — CASE 4: real AI fallback renders the confirm button after the fix', () => {
  it('is_ai_estimate/estimate_provenance/show_candidate_picker are all correct and the button renders', () => {
    const accuracy = levelCAiFallbackAccuracy()
    assert.equal(accuracy.is_ai_estimate, true)
    assert.equal(accuracy.estimate_provenance, 'ai_estimate')
    assert.equal(accuracy.show_candidate_picker, false)
    assert.equal(accuracy.answers.user_confirmed, false)

    const html = renderToStaticMarkup(
      React.createElement(AccuracyConfirmSection, { accuracy, onAccuracyChange: () => {} })
    )
    assert.match(html, /<button[^>]*>這樣記錄可以<\/button>/)
    // Now that estimate_provenance survives, the label must say "AI".
    assert.match(html, /🟡 AI 營養估算/)
  })
})

describe('Build 38 BUG 6 — CASE 5: confirming updates the real PhotoV2State and unlocks save', () => {
  it('clicking confirm sets user_confirmed=true on the underlying state and readyForLog becomes true', () => {
    const accuracy = levelCAiFallbackAccuracy()
    assert.equal(photoV2ReadyForLog(accuracy.v2), false)

    const confirmed = updatePhotoAccuracyState(accuracy, { user_confirmed: true })
    assert.equal(confirmed.v2.user_confirmed, true)
    assert.equal(confirmed.ready_for_food_log, true)
    assert.equal(photoV2ReadyForLog(confirmed.v2), true)
  })
})

describe('Build 38 BUG 6 — CASE 6: this fix does not auto-confirm an AI estimate', () => {
  it('user_confirmed is still false immediately after the fix (never bypassed)', () => {
    const accuracy = levelCAiFallbackAccuracy()
    assert.equal(accuracy.answers.user_confirmed, false)
    assert.equal(accuracy.ready_for_food_log, false)
  })
})

describe('Build 38 BUG 6 — CASE 7: Level A / Level B / create_unknown golden behavior unchanged', () => {
  it('Level A official match is unaffected by the whitelist addition', () => {
    const state = createPhotoV2State('711竹筍排骨湯')
    if (state.outcome.level === 'A') {
      assert.equal(state.outcome.official_record?.estimate_provenance, undefined)
      assert.equal(photoV2ReadyForLog(state), true)
    }
  })

  it('create_unknown outcome is unaffected — still saveable, still no estimate_provenance', () => {
    const state = createPhotoV2State('完全無法辨識的神秘食物')
    assert.equal(state.outcome.action, 'create_unknown')
    assert.equal(photoV2ReadyForLog(state), true)
  })

  it('Level B clarify is unaffected — still requires clarification, unrelated to estimate_provenance', () => {
    const state = createPhotoV2State('竹筍湯')
    assert.equal(state.outcome.action, 'clarify')
    assert.ok(state.clarification)
    assert.equal(photoV2ReadyForLog(state), false)
  })
})

describe('Build 38 BUG 6 — whitelist drift invariant', () => {
  it('slimCandidate must not silently drop any key present on a fully-populated candidate', () => {
    const fullCandidate: SearchV2Candidate = {
      id: 'x',
      name: 'y',
      store: 'z',
      macros: { calories: 1, protein: 1, fat: 1, carbs: 1, fiber: 1, sugar: 1, sodium: 1 },
      nutrition_status: 'estimated',
      nutrition_confidence: 'C',
      nutrition_source: 's',
      source_tier: 'official',
      match_score: 1,
      explanation: 'e',
      estimate_provenance: 'ai_estimate',
    }
    const slimmed = slimCandidate(fullCandidate)
    for (const key of Object.keys(fullCandidate)) {
      assert.ok(
        key in slimmed,
        `slimCandidate silently dropped "${key}" — a future SearchV2Candidate field was added without updating this whitelist`
      )
    }
  })
})
