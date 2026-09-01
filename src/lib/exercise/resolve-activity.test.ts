import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveExerciseLogActivity } from './resolve-activity'
import { MET_VALUES, ACTIVITY_LABEL_ZH, INTENSITY_MET } from './activity-met'

describe('resolveExerciseLogActivity — preset buckets', () => {
  it('resolves a preset activity type directly from MET_VALUES, ignoring any label/intensity', () => {
    const result = resolveExerciseLogActivity('walking', 'ignored label', 'vigorous')
    assert.ok(result.ok)
    assert.equal(result.value.met_value, MET_VALUES.walking)
    assert.equal(result.value.activity_name, ACTIVITY_LABEL_ZH.walking)
    assert.equal(result.value.intensity, null)
    assert.equal(result.value.activity_label, null)
  })

  it('every preset bucket resolves to its known MET (non-regression)', () => {
    for (const type of ['walking', 'running', 'cycling', 'swimming', 'strength_training'] as const) {
      const result = resolveExerciseLogActivity(type, null, null)
      assert.ok(result.ok)
      assert.equal(result.value.met_value, MET_VALUES[type])
    }
  })
})

describe('resolveExerciseLogActivity — custom "other" activities', () => {
  it('resolves a known custom activity to its catalog MET, not a generic fallback', () => {
    const result = resolveExerciseLogActivity('other', '羽球', null)
    assert.ok(result.ok)
    assert.equal(result.value.activity_name, '羽球')
    assert.equal(result.value.met_value, 5.5)
    assert.equal(result.value.intensity, null)
    assert.equal(result.value.matched_catalog_id, 'badminton')
  })

  it('requires a non-empty label for activity_type "other"', () => {
    const result = resolveExerciseLogActivity('other', '', null)
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.error, 'label_required')
  })

  it('requires intensity when the typed activity does not match the catalog', () => {
    const result = resolveExerciseLogActivity('other', '划SUP', null)
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.error, 'unmatched_activity_needs_intensity')
  })

  it('rejects an invalid intensity value', () => {
    const result = resolveExerciseLogActivity('other', '划SUP', 'extreme')
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.error, 'invalid_intensity')
  })

  it('falls back to the intensity MET for an unmatched activity, preserving the typed name', () => {
    const result = resolveExerciseLogActivity('other', '划SUP', 'moderate')
    assert.ok(result.ok)
    assert.equal(result.value.activity_name, '划SUP')
    assert.equal(result.value.met_value, INTENSITY_MET.moderate)
    assert.equal(result.value.intensity, 'moderate')
    assert.equal(result.value.matched_catalog_id, null)
  })

  it('light/moderate/vigorous fallback intensities produce distinct MET values', () => {
    const light = resolveExerciseLogActivity('other', '划SUP', 'light')
    const moderate = resolveExerciseLogActivity('other', '划SUP', 'moderate')
    const vigorous = resolveExerciseLogActivity('other', '划SUP', 'vigorous')
    assert.ok(light.ok && moderate.ok && vigorous.ok)
    if (light.ok && moderate.ok && vigorous.ok) {
      assert.ok(light.value.met_value < moderate.value.met_value)
      assert.ok(moderate.value.met_value < vigorous.value.met_value)
    }
  })

  it('different manually entered activities produce different resolved MET values', () => {
    const basketball = resolveExerciseLogActivity('other', '籃球', null)
    const yoga = resolveExerciseLogActivity('other', '瑜伽', null)
    const badminton = resolveExerciseLogActivity('other', '羽球', null)
    const hiking = resolveExerciseLogActivity('other', '爬山', null)
    assert.ok(basketball.ok && yoga.ok && badminton.ok && hiking.ok)
    if (basketball.ok && yoga.ok && badminton.ok && hiking.ok) {
      const mets = [basketball.value.met_value, yoga.value.met_value, badminton.value.met_value, hiking.value.met_value]
      assert.equal(new Set(mets).size, mets.length)
    }
  })
})
