import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildAnalysisSummary, buildPeriodWeightTrendMeasurements, resolveAnalysisDateRange } from './analysis-summary'
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

  it('uses profile weight as first point when it differs from goal start', () => {
    const days = ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05']
    const checkins = days.map(day =>
      checkin(day, [
        { name: '早餐', calories: 400, protein_g: 30, slot: 'breakfast' },
        { name: '午餐', calories: 550, protein_g: 40, slot: 'lunch' },
        { name: '晚餐', calories: 500, protein_g: 35, slot: 'dinner' },
      ])
    )
    const summary = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date('2026-07-05'),
      todayDate: '2026-07-05',
      measurements: [
        {
          id: '2',
          user_id: 'u',
          measured_at: '2026-07-05',
          weight_kg: 69,
          body_fat_pct: null,
          muscle_mass_kg: null,
          waist_cm: null,
          hip_cm: null,
          chest_cm: null,
          created_at: '2026-07-05T10:00:00Z',
        },
      ],
      checkins,
      targets: { ...targets, start_weight_kg: 70, start_date: '2026-06-01' },
      profileWeightKg: 67.4,
      currentWeightKg: 69,
    })
    assert.equal(summary.weightTrend.sufficient, true)
    assert.equal(summary.weightTrend.points.length, 2)
    assert.equal(summary.weightTrend.points[0]?.weight, 67.4)
    assert.equal(summary.weightTrend.points[1]?.weight, 69)
    assert.equal(summary.weightTrend.previousKg, 67.4)
  })

  it('uses goal start weight as first point and first update as second', () => {
    const days = ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05']
    const checkins = days.map(day =>
      checkin(day, [
        { name: '早餐', calories: 400, protein_g: 30, slot: 'breakfast' },
        { name: '午餐', calories: 550, protein_g: 40, slot: 'lunch' },
        { name: '晚餐', calories: 500, protein_g: 35, slot: 'dinner' },
      ])
    )
    const summary = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date('2026-07-05'),
      todayDate: '2026-07-05',
      measurements: [
        {
          id: '2',
          user_id: 'u',
          measured_at: '2026-07-05',
          weight_kg: 68,
          body_fat_pct: null,
          muscle_mass_kg: null,
          waist_cm: null,
          hip_cm: null,
          chest_cm: null,
          created_at: '2026-07-05T10:00:00Z',
        },
      ],
      checkins,
      targets: { ...targets, start_weight_kg: 70, start_date: '2026-07-01' },
      currentWeightKg: 68,
    })
    assert.equal(summary.weightTrend.sufficient, true)
    assert.equal(summary.weightTrend.points.length, 2)
    assert.equal(summary.weightTrend.points[0]?.weight, 70)
    assert.equal(summary.weightTrend.points[1]?.weight, 68)
    assert.equal(summary.weightTrend.currentKg, 68)
    assert.equal(summary.weightTrend.previousKg, 70)
  })

  it('treats onboarding measurement as initial point before first progress update', () => {
    const days = ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05']
    const checkins = days.map(day =>
      checkin(day, [
        { name: '早餐', calories: 400, protein_g: 30, slot: 'breakfast' },
        { name: '午餐', calories: 550, protein_g: 40, slot: 'lunch' },
        { name: '晚餐', calories: 500, protein_g: 35, slot: 'dinner' },
      ])
    )
    const summary = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date('2026-07-05'),
      todayDate: '2026-07-05',
      measurements: [
        {
          id: '1',
          user_id: 'u',
          measured_at: '2026-07-01',
          weight_kg: 70,
          body_fat_pct: null,
          muscle_mass_kg: null,
          waist_cm: null,
          hip_cm: null,
          chest_cm: null,
          created_at: '2026-07-01T08:00:00Z',
        },
      ],
      checkins,
      targets: { ...targets, start_weight_kg: 70, start_date: '2026-07-01' },
      currentWeightKg: 70,
    })
    assert.equal(summary.weightTrend.sufficient, false)
    assert.equal(summary.weightTrend.points.length, 1)
    assert.equal(summary.weightTrend.points[0]?.weight, 70)
  })

  it('keeps each saved log as its own chart point', () => {
    const days = ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05', '2026-07-06', '2026-07-07']
    const checkins = days.map(day =>
      checkin(day, [
        { name: '早餐', calories: 400, protein_g: 30, slot: 'breakfast' },
        { name: '午餐', calories: 550, protein_g: 40, slot: 'lunch' },
        { name: '晚餐', calories: 500, protein_g: 35, slot: 'dinner' },
      ])
    )
    const summary = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date('2026-07-07'),
      todayDate: '2026-07-07',
      measurements: [
        { id: '1', user_id: 'u', measured_at: '2026-07-06', weight_kg: 68.9, body_fat_pct: null, muscle_mass_kg: null, waist_cm: null, hip_cm: null, chest_cm: null, created_at: '2026-07-06T08:00:00Z' },
        { id: '2', user_id: 'u', measured_at: '2026-07-07', weight_kg: 67, body_fat_pct: null, muscle_mass_kg: null, waist_cm: null, hip_cm: null, chest_cm: null, created_at: '2026-07-07T08:00:00Z' },
        { id: '3', user_id: 'u', measured_at: '2026-07-07', weight_kg: 67, body_fat_pct: null, muscle_mass_kg: null, waist_cm: null, hip_cm: null, chest_cm: null, created_at: '2026-07-07T10:00:00Z' },
        { id: '4', user_id: 'u', measured_at: '2026-07-07', weight_kg: 67, body_fat_pct: null, muscle_mass_kg: null, waist_cm: null, hip_cm: null, chest_cm: null, created_at: '2026-07-07T12:00:00Z' },
      ],
      checkins,
      targets,
      currentWeightKg: 67,
    })
    assert.equal(summary.weightTrend.points.length, 4)
    assert.equal(summary.weightTrend.points[0]?.weight, 68.9)
    assert.equal(summary.weightTrend.points[1]?.weight, 67)
    assert.equal(summary.weightTrend.points[2]?.weight, 67)
    assert.equal(summary.weightTrend.points[3]?.weight, 67)
    assert.equal(summary.weightTrend.sufficient, true)
    assert.equal(summary.weightTrend.deltaKg, -1.9)
  })

  it('shows goal start plus two same-day updates as three trend points', () => {
    const days = ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12']
    const checkins = days.map(day =>
      checkin(day, [
        { name: '早餐', calories: 400, protein_g: 30, slot: 'breakfast' },
        { name: '午餐', calories: 550, protein_g: 40, slot: 'lunch' },
        { name: '晚餐', calories: 500, protein_g: 35, slot: 'dinner' },
      ])
    )
    const summary = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date('2026-07-12'),
      todayDate: '2026-07-12',
      measurements: [
        { id: '1', user_id: 'u', measured_at: '2026-07-07', weight_kg: 69, body_fat_pct: null, muscle_mass_kg: null, waist_cm: null, hip_cm: null, chest_cm: null, created_at: '2026-07-07T12:00:00.000Z' },
        { id: '2', user_id: 'u', measured_at: '2026-07-07', weight_kg: 68.2, body_fat_pct: null, muscle_mass_kg: null, waist_cm: null, hip_cm: null, chest_cm: null, created_at: '2026-07-07T15:00:00.000Z' },
      ],
      checkins,
      targets: { ...targets, start_weight_kg: 70, start_date: '2026-06-01' },
      currentWeightKg: 68.2,
    })
    assert.equal(summary.weightTrend.sufficient, true)
    assert.equal(summary.weightTrend.points.length, 2)
    assert.equal(summary.weightTrend.points[0]?.weight, 69)
    assert.equal(summary.weightTrend.points[1]?.weight, 68.2)
  })

  it('shows weight trend when two readings exist on the same day', () => {
    const days = ['2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05']
    const checkins = days.map(day =>
      checkin(day, [
        { name: '早餐', calories: 400, protein_g: 30, slot: 'breakfast' },
        { name: '午餐', calories: 550, protein_g: 40, slot: 'lunch' },
        { name: '晚餐', calories: 500, protein_g: 35, slot: 'dinner' },
      ])
    )
    const summary = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date('2026-07-05'),
      todayDate: '2026-07-05',
      measurements: [
        { id: '1', user_id: 'u', measured_at: '2026-07-05', weight_kg: 70, body_fat_pct: null, muscle_mass_kg: null, waist_cm: null, hip_cm: null, chest_cm: null, created_at: '2026-07-05T08:00:00Z' },
        { id: '2', user_id: 'u', measured_at: '2026-07-05', weight_kg: 65, body_fat_pct: null, muscle_mass_kg: null, waist_cm: null, hip_cm: null, chest_cm: null, created_at: '2026-07-05T15:00:00Z' },
      ],
      checkins,
      targets,
      currentWeightKg: 65,
    })
    assert.equal(summary.weightTrend.sufficient, true)
    assert.equal(summary.weightTrend.points.length, 2)
    assert.equal(summary.weightTrend.currentKg, 65)
    assert.equal(summary.weightTrend.previousKg, 70)
  })

  it('uses profile weight after restart when logging a new reading', () => {
    const days = ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12']
    const checkins = days.map(day =>
      checkin(day, [
        { name: '早餐', calories: 400, protein_g: 30, slot: 'breakfast' },
        { name: '午餐', calories: 550, protein_g: 40, slot: 'lunch' },
        { name: '晚餐', calories: 500, protein_g: 35, slot: 'dinner' },
      ])
    )
    const summary = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date('2026-07-12'),
      todayDate: '2026-07-12',
      measurements: [
        {
          id: '2',
          user_id: 'u',
          measured_at: '2026-07-12',
          weight_kg: 74,
          body_fat_pct: null,
          muscle_mass_kg: null,
          waist_cm: null,
          hip_cm: null,
          chest_cm: null,
          created_at: '2026-07-12T10:00:00Z',
        },
      ],
      checkins,
      targets: { ...targets, start_weight_kg: 70, start_date: '2026-06-01' },
      profileWeightKg: 75,
      currentWeightKg: 74,
    })
    assert.equal(summary.weightTrend.points.length, 2)
    assert.equal(summary.weightTrend.points[0]?.weight, 75)
    assert.equal(summary.weightTrend.points[1]?.weight, 74)
    assert.equal(summary.weightTrend.previousKg, 75)
  })

  it('uses prior visible weight instead of goal start when second log is saved', () => {
    const days = ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12']
    const checkins = days.map(day =>
      checkin(day, [
        { name: '早餐', calories: 400, protein_g: 30, slot: 'breakfast' },
        { name: '午餐', calories: 550, protein_g: 40, slot: 'lunch' },
        { name: '晚餐', calories: 500, protein_g: 35, slot: 'dinner' },
      ])
    )
    const summary = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date('2026-07-12'),
      todayDate: '2026-07-12',
      measurements: [
        {
          id: '2',
          user_id: 'u',
          measured_at: '2026-07-12',
          weight_kg: 69.5,
          body_fat_pct: null,
          muscle_mass_kg: null,
          waist_cm: null,
          hip_cm: null,
          chest_cm: null,
          created_at: '2026-07-12T12:00:00Z',
        },
      ],
      checkins,
      targets: { ...targets, start_weight_kg: 70, start_date: '2026-07-06' },
      profileWeightKg: 69.5,
      currentWeightKg: 69.5,
      priorWeightKg: 74,
    })
    assert.equal(summary.weightTrend.sufficient, true)
    assert.equal(summary.weightTrend.points.length, 2)
    assert.equal(summary.weightTrend.points[0]?.weight, 74)
    assert.equal(summary.weightTrend.points[1]?.weight, 69.5)
    assert.equal(summary.weightTrend.previousKg, 74)
    assert.equal(summary.weightTrend.deltaKg, -4.5)
  })

  it('carries pre-period weight into weekly trend when only new log is in range', () => {
    const range = {
      start: '2026-07-06',
      end: '2026-07-12',
      label: 'week',
    }
    const measurements = [
      { id: '1', user_id: 'u', measured_at: '2026-07-05', weight_kg: 74, body_fat_pct: null, muscle_mass_kg: null, waist_cm: null, hip_cm: null, chest_cm: null, created_at: '2026-07-05T08:00:00Z' },
      { id: '2', user_id: 'u', measured_at: '2026-07-12', weight_kg: 69.5, body_fat_pct: null, muscle_mass_kg: null, waist_cm: null, hip_cm: null, chest_cm: null, created_at: '2026-07-12T12:00:00Z' },
    ]
    const trend = buildPeriodWeightTrendMeasurements(measurements, range, 70, '2026-07-06')
    assert.equal(trend.length, 2)
    assert.equal(trend[0]?.weight_kg, 74)
    assert.equal(trend[1]?.weight_kg, 69.5)
    assert.equal(trend.some(m => m.id === 'goal-start-weight'), false)
  })

  it('uses visible current weight instead of goal start when logging the second reading', () => {
    const days = ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12']
    const checkins = days.map(day =>
      checkin(day, [
        { name: '早餐', calories: 400, protein_g: 30, slot: 'breakfast' },
        { name: '午餐', calories: 550, protein_g: 40, slot: 'lunch' },
        { name: '晚餐', calories: 500, protein_g: 35, slot: 'dinner' },
      ])
    )
    const summary = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date('2026-07-12'),
      todayDate: '2026-07-12',
      measurements: [
        {
          id: '2',
          user_id: 'u',
          measured_at: '2026-07-12',
          weight_kg: 71,
          body_fat_pct: null,
          muscle_mass_kg: null,
          waist_cm: null,
          hip_cm: null,
          chest_cm: null,
          created_at: '2026-07-12T12:00:00Z',
        },
      ],
      checkins,
      targets: { ...targets, start_weight_kg: 70, start_date: '2026-07-06' },
      profileWeightKg: 71,
      currentWeightKg: 71,
      priorWeightKg: 69.5,
    })
    assert.equal(summary.weightTrend.sufficient, true)
    assert.equal(summary.weightTrend.points.length, 2)
    assert.equal(summary.weightTrend.points[0]?.weight, 69.5)
    assert.equal(summary.weightTrend.points[1]?.weight, 71)
    assert.equal(summary.weightTrend.previousKg, 69.5)
  })

  it('keeps three real logs after a second same-day update', () => {
    const days = ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12']
    const checkins = days.map(day =>
      checkin(day, [
        { name: '早餐', calories: 400, protein_g: 30, slot: 'breakfast' },
        { name: '午餐', calories: 550, protein_g: 40, slot: 'lunch' },
        { name: '晚餐', calories: 500, protein_g: 35, slot: 'dinner' },
      ])
    )
    const summary = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date('2026-07-12'),
      todayDate: '2026-07-12',
      measurements: [
        { id: '1', user_id: 'u', measured_at: '2026-07-12', weight_kg: 69.5, body_fat_pct: null, muscle_mass_kg: null, waist_cm: null, hip_cm: null, chest_cm: null, created_at: '2026-07-12T10:00:00Z' },
        { id: '2', user_id: 'u', measured_at: '2026-07-12', weight_kg: 71, body_fat_pct: null, muscle_mass_kg: null, waist_cm: null, hip_cm: null, chest_cm: null, created_at: '2026-07-12T11:00:00Z' },
        { id: '3', user_id: 'u', measured_at: '2026-07-12', weight_kg: 72, body_fat_pct: null, muscle_mass_kg: null, waist_cm: null, hip_cm: null, chest_cm: null, created_at: '2026-07-12T12:00:00Z' },
      ],
      checkins,
      targets: { ...targets, start_weight_kg: 70, start_date: '2026-07-06' },
      currentWeightKg: 72,
    })
    assert.equal(summary.weightTrend.points.length, 3)
    assert.equal(summary.weightTrend.points[0]?.weight, 69.5)
    assert.equal(summary.weightTrend.points[1]?.weight, 71)
    assert.equal(summary.weightTrend.points[2]?.weight, 72)
    assert.equal(summary.weightTrend.previousKg, 71)
  })

  it('does not inject goal start when two real logs already exist', () => {
    const range = {
      start: '2026-07-01',
      end: '2026-07-07',
      label: 'week',
    }
    const measurements = [
      { id: '1', user_id: 'u', measured_at: '2026-07-01', weight_kg: 68, body_fat_pct: null, muscle_mass_kg: null, waist_cm: null, hip_cm: null, chest_cm: null, created_at: '2026-07-01T08:00:00Z' },
      { id: '2', user_id: 'u', measured_at: '2026-07-03', weight_kg: 68, body_fat_pct: null, muscle_mass_kg: null, waist_cm: null, hip_cm: null, chest_cm: null, created_at: '2026-07-03T08:00:00Z' },
      { id: '3', user_id: 'u', measured_at: '2026-07-05', weight_kg: 68, body_fat_pct: null, muscle_mass_kg: null, waist_cm: null, hip_cm: null, chest_cm: null, created_at: '2026-07-05T08:00:00Z' },
    ]
    const trend = buildPeriodWeightTrendMeasurements(measurements, range, 70, '2026-06-01')
    assert.equal(trend.length, 3)
    assert.equal(trend.some(m => m.id === 'goal-start-weight'), false)
    assert.equal(trend.some(m => m.id === 'weight-trend-anchor'), false)
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
