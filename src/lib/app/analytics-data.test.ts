import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mergeTodayWeightMeasurement, resolveLatestWeightKg } from './analytics-data'

describe('analytics-data weight helpers', () => {
  it('prefers profile weight when historical measurements are stale', () => {
    const kg = resolveLatestWeightKg(
      [{ measured_at: '2024-06-10', weight_kg: 72 }],
      68.5,
      '2024-06-18'
    )
    assert.equal(kg, 68.5)
  })

  it('prefers today body measurement over profile', () => {
    const kg = resolveLatestWeightKg(
      [
        { measured_at: '2024-06-10', weight_kg: 72 },
        { measured_at: '2024-06-18', weight_kg: 69.2 },
      ],
      68.5,
      '2024-06-18'
    )
    assert.equal(kg, 69.2)
  })

  it('mergeTodayWeightMeasurement upserts today row for charts', () => {
    const merged = mergeTodayWeightMeasurement(
      [{ measured_at: '2024-06-10', weight_kg: 72 }],
      68.5,
      '2024-06-18'
    )
    assert.equal(merged.length, 2)
    assert.equal(merged.at(-1)?.weight_kg, 68.5)
  })
})
