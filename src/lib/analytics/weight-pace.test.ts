import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isRapidWeightLoss, RAPID_WEEKLY_WEIGHT_LOSS_KG } from './weight-pace'

describe('weight-pace', () => {
  it('flags rapid weekly loss at threshold', () => {
    assert.equal(RAPID_WEEKLY_WEIGHT_LOSS_KG, 1.0)
    assert.equal(isRapidWeightLoss(-1.0), true)
    assert.equal(isRapidWeightLoss(-1.2), true)
    assert.equal(isRapidWeightLoss(-0.6), false)
    assert.equal(isRapidWeightLoss(null), false)
  })
})
