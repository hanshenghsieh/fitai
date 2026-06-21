import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  computeTodayMealState,
  scoreMealCandidate,
  isWeeklyGoalProtectionActive,
} from './next-meal-engine.ts'

describe('Next Meal Engine v2', () => {
  it('over-target protection when already >= todayTarget', () => {
    const state = computeTodayMealState({
      todayFoodLogs: [
        { id: '1', name: 'a', calories: 1800, protein_g: 80, logged_at: '2026-06-21T12:00:00Z', user_declared: true, source: 'search' },
      ],
      normalTargetKcal: 1700,
      proteinTargetG: 120,
    })
    assert.equal(state.overTargetProtection, true)
    assert.equal(state.allowDiceAndSuggest, false)
  })

  it('uses internal target when recovery active', () => {
    const state = computeTodayMealState({
      todayFoodLogs: [],
      normalTargetKcal: 1700,
      internalTargetKcal: 1550,
      proteinTargetG: 120,
      calorieBank: {
        user_id: 'u',
        date: '2026-06-21',
        daily_target_kcal: 1700,
        internal_target_kcal: 1550,
        actual_kcal: 0,
        delta_kcal: 0,
        running_balance_kcal: 1550,
        recovery_balance_kcal: 500,
        spread_days_remaining: 3,
        daily_adjust_kcal: -150,
      },
    })
    assert.equal(state.todayTarget, 1550)
    assert.equal(state.recoveryActive, true)
  })

  it('high protein priority when gap > 40g', () => {
    const state = computeTodayMealState({
      todayFoodLogs: [{ id: '1', name: 'a', calories: 400, protein_g: 10, logged_at: '2026-06-21T12:00:00Z', user_declared: true, source: 'search' }],
      normalTargetKcal: 1700,
      proteinTargetG: 120,
    })
    assert.equal(state.proteinGap, 110)
    assert.equal(state.highProteinPriority, true)
  })

  it('scores chicken breast better when protein gap high', () => {
    const state = computeTodayMealState({
      todayFoodLogs: [],
      normalTargetKcal: 1700,
      proteinTargetG: 120,
    })
    state.highProteinPriority = true
    state.remainingCalories = 600
    state.effectiveMealCalTarget = 500
    state.effectiveMealProteinTarget = 40
    const chicken = scoreMealCandidate({
      itemNames: ['雞胸肉'],
      calories: 480,
      proteinG: 45,
      state,
    })
    const fried = scoreMealCandidate({
      itemNames: ['炸雞排'],
      calories: 480,
      proteinG: 20,
      state,
    })
    assert.ok(chicken < fried)
  })

  it('weekly protection when 7-day avg >= maintenance', () => {
    assert.equal(
      isWeeklyGoalProtectionActive({ avg7DayKcal: 2100, maintenanceKcal: 2000 }),
      true
    )
  })
})
