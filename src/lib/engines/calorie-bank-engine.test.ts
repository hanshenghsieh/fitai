import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  clampDailyAdjust,
  computeRecoveryWindow,
  recoveryTargetsForDayOffsets,
  syncCalorieBankRow,
  tickRecoveryFromPrevious,
  calorieFloorFromGender,
} from './calorie-bank-engine.ts'
import type { CalorieBankRow } from '../banks/calorie-bank-types.ts'

const USER = 'user-1'
const DATE = '2026-06-18'
const FLOOR = 1500
const TARGET = 1700

function baseRow(overrides: Partial<CalorieBankRow> = {}): CalorieBankRow {
  return {
    user_id: USER,
    date: DATE,
    daily_target_kcal: TARGET,
    internal_target_kcal: TARGET,
    actual_kcal: 0,
    delta_kcal: 0,
    running_balance_kcal: TARGET,
    recovery_balance_kcal: 0,
    spread_days_remaining: 0,
    daily_adjust_kcal: 0,
    ...overrides,
  }
}

describe('Calorie Bank Engine v1', () => {
  it('Case A: +1500 excess → 6-day window, adjust ≤ -150', () => {
    const window = computeRecoveryWindow(1500)
    assert.equal(window.spreadDays, 6)
    assert.equal(window.dailyAdjustKcal, -150)

    const row = syncCalorieBankRow({
      userId: USER,
      date: DATE,
      normalTargetKcal: TARGET,
      calorieFloor: FLOOR,
      actualKcal: 3200,
      previousRow: null,
      existingToday: null,
    })

    assert.equal(row.delta_kcal, 1500)
    assert.equal(row.recovery_balance_kcal, 1500)
    assert.equal(row.spread_days_remaining, 6)
    assert.equal(row.daily_adjust_kcal, -150)
  })

  it('Case B: next-day internal target respects floor', () => {
    const yesterday = baseRow({
      date: '2026-06-17',
      actual_kcal: 3200,
      delta_kcal: 1500,
      recovery_balance_kcal: 1500,
      spread_days_remaining: 6,
      daily_adjust_kcal: -150,
    })

    const tick = tickRecoveryFromPrevious(yesterday, TARGET, FLOOR)
    assert.equal(tick.internal_target_kcal, 1550)
    assert.ok(tick.internal_target_kcal >= FLOOR)
    assert.equal(tick.recovery_balance_kcal, 1350)
    assert.equal(tick.spread_days_remaining, 5)
  })

  it('Case C: consecutive overeat accumulates recovery balance', () => {
    const day1 = syncCalorieBankRow({
      userId: USER,
      date: '2026-06-17',
      normalTargetKcal: TARGET,
      calorieFloor: FLOOR,
      actualKcal: 3200,
      previousRow: null,
      existingToday: null,
    })

    const day2Start = tickRecoveryFromPrevious(day1, TARGET, FLOOR)
    const day2Partial = baseRow({
      date: '2026-06-18',
      ...day2Start,
      actual_kcal: 0,
    })

    const day2 = syncCalorieBankRow({
      userId: USER,
      date: '2026-06-18',
      normalTargetKcal: TARGET,
      calorieFloor: FLOOR,
      actualKcal: 3000,
      previousRow: day1,
      existingToday: day2Partial,
    })

    assert.ok(day2.recovery_balance_kcal > day1.recovery_balance_kcal - 150)
    assert.equal(day2.recovery_balance_kcal, 1350 + 1300)
  })

  it('Case D: after recovery completes, target returns to normal', () => {
    let row = baseRow({
      recovery_balance_kcal: 100,
      spread_days_remaining: 1,
      daily_adjust_kcal: -100,
    })

    const tick = tickRecoveryFromPrevious(row, TARGET, FLOOR)
    assert.equal(tick.internal_target_kcal, 1600)
    assert.equal(tick.recovery_balance_kcal, 0)
    assert.equal(tick.spread_days_remaining, 0)
  })

  it('Case D2: window ends with balance left rolls into a new recovery window', () => {
    const yesterday = baseRow({
      recovery_balance_kcal: 300,
      spread_days_remaining: 1,
      daily_adjust_kcal: -100,
    })

    const tick = tickRecoveryFromPrevious(yesterday, TARGET, FLOOR)
    assert.equal(tick.internal_target_kcal, 1600)
    assert.equal(tick.recovery_balance_kcal, 200)
    assert.equal(tick.spread_days_remaining, 2)
    assert.equal(tick.daily_adjust_kcal, -100)
  })

  it('Case E: weekly targets ramp gently during recovery', () => {
    const targets = recoveryTargetsForDayOffsets(TARGET, 5, -120, FLOOR, 5)
    assert.deepEqual(targets, [1580, 1580, 1580, 1640, 1700])
    targets.forEach(t => assert.ok(t >= FLOOR))
  })

  it('clampDailyAdjust never pushes below floor', () => {
    const adjust = clampDailyAdjust(-500, 1600, FLOOR)
    assert.equal(adjust, -100)
    assert.equal(1600 + adjust, FLOOR)
  })

  it('female floor default is 1200', () => {
    assert.equal(calorieFloorFromGender('female'), 1200)
    assert.equal(calorieFloorFromGender('male'), 1500)
  })
})
