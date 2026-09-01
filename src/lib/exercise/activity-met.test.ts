import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ACTIVITY_TYPES,
  EXERCISE_INTENSITIES,
  INTENSITY_MET,
  MET_VALUES,
  estimateCaloriesForMet,
  estimateExerciseCalories,
  isActivityType,
  isExerciseIntensity,
  isValidDurationMinutes,
} from './activity-met'

describe('estimateExerciseCalories', () => {
  it('computes calories as MET × weight(kg) × duration(hours)', () => {
    // walking MET 3.5, 70kg, 60 min → 3.5 * 70 * 1 = 245
    assert.equal(estimateExerciseCalories('walking', 60, 70), 245)
  })

  it('scales linearly with duration', () => {
    const thirty = estimateExerciseCalories('running', 30, 70)
    const sixty = estimateExerciseCalories('running', 60, 70)
    assert.equal(sixty, thirty * 2)
  })

  it('scales linearly with body weight', () => {
    const at70 = estimateExerciseCalories('cycling', 45, 70)
    const at140 = estimateExerciseCalories('cycling', 45, 140)
    assert.equal(at140, at70 * 2)
  })

  it('falls back to a 70kg reference weight when weight is missing', () => {
    assert.equal(estimateExerciseCalories('swimming', 40, null), estimateExerciseCalories('swimming', 40, 70))
    assert.equal(estimateExerciseCalories('swimming', 40, undefined), estimateExerciseCalories('swimming', 40, 70))
  })

  it('falls back to a 70kg reference weight for a non-positive weight', () => {
    assert.equal(estimateExerciseCalories('strength_training', 30, 0), estimateExerciseCalories('strength_training', 30, 70))
    assert.equal(estimateExerciseCalories('strength_training', 30, -5), estimateExerciseCalories('strength_training', 30, 70))
  })

  it('never returns a negative estimate for a negative/zero duration', () => {
    assert.equal(estimateExerciseCalories('other', 0, 70), 0)
    assert.equal(estimateExerciseCalories('other', -10, 70), 0)
  })

  it('every declared activity type has a MET value', () => {
    for (const activity of ACTIVITY_TYPES) {
      assert.equal(typeof MET_VALUES[activity], 'number')
      assert.ok(MET_VALUES[activity] > 0)
    }
  })
})

describe('isActivityType', () => {
  it('accepts every declared activity type', () => {
    for (const activity of ACTIVITY_TYPES) {
      assert.equal(isActivityType(activity), true)
    }
  })

  it('rejects unknown strings and non-strings', () => {
    assert.equal(isActivityType('basketball'), false)
    assert.equal(isActivityType(''), false)
    assert.equal(isActivityType(123), false)
    assert.equal(isActivityType(null), false)
    assert.equal(isActivityType(undefined), false)
  })
})

describe('estimateCaloriesForMet', () => {
  it('backs estimateExerciseCalories exactly — same formula, explicit MET', () => {
    assert.equal(estimateCaloriesForMet(MET_VALUES.running, 45, 70), estimateExerciseCalories('running', 45, 70))
  })

  it('produces different estimates for different MET values at the same duration/weight', () => {
    const a = estimateCaloriesForMet(3.0, 60, 70) // yoga
    const b = estimateCaloriesForMet(6.5, 60, 70) // basketball
    assert.notEqual(a, b)
  })
})

describe('exercise intensity fallback', () => {
  it('light < moderate < vigorous', () => {
    assert.ok(INTENSITY_MET.light < INTENSITY_MET.moderate)
    assert.ok(INTENSITY_MET.moderate < INTENSITY_MET.vigorous)
  })

  it('every declared intensity has a MET value', () => {
    for (const level of EXERCISE_INTENSITIES) {
      assert.equal(typeof INTENSITY_MET[level], 'number')
    }
  })

  it('isExerciseIntensity accepts only the three known tiers', () => {
    assert.equal(isExerciseIntensity('light'), true)
    assert.equal(isExerciseIntensity('moderate'), true)
    assert.equal(isExerciseIntensity('vigorous'), true)
    assert.equal(isExerciseIntensity('extreme'), false)
    assert.equal(isExerciseIntensity(null), false)
    assert.equal(isExerciseIntensity(undefined), false)
  })
})

describe('isValidDurationMinutes', () => {
  it('accepts durations within the 1-600 minute range', () => {
    assert.equal(isValidDurationMinutes(1), true)
    assert.equal(isValidDurationMinutes(40), true)
    assert.equal(isValidDurationMinutes(600), true)
  })

  it('rejects zero, negative, non-finite, and out-of-range durations', () => {
    assert.equal(isValidDurationMinutes(0), false)
    assert.equal(isValidDurationMinutes(-5), false)
    assert.equal(isValidDurationMinutes(601), false)
    assert.equal(isValidDurationMinutes(NaN), false)
    assert.equal(isValidDurationMinutes(Infinity), false)
  })

  it('rejects non-number input', () => {
    assert.equal(isValidDurationMinutes('40'), false)
    assert.equal(isValidDurationMinutes(null), false)
    assert.equal(isValidDurationMinutes(undefined), false)
  })
})
