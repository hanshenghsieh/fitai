import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  extractWeightHistoryFromCheckins,
  mergeWeightMeasurementSources,
} from './weight-history.ts'

describe('weight-history', () => {
  it('extracts weight readings from checkin notes', () => {
    const rows = extractWeightHistoryFromCheckins([
      {
        checkin_date: '2026-07-05',
        notes: JSON.stringify({
          weight_history: [
            { logged_at: '2026-07-05T08:00:00.000Z', weight_kg: 70 },
            { logged_at: '2026-07-05T15:00:00.000Z', weight_kg: 65 },
          ],
        }),
      },
    ])
    assert.equal(rows.length, 2)
    assert.equal(rows[0]?.weight_kg, 70)
    assert.equal(rows[1]?.weight_kg, 65)
  })

  it('falls back to checkin history when db measurements are empty', () => {
    const merged = mergeWeightMeasurementSources(
      [],
      extractWeightHistoryFromCheckins([
        {
          checkin_date: '2026-07-05',
          notes: JSON.stringify({
            weight_history: [
              { logged_at: '2026-07-05T08:00:00.000Z', weight_kg: 70 },
              { logged_at: '2026-07-05T15:00:00.000Z', weight_kg: 65 },
            ],
          }),
        },
      ])
    )
    assert.equal(merged.length, 2)
  })
})
