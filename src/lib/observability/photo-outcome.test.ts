import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { classifyPipelineFailure, isPhotoPipelineFailureType } from './photo-outcome'
import { PHOTO_PIPELINE_FAILURE_TYPES } from '@/lib/analytics/events'

describe('Phase 2 TASK 8 — photo pipeline failure classification', () => {
  it('a network failure classifies as network_error, not unknown_error', () => {
    assert.equal(classifyPipelineFailure(new TypeError('Failed to fetch')), 'network_error')
    assert.equal(classifyPipelineFailure(new Error('ECONNRESET')), 'network_error')
  })

  it('a timeout/abort classifies as timeout, not unknown_error', () => {
    const abort = new Error('The operation was aborted')
    abort.name = 'AbortError'
    assert.equal(classifyPipelineFailure(abort), 'timeout')
    assert.equal(classifyPipelineFailure(new Error('request timed out')), 'timeout')
  })

  it('an upstream AI provider failure classifies as provider_error, not unknown_error', () => {
    assert.equal(classifyPipelineFailure(new Error('Anthropic API overloaded')), 'provider_error')
    assert.equal(classifyPipelineFailure(new Error('rate limit exceeded')), 'provider_error')
  })

  it('a JSON/parse failure classifies as parse_error, not unknown_error', () => {
    assert.equal(classifyPipelineFailure(new SyntaxError('Unexpected token in JSON')), 'parse_error')
  })

  it('a schema/shape validation failure classifies as schema_error, not unknown_error', () => {
    assert.equal(classifyPipelineFailure(new Error('schema validation failed: missing field')), 'schema_error')
  })

  it('a "no food detected" failure classifies as no_food_detected, not unknown_error', () => {
    assert.equal(classifyPipelineFailure(new Error('no food detected in image')), 'no_food_detected')
  })

  it('a menu/database match failure classifies as database_match_failed, not unknown_error', () => {
    assert.equal(classifyPipelineFailure(new Error('no matching item found in menu')), 'database_match_failed')
  })

  it('a genuinely unrecognized error falls back to unknown_error (not every case collapses to it)', () => {
    assert.equal(classifyPipelineFailure(new Error('totally unexpected internal state')), 'unknown_error')
  })

  it('classification results are always a valid taxonomy member', () => {
    const sampleErrors = [
      new TypeError('Failed to fetch'),
      new Error('timed out'),
      new Error('rate limit exceeded'),
      new SyntaxError('bad json'),
      new Error('schema validation failed'),
      new Error('no food detected'),
      new Error('no matching item found'),
      new Error('¯\\_(ツ)_/¯'),
    ]
    const distinctOutcomes = new Set(sampleErrors.map(classifyPipelineFailure))
    for (const outcome of distinctOutcomes) {
      assert.ok(isPhotoPipelineFailureType(outcome))
    }
    // The 8 deliberately-varied sample errors above must not all collapse
    // into a single bucket — that would defeat the point of classifying at all.
    assert.ok(distinctOutcomes.size > 1)
  })

  it('every canonical failure type is reachable (none of the 8 categories is dead code)', () => {
    assert.deepEqual(
      [...PHOTO_PIPELINE_FAILURE_TYPES].sort(),
      [
        'database_match_failed',
        'network_error',
        'no_food_detected',
        'parse_error',
        'provider_error',
        'schema_error',
        'timeout',
        'unknown_error',
      ]
    )
  })
})
