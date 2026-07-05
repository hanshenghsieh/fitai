import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildCalorieBankExplainer } from './calorie-bank-explainer.ts'
import type { CalorieBankRow } from '../banks/calorie-bank-types.ts'

function row(overrides: Partial<CalorieBankRow>): CalorieBankRow {
  return {
    user_id: 'u',
    date: '2026-07-05',
    daily_target_kcal: 1800,
    internal_target_kcal: 1700,
    actual_kcal: 0,
    delta_kcal: 0,
    running_balance_kcal: 1700,
    recovery_balance_kcal: 400,
    spread_days_remaining: 3,
    daily_adjust_kcal: -100,
    ...overrides,
  }
}

describe('calorie-bank-explainer', () => {
  it('explains recovery after overeating', () => {
    const detail = buildCalorieBankExplainer(row({}))
    assert.match(detail.reasonBody, /待平衡/)
    assert.ok(detail.statusLines.some(l => l.label === '待平衡熱量'))
    assert.ok(detail.statusLines.some(l => l.label === '預計還需' && l.value.includes('3')))
  })

  it('explains top-up after undereating', () => {
    const detail = buildCalorieBankExplainer(
      row({ internal_target_kcal: 1900, recovery_balance_kcal: 0, spread_days_remaining: 0, daily_adjust_kcal: 0 })
    )
    assert.match(detail.reasonBody, /昨天吃得比目標少/)
  })
})
