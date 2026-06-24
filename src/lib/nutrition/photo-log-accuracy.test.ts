import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isNutritionAccuracyV1 } from '../nutrition-accuracy-flag.ts'
import {
  buildPhotoLogCommitFromAccuracy,
  createPhotoAccuracyState,
  photoAccuracyReadyForLog,
  updatePhotoAccuracyState,
} from './photo-log-accuracy.ts'

describe('Nutrition Accuracy UI integration', () => {
  it('feature flag defaults false', () => {
    const prev = process.env.NEXT_PUBLIC_NUTRITION_ACCURACY_V1
    delete process.env.NEXT_PUBLIC_NUTRITION_ACCURACY_V1
    assert.equal(isNutritionAccuracyV1(), false)
    process.env.NEXT_PUBLIC_NUTRITION_ACCURACY_V1 = 'true'
    assert.equal(isNutritionAccuracyV1(), true)
    if (prev === undefined) delete process.env.NEXT_PUBLIC_NUTRITION_ACCURACY_V1
    else process.env.NEXT_PUBLIC_NUTRITION_ACCURACY_V1 = prev
  })

  it('AI photo only cannot write before user confirm', () => {
    const state = createPhotoAccuracyState('雞腿便當')
    assert.equal(state.final.ready_for_food_log, false)
    assert.equal(state.final.calories, 0)
    assert.equal(photoAccuracyReadyForLog(state), false)
    const commit = buildPhotoLogCommitFromAccuracy(state, { id: 't1' })
    assert.equal(commit.payload, null)
  })

  it('high-risk bento requires confirmation questions', () => {
    const state = createPhotoAccuracyState('雞腿便當')
    assert.ok(state.draft.requires_confirmation)
    assert.ok(state.draft.confirmation_questions.length >= 1)
    assert.equal(photoAccuracyReadyForLog(state), false)
  })

  it('tea egg can log after user confirms', () => {
    const state = createPhotoAccuracyState('茶葉蛋')
    assert.equal(photoAccuracyReadyForLog(state), false)
    const confirmed = updatePhotoAccuracyState(state, { user_confirmed: true })
    assert.equal(confirmed.final.ready_for_food_log, true)
    assert.ok(confirmed.final.calories > 0)
    const commit = buildPhotoLogCommitFromAccuracy(confirmed, { id: 'tea-1' })
    assert.ok(commit.payload)
    assert.equal(commit.meta?.user_confirmed, true)
    assert.equal(commit.meta?.candidate_label, confirmed.draft.candidate.display_name)
  })

  it('user confirm unlocks finalizeToFoodLogPayload with metadata', () => {
    const state = createPhotoAccuracyState('炸雞腿便當')
    const withAnswers = updatePhotoAccuracyState(state, {
      user_confirmed: true,
      rice_portion: 'half',
      cooking_method: 'fried',
    })
    assert.equal(withAnswers.final.ready_for_food_log, true)
    const commit = buildPhotoLogCommitFromAccuracy(withAnswers, { id: 'bento-1' })
    assert.ok(commit.payload)
    assert.ok(commit.payload!.calories > 0)
    assert.equal(commit.meta?.accuracy_level, withAnswers.final.accuracy_level)
    assert.equal(commit.meta?.source_type, 'user_confirmed_estimate')
    assert.equal(commit.meta?.portion_adjustments.rice_portion, 'half')
  })

  it('candidate switch resets confirm and blocks write', () => {
    const state = createPhotoAccuracyState('雞腿便當')
    const confirmed = updatePhotoAccuracyState(state, { user_confirmed: true })
    assert.equal(confirmed.final.ready_for_food_log, true)
    const switched = updatePhotoAccuracyState(confirmed, {
      selected_candidate_id: confirmed.candidates[1]?.id ?? confirmed.candidates[0]!.id,
      user_confirmed: false,
    })
    assert.equal(switched.answers.user_confirmed, false)
    assert.equal(photoAccuracyReadyForLog(switched), false)
  })

  it('legacy path unaffected when flag helper is false', () => {
    const prev = process.env.NEXT_PUBLIC_NUTRITION_ACCURACY_V1
    process.env.NEXT_PUBLIC_NUTRITION_ACCURACY_V1 = 'false'
    assert.equal(isNutritionAccuracyV1(), false)
    if (prev === undefined) delete process.env.NEXT_PUBLIC_NUTRITION_ACCURACY_V1
    else process.env.NEXT_PUBLIC_NUTRITION_ACCURACY_V1 = prev
  })
})
