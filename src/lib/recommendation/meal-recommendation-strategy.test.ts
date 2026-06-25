import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildAnalysisSummary } from '@/lib/analytics/analysis-summary'
import { buildMealRecommendationStrategy } from './meal-recommendation-strategy'

function summaryWith(overrides: Partial<ReturnType<typeof buildAnalysisSummary>> = {}) {
  const base = buildAnalysisSummary({
    periodType: 'week',
    anchorDate: new Date('2024-06-18'),
    measurements: [],
    checkins: [
      {
        checkin_date: '2024-06-16',
        notes: JSON.stringify({
          user_memory: {
            food_logs_today: [
              { id: '1', name: '雞胸', calories: 350, protein_g: 35, logged_at: '2024-06-16T12:00:00.000Z', user_declared: true, source: 'search' },
              { id: '2', name: '沙拉', calories: 200, protein_g: 8, logged_at: '2024-06-16T19:00:00.000Z', user_declared: true, source: 'search', slot: 'dinner' },
              { id: '3', name: '燕麥', calories: 300, protein_g: 10, logged_at: '2024-06-16T08:00:00.000Z', user_declared: true, source: 'search', slot: 'breakfast' },
            ],
          },
        }),
      },
      {
        checkin_date: '2024-06-17',
        notes: JSON.stringify({
          user_memory: {
            food_logs_today: [
              { id: '4', name: '便當', calories: 700, protein_g: 20, logged_at: '2024-06-17T12:00:00.000Z', user_declared: true, source: 'search' },
              { id: '5', name: '晚餐', calories: 650, protein_g: 18, logged_at: '2024-06-17T19:00:00.000Z', user_declared: true, source: 'search', slot: 'dinner' },
              { id: '6', name: '點心', calories: 150, protein_g: 3, logged_at: '2024-06-17T16:00:00.000Z', user_declared: true, source: 'search' },
            ],
          },
        }),
      },
      {
        checkin_date: '2024-06-18',
        notes: JSON.stringify({
          user_memory: {
            food_logs_today: [
              { id: '7', name: '豆腐', calories: 220, protein_g: 18, logged_at: '2024-06-18T12:00:00.000Z', user_declared: true, source: 'search' },
              { id: '8', name: '魚', calories: 280, protein_g: 30, logged_at: '2024-06-18T19:00:00.000Z', user_declared: true, source: 'search' },
              { id: '9', name: '水果', calories: 80, protein_g: 1, logged_at: '2024-06-18T15:00:00.000Z', user_declared: true, source: 'search' },
            ],
          },
        }),
      },
    ],
    targets: { calories: 1800, protein_g: 120, water_ml: 2000, target_weight_kg: 65 },
  })
  return { ...base, ...overrides }
}

describe('meal-recommendation-strategy', () => {
  it('returns null when insufficient data', () => {
    const s = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date(),
      measurements: [],
      checkins: [],
      targets: { calories: 1800, protein_g: 120, water_ml: 2000, target_weight_kg: 65 },
    })
    assert.equal(buildMealRecommendationStrategy(s), null)
  })

  it('recommends high protein when gap is large', () => {
    const s = summaryWith({ proteinGapAvg: 28 })
    const rec = buildMealRecommendationStrategy(s)
    assert.ok(rec)
    assert.match(rec!.name, /雞胸|茶葉蛋|豆漿/)
    assert.match(rec!.based_on_insight, /蛋白質/)
  })

  it('recommends low calorie dinner options when dinner ratio high', () => {
    const s = summaryWith({ dinnerCaloriesRatio: 0.48, proteinGapAvg: 5, fatRatioAvg: 0.2 })
    const rec = buildMealRecommendationStrategy(s)
    assert.ok(rec)
    assert.match(rec!.name, /蒸魚|豆腐/)
  })

  it('avoids fried foods when fat ratio high', () => {
    const s = summaryWith({ fatRatioAvg: 0.42, proteinGapAvg: 5, dinnerCaloriesRatio: 0.3 })
    const rec = buildMealRecommendationStrategy(s)
    assert.ok(rec)
    assert.match(rec!.reason, /油炸/)
  })

  it('suggests unsweetened drinks when sugar drinks frequent', () => {
    const s = summaryWith({ sugarDrinkCount: 3, proteinGapAvg: 5, dinnerCaloriesRatio: 0.3, fatRatioAvg: 0.2 })
    const rec = buildMealRecommendationStrategy(s)
    assert.ok(rec)
    assert.match(rec!.name, /無糖茶/)
  })
})
