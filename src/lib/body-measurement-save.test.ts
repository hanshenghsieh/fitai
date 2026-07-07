import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { weightsMatch } from './body-measurement-save'

describe('body-measurement-save', () => {
  it('weightsMatch treats near-equal values as the same reading', () => {
    assert.equal(weightsMatch(68, 68.0), true)
    assert.equal(weightsMatch(70, 68), false)
    assert.equal(weightsMatch(68.04, 68), true)
  })
})
