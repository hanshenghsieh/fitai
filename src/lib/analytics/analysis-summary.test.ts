import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildAnalysisSummary, resolveAnalysisDateRange } from './analysis-summary'
import type { AnalysisCheckinRow } from './analysis-summary'

const targets = {
  calories: 1800,
  protein_g: 120,
  water_ml: 2000,
  target_weight_kg: 65,
}

function checkin(day: string, logs: { name: string; calories: number; protein_g: number; slot?: string }[]): AnalysisCheckinRow {
  return {
    checkin_date: day,
    notes: JSON.stringify({
      user_memory: {
        food_logs_today: logs.map((l, i) => ({
          id: `${day}-${i}`,
          name: l.name,
          calories: l.calories,
          protein_g: l.protein_g,
          slot: l.slot,
          logged_at: `${day}T12:00:00.000Z`,
          user_declared: true,
          source: 'search',
        })),
      },
    }),
    water_ml: 2100,
    workout_items: [{ completed: true }],
  }
}

describe('analysis-summary', () => {
  it('returns insufficient_data when fewer than 3 meals', () => {
    const summary = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date('2024-06-18'),
      measurements: [],
      checkins: [
        checkin('2024-06-17', [{ name: '雞胸', calories: 400, protein_g: 40 }]),
        checkin('2024-06-18', [{ name: '沙拉', calories: 350, protein_g: 25 }]),
      ],
      targets,
    })
    assert.equal(summary.insufficient_data, true)
  })

  it('computes protein gap and dinner ratio from real logs', () => {
    const checkins: AnalysisCheckinRow[] = []
    for (let d = 16; d <= 22; d++) {
      const day = `2024-06-${d}`
      checkins.push(
        checkin(day, [
          { name: '早餐', calories: 300, protein_g: 15, slot: 'breakfast' },
          { name: '午餐', calories: 500, protein_g: 30, slot: 'lunch' },
          { name: '晚餐大餐', calories: 700, protein_g: 20, slot: 'dinner' },
        ])
      )
    }
    const summary = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date('2024-06-18'),
      measurements: [
        { id: '1', user_id: 'u', measured_at: '2024-06-17', weight_kg: 69, body_fat_pct: null, muscle_mass_kg: null, notes: null },
        { id: '2', user_id: 'u', measured_at: '2024-06-22', weight_kg: 68.4, body_fat_pct: null, muscle_mass_kg: null, notes: null },
      ],
      checkins,
      targets,
      currentWeightKg: 68.4,
    })
    assert.equal(summary.insufficient_data, false)
    assert.ok((summary.proteinGapAvg ?? 0) > 0)
    assert.ok((summary.dinnerCaloriesRatio ?? 0) > 0.4)
    assert.ok(summary.insights.length >= 2)
  })

  it('resolveAnalysisDateRange week format', () => {
    const range = resolveAnalysisDateRange('week', new Date('2024-06-18'))
    assert.ok(range.label.includes('2024/06'))
  })

  it('day week month shift does not throw', () => {
    const weekCheckins = [
      checkin('2024-06-17', [{ name: 'a', calories: 100, protein_g: 10 }]),
      checkin('2024-06-18', [{ name: 'b', calories: 100, protein_g: 10 }]),
      checkin('2024-06-19', [{ name: 'c', calories: 100, protein_g: 10 }]),
    ]
    const dayCheckins = [
      checkin('2024-06-18', [
        { name: 'a', calories: 100, protein_g: 10 },
        { name: 'b', calories: 100, protein_g: 10 },
        { name: 'c', calories: 100, protein_g: 10 },
      ]),
    ]
    for (const p of ['week', 'month'] as const) {
      const s = buildAnalysisSummary({
        periodType: p,
        anchorDate: new Date('2024-06-18'),
        measurements: [],
        checkins: weekCheckins,
        targets,
      })
      assert.equal(s.insufficient_data, false)
    }
    const daySummary = buildAnalysisSummary({
      periodType: 'day',
      anchorDate: new Date('2024-06-18'),
      measurements: [],
      checkins: dayCheckins,
      targets,
    })
    assert.equal(daySummary.insufficient_data, false)
  })

  it('reports positive trend when weight drops and calories on target', () => {
    const checkins: AnalysisCheckinRow[] = []
    for (let d = 16; d <= 22; d++) {
      checkins.push(
        checkin(`2024-06-${d}`, [
          { name: '早餐', calories: 400, protein_g: 30, slot: 'breakfast' },
          { name: '午餐', calories: 550, protein_g: 40, slot: 'lunch' },
          { name: '晚餐', calories: 500, protein_g: 35, slot: 'dinner' },
        ])
      )
    }
    const summary = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date('2024-06-18'),
      measurements: [
        { id: '1', user_id: 'u', measured_at: '2024-06-17', weight_kg: 69, body_fat_pct: null, muscle_mass_kg: null, notes: null },
        { id: '2', user_id: 'u', measured_at: '2024-06-22', weight_kg: 68.4, body_fat_pct: null, muscle_mass_kg: null, notes: null },
      ],
      checkins,
      targets,
      currentWeightKg: 68.4,
    })
    assert.equal(summary.weightTrend.deltaKg, -0.6)
    assert.ok(summary.insights.some(i => i.tone === 'success'))
  })

  it('paces weekly water goal by elapsed days in the week', () => {
    const today = '2024-06-17'
    const summary = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date(today),
      todayDate: today,
      measurements: [],
      checkins: [
        checkin(today, [
          { name: '早餐', calories: 400, protein_g: 30, slot: 'breakfast' },
          { name: '午餐', calories: 550, protein_g: 40, slot: 'lunch' },
          { name: '晚餐', calories: 500, protein_g: 35, slot: 'dinner' },
        ]),
      ],
      targets,
    })
    const waterAction = summary.nextActions.find(a => a.id === 'water-2000')
    assert.equal(waterAction?.done, true)
  })
})
