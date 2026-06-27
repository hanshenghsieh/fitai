import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  addWaterMl,
  countWaterMetDays,
  DEFAULT_DAILY_WATER_GOAL_ML,
  formatTodayWaterLine,
  isDailyWaterGoalMet,
  resetWaterMl,
  resolveDailyWaterGoalMl,
  setWaterMl,
  singleDoseNeedsConfirm,
  sumWeekWaterLiters,
  weeklyWaterTargetLiters,
  waterProgressPct,
} from './water-log'
import { buildWeekSummary } from './analytics/week-summary'
import { generateWeeklyChallenges } from './analytics/week-challenge'
import { buildAnalysisSummary } from './analytics/analysis-summary'
import { sumLoggedCalories, sumLoggedProtein } from './engines/next-meal-engine'
import type { FoodLogEntry } from './banks/types'

describe('water-log', () => {
  it('defaults daily goal to 2000 ml', () => {
    assert.equal(resolveDailyWaterGoalMl(), DEFAULT_DAILY_WATER_GOAL_ML)
  })

  it('prefers plan water target over profile default', () => {
    assert.equal(resolveDailyWaterGoalMl({ planWaterMl: 2500, profileWaterMlTarget: 1800 }), 2500)
  })

  it('falls back to profile target when plan missing', () => {
    assert.equal(resolveDailyWaterGoalMl({ profileWaterMlTarget: 2200 }), 2200)
  })

  it('adds +250 ml correctly', () => {
    assert.deepEqual(addWaterMl(500, 250), { ok: true, value: 750 })
  })

  it('adds +500 ml correctly', () => {
    assert.deepEqual(addWaterMl(1200, 500), { ok: true, value: 1700 })
  })

  it('rejects negative delta', () => {
    assert.equal(addWaterMl(100, -50).ok, false)
  })

  it('rejects negative total on set', () => {
    assert.equal(setWaterMl(-1).ok, false)
  })

  it('requires confirm for single dose above 3000 ml', () => {
    assert.equal(singleDoseNeedsConfirm(3001), true)
    assert.equal(singleDoseNeedsConfirm(3000), false)
  })

  it('does not write hydration into food_logs shape', () => {
    const logs: FoodLogEntry[] = [
      {
        id: 'a',
        name: '雞胸',
        calories: 200,
        protein_g: 30,
        logged_at: '2026-06-18T12:00:00.000Z',
        user_declared: true,
        source: 'search',
      },
    ]
    const beforeCal = sumLoggedCalories(logs)
    const beforePro = sumLoggedProtein(logs)
    const water = addWaterMl(0, 500)
    assert.equal(water.ok, true)
    assert.equal(sumLoggedCalories(logs), beforeCal)
    assert.equal(sumLoggedProtein(logs), beforePro)
    assert.equal(logs[0]?.calories, 200)
  })

  it('formats Today progress line', () => {
    assert.equal(formatTodayWaterLine(1200, 2000), '已喝 1200 / 2000 ml')
  })

  it('marks completion at 90% of target', () => {
    assert.equal(isDailyWaterGoalMet(1800, 2000), true)
    assert.equal(isDailyWaterGoalMet(1799, 2000), false)
  })

  it('computes weekly 14L target from 2000 ml/day', () => {
    assert.equal(weeklyWaterTargetLiters(2000), 14)
  })

  it('sums week water liters for Week challenge', () => {
    const liters = sumWeekWaterLiters([
      { water_ml: 2000 },
      { water_ml: 1500 },
      { water_ml: 500 },
    ])
    assert.equal(liters, 4)
  })

  it('counts water met days for Week hero', () => {
    const met = countWaterMetDays(
      [{ water_ml: 2000 }, { water_ml: 1000 }, { water_ml: 1900 }],
      2000
    )
    assert.equal(met, 2)
  })

  it('resets daily water at day boundary value', () => {
    assert.equal(resetWaterMl(), 0)
  })

  it('custom set updates total ml', () => {
    assert.deepEqual(setWaterMl(600), { ok: true, value: 600 })
  })

  it('Today water module is exported for dashboard', () => {
    assert.match(String(resolveDailyWaterGoalMl()), /2000/)
    assert.match(formatTodayWaterLine(0, 2000), /0.*2000/)
  })

  it('syncs Week challenge after logging 2000 ml today', () => {
    const targets = { calories: 1800, protein_g: 120, water_ml: 2000, target_weight_kg: 65 }
    const checkins = [
      {
        checkin_date: '2024-06-17',
        water_ml: 2000,
        workout_items: [{ completed: true }],
        notes: JSON.stringify({
          user_memory: {
            food_logs_today: [
              { id: '1', name: '餐', calories: 600, protein_g: 40, logged_at: '2024-06-17T12:00:00.000Z', user_declared: true, source: 'search' },
              { id: '2', name: '餐2', calories: 600, protein_g: 40, logged_at: '2024-06-17T13:00:00.000Z', user_declared: true, source: 'search' },
              { id: '3', name: '餐3', calories: 600, protein_g: 40, logged_at: '2024-06-17T19:00:00.000Z', user_declared: true, source: 'search' },
            ],
          },
        }),
      },
      {
        checkin_date: '2024-06-18',
        water_ml: 2000,
        workout_items: [{ completed: true }],
        notes: JSON.stringify({
          user_memory: {
            food_logs_today: [
              { id: '4', name: '餐', calories: 600, protein_g: 40, logged_at: '2024-06-18T12:00:00.000Z', user_declared: true, source: 'search' },
              { id: '5', name: '餐2', calories: 600, protein_g: 40, logged_at: '2024-06-18T13:00:00.000Z', user_declared: true, source: 'search' },
              { id: '6', name: '餐3', calories: 600, protein_g: 40, logged_at: '2024-06-18T19:00:00.000Z', user_declared: true, source: 'search' },
            ],
          },
        }),
      },
      {
        checkin_date: '2024-06-19',
        water_ml: 2000,
        workout_items: [{ completed: true }],
        notes: JSON.stringify({
          user_memory: {
            food_logs_today: [
              { id: '7', name: '餐', calories: 600, protein_g: 40, logged_at: '2024-06-19T12:00:00.000Z', user_declared: true, source: 'search' },
              { id: '8', name: '餐2', calories: 600, protein_g: 40, logged_at: '2024-06-19T13:00:00.000Z', user_declared: true, source: 'search' },
              { id: '9', name: '餐3', calories: 600, protein_g: 40, logged_at: '2024-06-19T19:00:00.000Z', user_declared: true, source: 'search' },
            ],
          },
        }),
      },
    ]
    const summary = buildWeekSummary({
      anchorDate: new Date('2024-06-19'),
      todayDate: '2024-06-19',
      measurements: [],
      checkins,
      targets,
      dayPlansByDate: {},
      workoutTarget: 4,
      fatTargetG: 60,
    })
    const waterChallenge = summary.challenges.find(c => c.id === 'water-14l')
    assert.ok(waterChallenge)
    assert.equal(waterChallenge!.current, 6)
    assert.equal(waterChallenge!.target, 14)
    assert.ok(summary.weeklyMetrics.waterMetDays >= 3)
  })

  it('generateWeeklyChallenges uses dynamic weekly water target', () => {
    const analysis = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date('2024-06-19'),
      measurements: [],
      checkins: [
        {
          checkin_date: '2024-06-17',
          water_ml: 2500,
          notes: JSON.stringify({
            user_memory: {
              food_logs_today: [
                { id: '1', name: '餐', calories: 600, protein_g: 40, logged_at: '2024-06-17T12:00:00.000Z', user_declared: true, source: 'search' },
                { id: '2', name: '餐2', calories: 600, protein_g: 40, logged_at: '2024-06-17T13:00:00.000Z', user_declared: true, source: 'search' },
                { id: '3', name: '餐3', calories: 600, protein_g: 40, logged_at: '2024-06-17T19:00:00.000Z', user_declared: true, source: 'search' },
              ],
            },
          }),
        },
        {
          checkin_date: '2024-06-18',
          water_ml: 2500,
          notes: JSON.stringify({
            user_memory: {
              food_logs_today: [
                { id: '4', name: '餐', calories: 600, protein_g: 40, logged_at: '2024-06-18T12:00:00.000Z', user_declared: true, source: 'search' },
                { id: '5', name: '餐2', calories: 600, protein_g: 40, logged_at: '2024-06-18T13:00:00.000Z', user_declared: true, source: 'search' },
                { id: '6', name: '餐3', calories: 600, protein_g: 40, logged_at: '2024-06-18T19:00:00.000Z', user_declared: true, source: 'search' },
              ],
            },
          }),
        },
        {
          checkin_date: '2024-06-19',
          water_ml: 2500,
          notes: JSON.stringify({
            user_memory: {
              food_logs_today: [
                { id: '7', name: '餐', calories: 600, protein_g: 40, logged_at: '2024-06-19T12:00:00.000Z', user_declared: true, source: 'search' },
                { id: '8', name: '餐2', calories: 600, protein_g: 40, logged_at: '2024-06-19T13:00:00.000Z', user_declared: true, source: 'search' },
                { id: '9', name: '餐3', calories: 600, protein_g: 40, logged_at: '2024-06-19T19:00:00.000Z', user_declared: true, source: 'search' },
              ],
            },
          }),
        },
      ],
      targets: { calories: 1800, protein_g: 120, water_ml: 2500, target_weight_kg: 65 },
    })
    assert.equal(analysis.insufficient_data, false)
    const challenges = generateWeeklyChallenges(
      analysis,
      {
        calorieMetDays: 1,
        calorieTotalDays: 7,
        proteinMetDays: 1,
        proteinTotalDays: 7,
        workoutCompleted: 1,
        workoutTarget: 4,
        waterMetDays: 1,
        waterTotalDays: 1,
        waterTotalLiters: 2.5,
        dinnerUnder700Days: 0,
      },
      2500
    )
    const water = challenges.find(c => c.id === 'water-14l')
    assert.equal(water?.target, 17.5)
    assert.equal(water?.label, '喝水 17.5L')
  })

  it('buildAnalysisSummary keeps water separate from calories', () => {
    const analysis = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date('2024-06-20'),
      measurements: [],
      checkins: [{ checkin_date: '2024-06-20', water_ml: 2500 }],
      targets: { calories: 1800, protein_g: 120, water_ml: 2000, target_weight_kg: 65 },
    })
    assert.equal(analysis.calorieTrend.average, null)
    assert.equal(analysis.dietRecordSummary.waterMetDays, 1)
  })

  it('progress bar reaches 100% at target', () => {
    assert.equal(waterProgressPct(2000, 2000), 100)
    assert.equal(waterProgressPct(2500, 2000), 100)
  })
})
