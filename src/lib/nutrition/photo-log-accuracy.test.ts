import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isNutritionAccuracyV1 } from '../nutrition-accuracy-flag.ts'
import {
  buildPhotoLogCommitFromAccuracy,
  createPhotoAccuracyState,
  photoAccuracyDisplayMacros,
  photoAccuracyReadyForLog,
  updatePhotoAccuracyState,
} from './photo-log-accuracy.ts'

describe('Nutrition Accuracy UI integration', () => {
  it('feature flag defaults true unless explicitly false', () => {
    const prev = process.env.NEXT_PUBLIC_NUTRITION_ACCURACY_V1
    delete process.env.NEXT_PUBLIC_NUTRITION_ACCURACY_V1
    assert.equal(isNutritionAccuracyV1(), true)
    process.env.NEXT_PUBLIC_NUTRITION_ACCURACY_V1 = 'false'
    assert.equal(isNutritionAccuracyV1(), false)
    if (prev === undefined) delete process.env.NEXT_PUBLIC_NUTRITION_ACCURACY_V1
    else process.env.NEXT_PUBLIC_NUTRITION_ACCURACY_V1 = prev
  })

  it('AI photo only cannot write before user confirm for bento', () => {
    const state = createPhotoAccuracyState('雞腿便當')
    assert.equal(photoAccuracyReadyForLog(state), false)
    const commit = buildPhotoLogCommitFromAccuracy(state, { id: 't1' })
    assert.equal(commit.payload, null)
  })

  it('ambiguous soup requires clarification questions', () => {
    const state = createPhotoAccuracyState('竹筍湯')
    assert.ok(state.confirmation_questions.length >= 1)
    assert.equal(photoAccuracyReadyForLog(state), false)
  })

  it('official item can log at Level A without confirm', () => {
    const state = createPhotoAccuracyState('椰香綠咖哩嫩雞飯')
    if (state.v2.outcome.level === 'A') {
      assert.equal(photoAccuracyReadyForLog(state), true)
      const commit = buildPhotoLogCommitFromAccuracy(state, { id: 'official-1' })
      assert.ok(commit.payload)
      assert.notEqual(commit.payload!.calories, null)
    }
  })

  it('unknown photo can save photo-only with null macros', () => {
    const state = createPhotoAccuracyState('公司附近自製便當')
    assert.equal(photoAccuracyReadyForLog(state), true)
    const commit = buildPhotoLogCommitFromAccuracy(state, { id: 'unk-1' })
    assert.ok(commit.payload)
    assert.equal(commit.payload!.calories, null)
    assert.equal(commit.payload!.nutrition_status, 'unknown')
  })

  it('user confirm alone does not unlock bento without clarification', () => {
    const state = createPhotoAccuracyState('雞腿便當')
    const withAnswers = updatePhotoAccuracyState(state, { user_confirmed: true })
    assert.equal(photoAccuracyReadyForLog(withAnswers), false)
    assert.equal(buildPhotoLogCommitFromAccuracy(withAnswers, { id: 'bento-1' }).payload, null)
  })

  it('candidate switch resets confirm and blocks write', () => {
    const state = createPhotoAccuracyState('雞腿便當')
    const confirmed = updatePhotoAccuracyState(state, { user_confirmed: true })
    const switched = updatePhotoAccuracyState(confirmed, {
      selected_candidate_id: confirmed.candidates[1]?.id ?? confirmed.candidates[0]!.id,
      user_confirmed: false,
    })
    assert.equal(switched.answers.user_confirmed, false)
    assert.equal(photoAccuracyReadyForLog(switched), false)
  })

  it('clarify flow can show preview macros before user confirms', () => {
    const state = createPhotoAccuracyState('竹筍湯')
    assert.equal(state.show_macros, false)
    const display = photoAccuracyDisplayMacros(state)
    if (state.candidates.length > 0) {
      assert.ok(display.calories != null || display.protein_g != null)
    } else {
      assert.equal(display.calories, null)
      assert.equal(display.protein_g, null)
    }
  })
})
