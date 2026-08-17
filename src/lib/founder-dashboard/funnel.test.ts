import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calculateFunnel } from './funnel'

describe('Phase 3 — funnel calculation (cohort-relative-to-accountCreated)', () => {
  it('CASE1: 5 registrations, 1 onboarding completed in-cohort -> 20%, not chained against a smaller prior stage', () => {
    const results = calculateFunnel({
      accountCreated: 5,
      onboardingCompleted: 1,
      firstMealLogged: 0,
      trialStarted: 0,
      subscriptionStarted: 0,
    })
    const onboarding = results.find(r => r.stage === 'onboardingCompleted')!
    assert.equal(onboarding.count, 1)
    assert.equal(onboarding.conversionPct, 20)
  })

  it('CASE2: 5 registrations, 2 first-meal-logged in-cohort -> 40%, must not be 200% (the reported production bug)', () => {
    const results = calculateFunnel({
      accountCreated: 5,
      onboardingCompleted: 1,
      firstMealLogged: 2,
      trialStarted: 0,
      subscriptionStarted: 0,
    })
    const firstMeal = results.find(r => r.stage === 'firstMealLogged')!
    assert.equal(firstMeal.count, 2)
    assert.equal(firstMeal.conversionPct, 40)
    assert.notEqual(firstMeal.conversionPct, 200)
  })

  it('CASE3: 5 registrations, 5 trial starts, same cohort -> 100%, must not be 250% (the reported production bug)', () => {
    const results = calculateFunnel({
      accountCreated: 5,
      onboardingCompleted: 1,
      firstMealLogged: 2,
      trialStarted: 5,
      subscriptionStarted: 0,
    })
    const trial = results.find(r => r.stage === 'trialStarted')!
    assert.equal(trial.count, 5)
    assert.equal(trial.conversionPct, 100)
    assert.notEqual(trial.conversionPct, 250)
  })

  it('reproduces the exact reported production numbers end-to-end once counts are correctly cohort-intersected', () => {
    // Production report: 建立帳號5, 完成引導1(20%), 首次記錄餐點2(200% BUG),
    // 開始試用5(250% BUG), 開始訂閱0. With cohort-intersected counts (the
    // fix), every stage is a subset of accountCreated, so every pct <= 100.
    const results = calculateFunnel({
      accountCreated: 5,
      onboardingCompleted: 1,
      firstMealLogged: 2,
      trialStarted: 5,
      subscriptionStarted: 0,
    })
    for (const stage of results) {
      if (stage.conversionPct != null) {
        assert.ok(stage.conversionPct <= 100, `${stage.stage} conversionPct ${stage.conversionPct} exceeds 100%`)
      }
    }
  })

  it('never hardcodes fake data — a fresh product with zero users produces all-zero stages, not sample numbers', () => {
    const results = calculateFunnel({
      accountCreated: 0,
      onboardingCompleted: 0,
      firstMealLogged: 0,
      trialStarted: 0,
      subscriptionStarted: 0,
    })
    for (const stage of results) {
      assert.equal(stage.count, 0)
    }
    // Division by zero must not produce NaN/Infinity conversion percentages.
    assert.equal(results[1]!.conversionPct, null)
  })

  it('a fully-populated cohort funnel matches straightforward arithmetic against a single accountCreated denominator', () => {
    const results = calculateFunnel({
      accountCreated: 100,
      onboardingCompleted: 72,
      firstMealLogged: 55,
      trialStarted: 20,
      subscriptionStarted: 6,
    })
    assert.equal(results[0]!.stage, 'accountCreated')
    assert.equal(results[0]!.count, 100)
    assert.equal(results[0]!.conversionPct, null)

    assert.equal(results[1]!.count, 72)
    assert.equal(results[1]!.conversionPct, 72)

    assert.equal(results[2]!.count, 55)
    assert.equal(results[2]!.conversionPct, 55)

    assert.equal(results[3]!.count, 20)
    assert.equal(results[3]!.conversionPct, 20)

    assert.equal(results[4]!.count, 6)
    assert.equal(results[4]!.conversionPct, 6)
  })
})
