/**
 * Calorie Bank self-audit — documents actual behavior vs product equal-split rules.
 * Product spec (equal amortization) may differ from Engine v1 tiered windows.
 */
import assert from 'node:assert/strict'
import { addDays, format, parseISO } from 'date-fns'
import { describe, it } from 'node:test'
import type { CalorieBankRow } from '@/lib/banks/calorie-bank-types'
import {
  clampDailyAdjust,
  computeRecoveryWindow,
  syncCalorieBankRow,
  tickRecoveryFromPrevious,
} from './calorie-bank-engine'

const USER = 'audit-user'
const TARGET = 1800
const FLOOR = 1200
const BASE = '2026-06-15'

function simulateDayChain(dailyActuals: number[], target = TARGET, floor = FLOOR): CalorieBankRow[] {
  const rows: CalorieBankRow[] = []
  let prev: CalorieBankRow | null = null
  const start = parseISO(BASE)

  for (let i = 0; i < dailyActuals.length; i++) {
    const date = format(addDays(start, i), 'yyyy-MM-dd')
    const row = syncCalorieBankRow({
      userId: USER,
      date,
      normalTargetKcal: target,
      calorieFloor: floor,
      actualKcal: dailyActuals[i]!,
      previousRow: prev,
      existingToday: null,
    })
    rows.push(row)
    prev = row
  }
  return rows
}

function internalAtDay(rows: CalorieBankRow[], dayIndex: number): number {
  return rows[dayIndex]!.internal_target_kcal
}

describe('Calorie Bank recovery audit', () => {
  it('documents computeRecoveryWindow tiers (not equal-split)', () => {
    assert.deepEqual(computeRecoveryWindow(400), { spreadDays: 2, dailyAdjustKcal: -100 })
    assert.deepEqual(computeRecoveryWindow(500), { spreadDays: 2, dailyAdjustKcal: -100 })
    assert.deepEqual(computeRecoveryWindow(600), { spreadDays: 4, dailyAdjustKcal: -120 })
    assert.deepEqual(computeRecoveryWindow(1500), { spreadDays: 6, dailyAdjustKcal: -150 })
    assert.deepEqual(computeRecoveryWindow(0), { spreadDays: 0, dailyAdjustKcal: 0 })
  })

  it('product spec example — Mon +400 kcal continues until balance cleared', () => {
    const rows = simulateDayChain([2200, 0, 0, 0, 0, 0])
    assert.equal(computeRecoveryWindow(400).spreadDays, 2)
    assert.equal(internalAtDay(rows, 1), 1700)
    assert.equal(internalAtDay(rows, 2), 1700)
    assert.equal(internalAtDay(rows, 3), 1700)
    assert.equal(internalAtDay(rows, 4), 1700)
    assert.equal(internalAtDay(rows, 5), TARGET)
    assert.equal(rows[4]!.recovery_balance_kcal, 0)
  })

  it('case 1 — Mon +300 kcal: recovery continues until balance cleared', () => {
    const rows = simulateDayChain([2100, 0, 0, 0, 0])
    assert.equal(rows[0]!.recovery_balance_kcal, 300)
    assert.equal(rows[0]!.spread_days_remaining, 2)
    assert.equal(internalAtDay(rows, 0), TARGET)
    assert.equal(internalAtDay(rows, 1), 1700)
    assert.equal(internalAtDay(rows, 2), 1700)
    assert.equal(internalAtDay(rows, 3), 1700)
    assert.equal(internalAtDay(rows, 4), TARGET)
    assert.equal(rows[3]!.recovery_balance_kcal, 0)
  })

  it('case 2 — Mon +600 kcal: recovery continues until balance cleared', () => {
    const rows = simulateDayChain([2400, 0, 0, 0, 0, 0, 0, 0])
    const window = computeRecoveryWindow(600)
    assert.equal(window.spreadDays, 4)
    assert.equal(window.dailyAdjustKcal, -120)
    assert.equal(internalAtDay(rows, 1), 1680)
    assert.equal(internalAtDay(rows, 2), 1680)
    assert.equal(internalAtDay(rows, 3), 1680)
    assert.equal(internalAtDay(rows, 4), 1680)
    assert.ok(internalAtDay(rows, 5) >= FLOOR)
    assert.equal(rows[rows.length - 1]!.recovery_balance_kcal, 0)
    assert.equal(rows[rows.length - 1]!.internal_target_kcal, TARGET)
  })

  it('case 3 — Mon +500 kcal: recovery continues until balance cleared', () => {
    const rows = simulateDayChain([2300, 0, 0, 0, 0, 0, 0])
    assert.equal(rows[0]!.spread_days_remaining, 2)
    assert.equal(rows[0]!.daily_adjust_kcal, -100)
    assert.equal(internalAtDay(rows, 1), 1700)
    assert.equal(internalAtDay(rows, 2), 1700)
    assert.ok(rows.slice(1, -1).every(r => r.internal_target_kcal === 1700 || r.recovery_balance_kcal === 0))
    assert.equal(rows[rows.length - 1]!.recovery_balance_kcal, 0)
    assert.equal(rows[rows.length - 1]!.internal_target_kcal, TARGET)
  })

  it('case 4 — Mon no overshoot: Tue–Thu targets stay at plan target', () => {
    const rows = simulateDayChain([1800, 0, 0, 0])
    for (let i = 0; i < 4; i++) {
      assert.equal(internalAtDay(rows, i), TARGET)
      assert.equal(rows[i]!.recovery_balance_kcal, 0)
    }
  })

  it('case 5 — Tue overshoot during recovery accumulates balance without negative targets', () => {
    const rows = simulateDayChain([2200, 2300, 0, 0])
    assert.ok(rows[1]!.internal_target_kcal >= FLOOR)
    assert.ok(rows[1]!.recovery_balance_kcal > rows[0]!.recovery_balance_kcal - 100)
    assert.ok(rows[2]!.internal_target_kcal >= FLOOR)
    assert.ok(rows[2]!.recovery_balance_kcal >= 0)
    assert.ok(Number.isFinite(rows[2]!.internal_target_kcal))
  })

  it('case 6 — daily floor protection: adjust clamped so target never below 1200', () => {
    const lowTarget = 1300
    const adjust = clampDailyAdjust(-500, lowTarget, FLOOR)
    assert.equal(adjust, -100)
    assert.equal(lowTarget + adjust, FLOOR)

    const rows = simulateDayChain([2800, 0, 0], lowTarget, FLOOR)
    assert.ok(rows[1]!.internal_target_kcal >= FLOOR)
    assert.ok(rows[2]!.internal_target_kcal >= FLOOR)
  })

  it('tickRecoveryFromPrevious applies at most daily_adjust_kcal per day', () => {
    const yesterday: CalorieBankRow = {
      user_id: USER,
      date: '2026-06-14',
      daily_target_kcal: TARGET,
      internal_target_kcal: TARGET,
      actual_kcal: 2200,
      delta_kcal: 400,
      running_balance_kcal: -400,
      recovery_balance_kcal: 400,
      spread_days_remaining: 3,
      daily_adjust_kcal: -133,
    }
    const tick = tickRecoveryFromPrevious(yesterday, TARGET, FLOOR)
    assert.equal(tick.internal_target_kcal, 1667)
    assert.equal(tick.recovery_balance_kcal, 267)
    assert.equal(tick.spread_days_remaining, 2)
  })
})
