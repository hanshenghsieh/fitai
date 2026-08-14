/**
 * Build 38 BUG 5 — clarify dead-end regression tests. Root cause: hasClarificationPattern()
 * and buildClarificationQuestions() each hardcoded their own copy of the
 * "high risk, generic clarify" keyword list and had drifted apart (bare
 * "鹽酥" accepted by one, "鹽酥雞" required by the other) — a query matching
 * only the looser list forced action:'clarify' but produced zero actual
 * questions (startClarificationSession returned null), an unrecoverable
 * state: photoV2ReadyForLog stays false forever, and the AI-fallback
 * trigger in /api/food-photo/match/route.ts (v2.outcome.action ===
 * 'create_unknown') is never reachable. Fixed by (1) a single shared
 * keyword constant (HIGH_RISK_CLARIFICATION_RE in query-patterns.ts) both
 * functions must import, and (2) a structural invariant at the one place a
 * clarify outcome gets built (buildClarifyOrUnknownOutcome in
 * search-client.ts) that falls back to create_unknown whenever a session
 * can't be built, regardless of why. CASE numbering matches the fix-phase
 * request (CASE 6/7/8 here; CASE 1/2/9/10 are in
 * today-log-unknown-nutrition.test.ts; CASE 3/4/5 are in
 * dice-meal-preview-unknown.test.tsx).
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { searchNutritionV2Client, buildClarifyOrUnknownOutcome } from '@/lib/nutrition/search-v2/search-client'
import { hasClarificationPattern } from '@/lib/nutrition/search-v2/query-patterns'
import {
  createPhotoV2State,
  updatePhotoV2State,
  resolvePhotoV2Outcome,
  photoV2ReadyForLog,
} from '@/lib/nutrition/search-v2/photo-pipeline'
import { compoundMealCandidateFromLabel } from '@/lib/nutrition/search-v2/compound-meal-candidate'

const CLARIFICATION_TRIGGER_QUERIES = [
  '竹筍湯',
  '雞湯',
  '牛肉麵',
  '便當',
  '滷味',
  '鹽酥雞',
  '鹹酥雞',
  '火鍋',
  '自助餐',
  '燒肉',
  '串串',
  // Deliberately NOT a real dish — same keyword family, no menu match, no
  // candidates. This is exactly the shape that used to dead-end.
  '未知風味鹽酥料理',
]

describe('Build 38 BUG 5 — CASE 6: clarify outcome must never carry a null clarification session (invariant)', () => {
  for (const q of CLARIFICATION_TRIGGER_QUERIES) {
    it(`"${q}" — if outcome.action is 'clarify', outcome.clarification must be set`, () => {
      const outcome = searchNutritionV2Client(q)
      assert.ok(hasClarificationPattern(q), `expected "${q}" to trigger hasClarificationPattern for this test to be meaningful`)
      if (outcome.action === 'clarify') {
        assert.ok(outcome.clarification, `"${q}" produced action:'clarify' with no clarification session — dead end`)
        assert.ok(outcome.clarification!.questions.length > 0)
      }
    })
  }
})

describe('Build 38 BUG 5 — CASE 7: orphan clarification (session cannot be built) falls back to create_unknown', () => {
  it('buildClarifyOrUnknownOutcome degrades to create_unknown when no session can be built', () => {
    // A generic query with zero candidates and no matching question-builder
    // branch — startClarificationSession returns null for this by
    // construction (buildClarificationQuestions has no fallback case left
    // when candidates.length < 2 and no keyword matches).
    const outcome = buildClarifyOrUnknownOutcome('完全通用不含任何特殊關鍵字的測試字串', [])
    assert.equal(outcome.action, 'create_unknown')
    assert.notEqual(outcome.action, 'clarify')
    assert.equal(outcome.level, 'C')
    assert.ok(outcome.unknown_record)
  })

  it('buildClarifyOrUnknownOutcome still builds a real clarify session when one is available', () => {
    const outcome = buildClarifyOrUnknownOutcome('竹筍湯', [])
    assert.equal(outcome.action, 'clarify')
    assert.ok(outcome.clarification)
  })
})

describe('Build 38 BUG 5 — CASE 8: incident-shape regression (fixture only, not hardcoded in production code)', () => {
  const INCIDENT_LABEL = '椒鹽蝦／鹽酥蝦（去殼調味炸蝦）'

  it('does not produce a clarify/null dead-end for the incident label', () => {
    const state = createPhotoV2State(INCIDENT_LABEL)
    if (state.outcome.action === 'clarify') {
      assert.ok(state.clarification, 'clarify outcome must carry a real session, not dead-end')
    }
  })

  it('with no reliable DB match, the flow is completable end-to-end and reaches a saveable create_unknown state', () => {
    // Confirms neither segment coincidentally hijacks the outcome via the
    // compound guard — this fixture has no ingredient-DB match, matching
    // the real incident.
    assert.equal(compoundMealCandidateFromLabel(INCIDENT_LABEL), null)

    let state = createPhotoV2State(INCIDENT_LABEL)
    // The keyword now correctly produces a real, answerable clarify session
    // (FIX 3A) instead of the old null-session dead-end — completing it,
    // exactly as a user tapping through the questions would, must resolve
    // to a savable state rather than staying stuck.
    assert.ok(state.clarification, 'expected a real (non-null) clarification session')
    for (const q of state.clarification!.questions) {
      state = updatePhotoV2State(state, {
        clarification_answer: { questionId: q.id, optionId: q.options[0]!.id },
      })
    }
    const resolved = resolvePhotoV2Outcome(state)
    assert.equal(
      resolved.action,
      'create_unknown',
      'expected the completed clarify flow to resolve to create_unknown for this no-match incident shape'
    )
    assert.equal(photoV2ReadyForLog(state), true, 'must have a real save path once the clarify flow is completed')
  })
})
