import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calculateFunnel } from './funnel'

describe('Phase 2 TASK 8 — funnel calculation', () => {
  it('matches the worked example from the task spec: 100 -> 72 (72%) -> 55 (76.4%) -> 22 (40%) -> 8 (14.5%)', () => {
    const results = calculateFunnel({
      accountCreated: 100,
      onboardingCompleted: 72,
      firstMealLogged: 55,
      d1Active: 22,
      d7Active: 8,
      trialStarted: 3,
      subscriptionStarted: 1,
    })

    assert.equal(results[0]!.stage, 'accountCreated')
    assert.equal(results[0]!.count, 100)
    assert.equal(results[0]!.conversionPct, null)

    assert.equal(results[1]!.count, 72)
    assert.equal(results[1]!.conversionPct, 72)

    assert.equal(results[2]!.count, 55)
    assert.equal(results[2]!.conversionPct, 76.4)

    assert.equal(results[3]!.count, 22)
    assert.equal(results[3]!.conversionPct, 40)

    assert.equal(results[4]!.count, 8)
    assert.equal(results[4]!.conversionPct, 14.5)
  })

  it('never hardcodes fake data — a fresh product with zero users produces all-zero stages, not sample numbers', () => {
    const results = calculateFunnel({
      accountCreated: 0,
      onboardingCompleted: 0,
      firstMealLogged: 0,
      d1Active: 0,
      d7Active: 0,
      trialStarted: 0,
      subscriptionStarted: 0,
    })
    for (const stage of results) {
      assert.equal(stage.count, 0)
    }
    // Division by zero must not produce NaN/Infinity conversion percentages.
    assert.equal(results[1]!.conversionPct, null)
  })

  it('a stage with zero count does not crash the next stage\'s conversion calc', () => {
    const results = calculateFunnel({
      accountCreated: 10,
      onboardingCompleted: 0,
      firstMealLogged: 0,
      d1Active: 0,
      d7Active: 0,
      trialStarted: 0,
      subscriptionStarted: 0,
    })
    assert.equal(results[1]!.conversionPct, 0)
    assert.equal(results[2]!.conversionPct, null)
  })
})
