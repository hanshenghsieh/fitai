import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resolveLogMacros, sumLoggedCarbs, sumItemMacros } from './food-log-macros'
import type { FoodLogEntry } from '@/lib/banks/types'

function log(partial: Partial<FoodLogEntry> & Pick<FoodLogEntry, 'id' | 'name' | 'calories' | 'protein_g'>): FoodLogEntry {
  return {
    logged_at: '2026-06-18T12:00:00.000Z',
    user_declared: true,
    source: 'dice',
    ...partial,
  }
}

describe('food-log-macros', () => {
  it('uses stored macros when present', () => {
    const entry = log({ id: '1', name: '測試', calories: 500, protein_g: 30, carbs_g: 60, fat_g: 12 })
    assert.deepEqual(resolveLogMacros(entry), { carbs_g: 60, fat_g: 12 })
  })

  it('infers high carbs for rice and dumpling meals', () => {
    const rice = log({ id: '2', name: '弘爺漢堡 · 燒肉飯（飯吃 75%）', calories: 435, protein_g: 22 })
    const carbs = resolveLogMacros(rice).carbs_g
    assert.ok(carbs >= 45, `expected carb-heavy meal, got ${carbs}g`)

    const dumplings = log({ id: '3', name: '三商巧福 · 水餃（10顆）', calories: 530, protein_g: 24 })
    assert.ok(resolveLogMacros(dumplings).carbs_g >= 50)
  })

  it('sums dice combo macros from items', () => {
    const totals = sumItemMacros([
      { calories: 435, protein_g: 22, carbs_g: 58, fat_g: 10 },
      { calories: 530, protein_g: 24, carbs_g: 62, fat_g: 18 },
      { calories: 600, protein_g: 36, carbs_g: 88, fat_g: 14 },
    ])
    assert.equal(totals.carbs_g, 208)
    assert.equal(totals.fat_g, 42)
  })

  it('does not use protein-times-0.5 fallback', () => {
    const logs = [
      log({ id: 'a', name: '燒肉飯', calories: 435, protein_g: 22 }),
      log({ id: 'b', name: '水餃', calories: 530, protein_g: 24 }),
      log({ id: 'c', name: '花壽司', calories: 600, protein_g: 36 }),
    ]
    const carbs = sumLoggedCarbs(logs)
    assert.ok(carbs > 100, `three carb-heavy meals should exceed 100g, got ${carbs}`)
    assert.notEqual(carbs, Math.round((22 + 24 + 36) * 0.5))
  })
})
