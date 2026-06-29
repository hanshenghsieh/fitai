import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildAnalysisSummary } from '@/lib/analytics/analysis-summary'
import { buildWorkoutRecommendationStrategy } from './workout-recommendation-strategy'

function baseSummary() {
  return buildAnalysisSummary({
    periodType: 'week',
    anchorDate: new Date('2024-06-18'),
    measurements: [
      { id: '1', user_id: 'u', measured_at: '2024-06-16', weight_kg: 69, body_fat_pct: null, muscle_mass_kg: null, notes: null },
      { id: '2', user_id: 'u', measured_at: '2024-06-22', weight_kg: 68.4, body_fat_pct: null, muscle_mass_kg: null, notes: null },
    ],
    checkins: [
      {
        checkin_date: '2024-06-16',
        notes: JSON.stringify({
          user_memory: {
            food_logs_today: [
              { id: '1', name: '餐', calories: 1500, protein_g: 90, logged_at: '2024-06-16T12:00:00.000Z', user_declared: true, source: 'search' },
              { id: '2', name: '餐2', calories: 200, protein_g: 15, logged_at: '2024-06-16T19:00:00.000Z', user_declared: true, source: 'search' },
              { id: '3', name: '餐3', calories: 100, protein_g: 8, logged_at: '2024-06-16T08:00:00.000Z', user_declared: true, source: 'search' },
            ],
          },
        }),
        workout_items: [{ completed: false }],
      },
      {
        checkin_date: '2024-06-17',
        notes: JSON.stringify({
          user_memory: {
            food_logs_today: [
              { id: '4', name: '餐', calories: 1550, protein_g: 95, logged_at: '2024-06-17T12:00:00.000Z', user_declared: true, source: 'search' },
              { id: '5', name: '餐2', calories: 180, protein_g: 12, logged_at: '2024-06-17T19:00:00.000Z', user_declared: true, source: 'search' },
              { id: '6', name: '餐3', calories: 120, protein_g: 6, logged_at: '2024-06-17T08:00:00.000Z', user_declared: true, source: 'search' },
            ],
          },
        }),
        workout_items: [{ completed: false }],
      },
      {
        checkin_date: '2024-06-18',
        notes: JSON.stringify({
          user_memory: {
            food_logs_today: [
              { id: '7', name: '餐', calories: 1480, protein_g: 88, logged_at: '2024-06-18T12:00:00.000Z', user_declared: true, source: 'search' },
              { id: '8', name: '餐2', calories: 190, protein_g: 14, logged_at: '2024-06-18T19:00:00.000Z', user_declared: true, source: 'search' },
              { id: '9', name: '餐3', calories: 110, protein_g: 7, logged_at: '2024-06-18T08:00:00.000Z', user_declared: true, source: 'search' },
            ],
          },
        }),
        workout_items: [{ completed: true }],
      },
    ],
    targets: { calories: 1800, protein_g: 120, water_ml: 2000, target_weight_kg: 65 },
    currentWeightKg: 68.4,
  })
}

describe('workout-recommendation-strategy', () => {
  it('suggests cardio when calories over target', () => {
    const s = baseSummary()
    s.calorieTrend.average = 2000
    const rec = buildWorkoutRecommendationStrategy(s)
    assert.ok(rec)
    assert.match(rec!.title, /有氧/)
    assert.equal(rec!.intensity, 'low')
  })

  it('lowers intensity when protein insufficient', () => {
    const s = baseSummary()
    s.proteinGapAvg = 25
    const rec = buildWorkoutRecommendationStrategy(s, '下肢重訓')
    assert.ok(rec)
    assert.match(rec!.title, /低中強度/)
    assert.match(rec!.reason, /蛋白質/)
  })

  it('suggests NEAT when weight plateau but calories on target', () => {
    const s = baseSummary()
    s.weightTrend.deltaKg = 0
    s.calorieTrend.metDays = 5
    const rec = buildWorkoutRecommendationStrategy(s)
    assert.ok(rec)
    assert.match(rec!.reason, /NEAT|Zone 2/)
  })

  it('positive weight loss with calorie control uses planned workout', () => {
    const s = baseSummary()
    s.weightTrend.deltaKg = -0.6
    s.proteinGapAvg = 5
    const rec = buildWorkoutRecommendationStrategy(s, '全身訓練')
    assert.ok(rec)
    assert.equal(rec!.title, '全身訓練')
  })

  it('eases intensity when weight drops too fast', () => {
    const s = baseSummary()
    s.weightTrend.deltaKg = -1.2
    const rec = buildWorkoutRecommendationStrategy(s, '全身訓練')
    assert.ok(rec)
    assert.match(rec!.reason, /偏快/)
    assert.equal(rec!.intensity, 'low')
  })
})
