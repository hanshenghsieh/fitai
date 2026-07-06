import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { previewCalorieBankFromLogs } from './preview-calorie-bank.ts'
import { syncCalorieBankRow } from '@/lib/engines/calorie-bank-engine.ts'
import type { CalorieBankRow } from '@/lib/banks/calorie-bank-types.ts'
import type { FoodLogEntry } from '@/lib/banks/types.ts'

const TARGET = 1897
const INTERNAL = 1797

function bankRow(overrides: Partial<CalorieBankRow> = {}): CalorieBankRow {
  return {
    user_id: 'u1',
    date: '2026-07-06',
    daily_target_kcal: TARGET,
    internal_target_kcal: INTERNAL,
    actual_kcal: 1862,
    delta_kcal: -35,
    running_balance_kcal: -65,
    recovery_balance_kcal: 300,
    spread_days_remaining: 2,
    daily_adjust_kcal: -100,
    ...overrides,
  }
}

function log(calories: number, protein = 30, fat = 20, carbs = 40): FoodLogEntry {
  return {
    id: 'l1',
    name: '金胸沙拉',
    logged_at: '2026-07-06T12:00:00+08:00',
    calories,
    protein_g: protein,
    fat_g: fat,
    carbs_g: carbs,
    nutrition_status: 'user_entered',
    capture_status: 'resolved',
  }
}

describe('previewCalorieBankFromLogs', () => {
  it('matches server sync when recovery already active and user adds food', () => {
    const yesterday = bankRow({
      date: '2026-07-05',
      actual_kcal: 2200,
      recovery_balance_kcal: 300,
      spread_days_remaining: 2,
      daily_adjust_kcal: -100,
      internal_target_kcal: TARGET,
    })
    const persisted = bankRow({ actual_kcal: 1862 })
    const logs = [log(1932, 35, 24, 45)]

    const preview = previewCalorieBankFromLogs({
      userId: 'u1',
      logs,
      dailyTargets: { calories: TARGET, protein_g: 88, fat_g: 67, carbs_g: 258 },
      profile: { id: 'u1', gender: 'male' } as never,
      previousDayBank: yesterday,
      persistedTodayBank: persisted,
    })

    const server = syncCalorieBankRow({
      userId: 'u1',
      date: '2026-07-06',
      normalTargetKcal: TARGET,
      calorieFloor: 1500,
      actualKcal: 1932,
      actualProteinG: 35,
      actualFatG: 24,
      actualCarbsG: 45,
      targetProteinG: 88,
      targetFatG: 67,
      targetCarbsG: 258,
      previousRow: yesterday,
      existingToday: persisted,
    })

    assert.equal(preview.internal_target_kcal, server.internal_target_kcal)
    assert.equal(preview.recovery_balance_kcal, server.recovery_balance_kcal)
    assert.equal(preview.internal_target_kcal, INTERNAL)
    assert.equal(TARGET - 1932, -35)
    assert.equal(INTERNAL - 1932, -135)
  })
})
