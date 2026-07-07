import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { extractWeightHistoryFromCheckins, mergeWeightMeasurementSources } from './weight-history'

describe('weight-history', () => {
  it('keeps every same-day same-weight entry for trend chart points', () => {
    const rows = extractWeightHistoryFromCheckins([
      {
        checkin_date: '2026-07-08',
        notes: JSON.stringify({
          weight_history: [
            { logged_at: '2026-07-08T08:00:00.000Z', weight_kg: 68.2 },
            { logged_at: '2026-07-08T09:00:00.000Z', weight_kg: 68.2 },
            { logged_at: '2026-07-08T10:00:00.000Z', weight_kg: 68.2 },
            { logged_at: '2026-07-08T11:00:00.000Z', weight_kg: 68.2 },
          ],
        }),
      },
    ])

    assert.equal(rows.length, 4)
    assert.equal(rows.filter(r => r.weight_kg === 68.2).length, 4)
  })

  it('prefers checkin history when it has more same-day points than db', () => {
    const dbRows = [{ measured_at: '2026-07-08', weight_kg: 75, created_at: '2026-07-08T18:00:00.000Z' }]
    const checkinRows = [
      { measured_at: '2026-07-08', weight_kg: 71, created_at: '2026-07-08T10:00:00.000Z' },
      { measured_at: '2026-07-08', weight_kg: 72.5, created_at: '2026-07-08T12:00:00.000Z' },
      { measured_at: '2026-07-08', weight_kg: 73.5, created_at: '2026-07-08T14:00:00.000Z' },
      { measured_at: '2026-07-08', weight_kg: 75, created_at: '2026-07-08T18:00:00.000Z' },
    ]
    const merged = mergeWeightMeasurementSources(dbRows, checkinRows)
    assert.equal(merged.length, 4)
    assert.equal(merged[0]?.weight_kg, 71)
    assert.equal(merged.at(-1)?.weight_kg, 75)
  })
})
