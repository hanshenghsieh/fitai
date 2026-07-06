import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  clampDailyAdjust,
  computeEffectiveDailyExcess,
  computeRecoveryWindow,
  recoveryTargetsForDayOffsets,
  resolveDailyExcessDriver,
  syncCalorieBankRow,
  tickRecoveryFromPrevious,
  calorieFloorFromGender,
} from './calorie-bank-engine.ts'
import type { CalorieBankRow } from '../banks/calorie-bank-types.ts'

const USER = 'user-1'
const DATE = '2026-06-18'
const FLOOR = 1500
const TARGET = 1700
const MACROS = { targetProteinG: 88, targetFatG: 67, targetCarbsG: 258 }

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
      ...MACROS,
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
      ...MACROS,
    })

    const day2 = syncCalorieBankRow({
      userId: USER,
      date: '2026-06-18',
      normalTargetKcal: TARGET,
      calorieFloor: FLOOR,
      actualKcal: 3000,
      previousRow: day1,
      existingToday: null,
      ...MACROS,
    })

    assert.equal(day2.recovery_balance_kcal, 1350 + 1300)
  })

  it('Case D: after recovery completes, target returns to normal', () => {
    const row = baseRow({
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

  it('fat over target triggers bank even when kcal is under', () => {
    const excess = computeEffectiveDailyExcess(
      { kcal: 1845, protein_g: 106, fat_g: 106, carbs_g: 126 },
      { kcal: 1897, protein_g: 88, fat_g: 67, carbs_g: 258 }
    )
    assert.equal(excess, 351)
    assert.equal(resolveDailyExcessDriver(
      { kcal: 1845, protein_g: 106, fat_g: 106, carbs_g: 126 },
      { kcal: 1897, protein_g: 88, fat_g: 67, carbs_g: 258 }
    ), 'fat')

    const row = syncCalorieBankRow({
      userId: USER,
      date: DATE,
      normalTargetKcal: 1897,
      calorieFloor: FLOOR,
      actualKcal: 1845,
      actualProteinG: 106,
      actualFatG: 106,
      actualCarbsG: 126,
      targetProteinG: 88,
      targetFatG: 67,
      targetCarbsG: 258,
      previousRow: null,
      existingToday: null,
    })

    assert.ok(row.recovery_balance_kcal > 0)
    assert.ok(row.spread_days_remaining > 0)
  })

  it('deleting meals revokes same-day bank when back under all targets', () => {
    const over = syncCalorieBankRow({
      userId: USER,
      date: DATE,
      normalTargetKcal: TARGET,
      calorieFloor: FLOOR,
      actualKcal: 2200,
      previousRow: null,
      existingToday: null,
      ...MACROS,
    })
    assert.ok(over.recovery_balance_kcal > 0)

    const afterDelete = syncCalorieBankRow({
      userId: USER,
      date: DATE,
      normalTargetKcal: TARGET,
      calorieFloor: FLOOR,
      actualKcal: 1600,
      previousRow: null,
      existingToday: over,
      ...MACROS,
    })

    assert.equal(afterDelete.recovery_balance_kcal, 0)
    assert.equal(afterDelete.spread_days_remaining, 0)
    assert.equal(afterDelete.internal_target_kcal, TARGET)
  })

  it('deleting meals keeps yesterday carryover when still under today', () => {
    const yesterday = syncCalorieBankRow({
      userId: USER,
      date: '2026-06-17',
      normalTargetKcal: TARGET,
      calorieFloor: FLOOR,
      actualKcal: 3200,
      previousRow: null,
      existingToday: null,
      ...MACROS,
    })

    const todayOver = syncCalorieBankRow({
      userId: USER,
      date: DATE,
      normalTargetKcal: TARGET,
      calorieFloor: FLOOR,
      actualKcal: 2200,
      previousRow: yesterday,
      existingToday: null,
      ...MACROS,
    })
    assert.ok(todayOver.recovery_balance_kcal > yesterday.recovery_balance_kcal)

    const todayFixed = syncCalorieBankRow({
      userId: USER,
      date: DATE,
      normalTargetKcal: TARGET,
      calorieFloor: FLOOR,
      actualKcal: 1600,
      actualProteinG: 80,
      actualFatG: 60,
      actualCarbsG: 200,
      previousRow: yesterday,
      existingToday: todayOver,
      ...MACROS,
    })

    assert.ok(todayFixed.recovery_balance_kcal > 0)
    assert.ok(todayFixed.recovery_balance_kcal < todayOver.recovery_balance_kcal)
    assert.equal(todayFixed.recovery_balance_kcal, tickRecoveryFromPrevious(yesterday, TARGET, FLOOR).recovery_balance_kcal)
  })
})
