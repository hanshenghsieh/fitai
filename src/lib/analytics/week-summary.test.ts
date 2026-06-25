import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildWeekSummary } from './week-summary'
import {
  calculateDayScore,
  calculateWeekScore,
  scoreSignal,
  todayStatusFromScore,
  weekScoreLabel,
} from './week-score'
import { generateWeeklyInsights } from './week-insights'
import { generateWeeklyChallenges } from './week-challenge'
import { generateMealStrategy } from './week-meal-strategy'
import { generateWorkoutStrategy } from './week-workout-strategy'
import { buildAnalysisSummary } from './analysis-summary'
import type { AnalysisCheckinRow } from './analysis-summary'
import { buildDayFacts } from './analytics-helpers'
import { WEEK_GOAL_SCORE, WEEK_SCORE_WEIGHTS, DAY_SCORE_WEIGHTS } from './week-constants'

const targets = { calories: 1800, protein_g: 120, water_ml: 2000, target_weight_kg: 65 }

function mealCheckins(days: Record<string, number>): AnalysisCheckinRow[] {
  return Object.entries(days).map(([date, count]) => ({
    checkin_date: date,
    notes: JSON.stringify({
      user_memory: {
        food_logs_today: Array.from({ length: count }, (_, i) => ({
          id: `${date}-${i}`,
          name: i === 0 ? '雞胸' : '沙拉',
          calories: 500,
          protein_g: 40,
          logged_at: `${date}T12:00:00.000Z`,
          user_declared: true,
          source: 'search',
          slot: 'lunch',
        })),
      },
    }),
    water_ml: 2100,
    workout_items: [{ completed: true }],
  }))
}

describe('week-score weights', () => {
  it('week weights sum to 1', () => {
    const sum = Object.values(WEEK_SCORE_WEIGHTS).reduce((a, b) => a + b, 0)
    assert.ok(Math.abs(sum - 1) < 0.001)
  })
  it('day weights sum to 1', () => {
    const sum = Object.values(DAY_SCORE_WEIGHTS).reduce((a, b) => a + b, 0)
    assert.ok(Math.abs(sum - 1) < 0.001)
  })
})

describe('scoreSignal', () => {
  it('green >= 80', () => assert.equal(scoreSignal(84), 'green'))
  it('yellow 60-79', () => assert.equal(scoreSignal(72), 'yellow'))
  it('red < 60', () => assert.equal(scoreSignal(58), 'red'))
  it('neutral null', () => assert.equal(scoreSignal(null), 'neutral'))
})

describe('todayStatusFromScore', () => {
  it('Good >= 80', () => assert.equal(todayStatusFromScore(85), 'Good'))
  it('Warning 60-79', () => assert.equal(todayStatusFromScore(72), 'Warning'))
  it('Need Improve < 60', () => assert.equal(todayStatusFromScore(55), 'Need Improve'))
})

describe('calculateWeekScore', () => {
  it('perfect week near 100', () => {
    const r = calculateWeekScore({
      calorieMetDays: 7,
      calorieLoggedDays: 7,
      proteinMetDays: 7,
      proteinLoggedDays: 7,
      workoutCompleted: 4,
      workoutTarget: 4,
      waterMetDays: 7,
      waterLoggedDays: 7,
      consistencyDays: 7,
      totalDays: 7,
      weightDeltaKg: -0.5,
    })
    assert.ok(r.score >= 90)
    assert.equal(r.goalScore, WEEK_GOAL_SCORE)
  })
  it('poor week below 60', () => {
    const r = calculateWeekScore({
      calorieMetDays: 1,
      calorieLoggedDays: 7,
      proteinMetDays: 1,
      proteinLoggedDays: 7,
      workoutCompleted: 0,
      workoutTarget: 4,
      waterMetDays: 1,
      waterLoggedDays: 7,
      consistencyDays: 2,
      totalDays: 7,
      weightDeltaKg: 0.5,
    })
    assert.ok(r.score < 60)
  })
  it('label matches score band', () => {
    assert.match(weekScoreLabel(82), /還不錯|很棒/)
  })
})

describe('calculateDayScore', () => {
  const baseFacts = buildDayFacts(
    '2024-06-18',
    [
      {
        id: '1',
        name: '雞胸',
        calories: 1700,
        protein_g: 115,
        fat_g: 45,
        logged_at: '2024-06-18T12:00:00.000Z',
        user_declared: true,
        source: 'search',
        slot: 'lunch',
      },
      {
        id: '2',
        name: '花椰菜',
        calories: 80,
        protein_g: 5,
        fat_g: 2,
        logged_at: '2024-06-18T19:00:00.000Z',
        user_declared: true,
        source: 'search',
        slot: 'dinner',
      },
    ],
    { checkin_date: '2024-06-18', water_ml: 2100, workout_items: [{ completed: true }] }
  )

  it('good day scores green', () => {
    const r = calculateDayScore({
      facts: baseFacts,
      targets: { ...targets, fat_g: 60 },
      isFuture: false,
      isToday: true,
    })
    assert.ok(r.score != null && r.score >= 80)
    assert.equal(r.signal, 'green')
    assert.equal(r.todayStatus, 'Good')
  })
  it('future day has null score', () => {
    const r = calculateDayScore({
      facts: baseFacts,
      targets: { ...targets, fat_g: 60 },
      isFuture: true,
      isToday: false,
    })
    assert.equal(r.score, null)
  })
  it('sugar drink lowers score', () => {
    const facts = buildDayFacts(
      '2024-06-18',
      [
        {
          id: '1',
          name: '珍奶全糖',
          calories: 1800,
          protein_g: 5,
          logged_at: '2024-06-18T15:00:00.000Z',
          user_declared: true,
          source: 'search',
        },
      ],
      undefined
    )
    const r = calculateDayScore({
      facts,
      targets: { ...targets, fat_g: 60 },
      isFuture: false,
      isToday: false,
    })
    assert.ok(r.score != null && r.score < 60)
  })
})

describe('generateWeeklyInsights', () => {
  it('returns empty when insufficient', () => {
    const s = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date('2024-06-18'),
      measurements: [],
      checkins: [],
      targets,
    })
    assert.deepEqual(generateWeeklyInsights(s), [])
  })
  it('max 3 insights', () => {
    const checkins = mealCheckins({
      '2024-06-17': 3,
      '2024-06-18': 3,
      '2024-06-19': 3,
    })
    const s = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date('2024-06-18'),
      measurements: [],
      checkins,
      targets,
    })
    assert.ok(generateWeeklyInsights(s).length <= 3)
  })
})

describe('generateMealStrategy', () => {
  it('empty when insufficient', () => {
    const s = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date(),
      measurements: [],
      checkins: [],
      targets,
    })
    assert.deepEqual(generateMealStrategy(s), [])
  })
  it('dinner reduction when ratio high', () => {
    const s = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date('2024-06-18'),
      measurements: [],
      checkins: mealCheckins({
        '2024-06-17': 3,
        '2024-06-18': 3,
        '2024-06-19': 3,
      }),
      targets,
    })
    s.dinnerCaloriesRatio = 0.48
    const rows = generateMealStrategy(s)
    const dinner = rows.find(r => r.slot === 'dinner')
    assert.ok(dinner?.instruction.includes('150') || dinner?.instruction.includes('600'))
  })
})

describe('generateWorkoutStrategy', () => {
  it('suggests zone2 when calories high', () => {
    const s = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date('2024-06-18'),
      measurements: [],
      checkins: mealCheckins({ '2024-06-17': 3, '2024-06-18': 3, '2024-06-19': 3 }),
      targets,
    })
    s.calorieTrend.average = 2100
    const cardio = generateWorkoutStrategy(s).find(r => r.type === 'cardio')
    assert.match(cardio?.instruction ?? '', /Zone 2|有氧/)
  })
  it('lowers strength when protein low', () => {
    const s = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date('2024-06-18'),
      measurements: [],
      checkins: mealCheckins({ '2024-06-17': 3, '2024-06-18': 3, '2024-06-19': 3 }),
      targets,
    })
    s.proteinGapAvg = 25
    const strength = generateWorkoutStrategy(s).find(r => r.type === 'strength')
    assert.match(strength?.instruction ?? '', /降低|低中/)
  })
})

describe('generateWeeklyChallenges', () => {
  it('generates 4 challenges', () => {
    const s = buildAnalysisSummary({
      periodType: 'week',
      anchorDate: new Date('2024-06-18'),
      measurements: [],
      checkins: mealCheckins({ '2024-06-17': 3, '2024-06-18': 3, '2024-06-19': 3 }),
      targets,
    })
    const metrics = {
      calorieMetDays: 5,
      calorieTotalDays: 7,
      proteinMetDays: 4,
      proteinTotalDays: 7,
      workoutCompleted: 3,
      workoutTarget: 4,
      waterMetDays: 6,
      waterTotalDays: 7,
      waterTotalLiters: 12,
      dinnerUnder700Days: 4,
    }
    assert.equal(generateWeeklyChallenges(s, metrics).length, 4)
  })
})

describe('buildWeekSummary', () => {
  it('empty state when < 3 meals', () => {
    const s = buildWeekSummary({
      anchorDate: new Date('2024-06-18'),
      todayDate: '2024-06-18',
      measurements: [],
      checkins: mealCheckins({ '2024-06-18': 2 }),
      targets,
    })
    assert.equal(s.insufficient_data, true)
    assert.equal(s.weekScore, null)
  })
  it('returns 7 daily cards', () => {
    const s = buildWeekSummary({
      anchorDate: new Date('2024-06-18'),
      todayDate: '2024-06-20',
      measurements: [],
      checkins: mealCheckins({
        '2024-06-17': 3,
        '2024-06-18': 3,
        '2024-06-19': 3,
        '2024-06-20': 3,
      }),
      targets,
    })
    assert.equal(s.dailyScores.length, 7)
  })
  it('future days have null score', () => {
    const s = buildWeekSummary({
      anchorDate: new Date('2024-06-18'),
      todayDate: '2024-06-18',
      measurements: [],
      checkins: mealCheckins({ '2024-06-17': 3, '2024-06-18': 3, '2024-06-19': 3 }),
      targets,
    })
    const future = s.dailyScores.filter(d => d.isFuture)
    assert.ok(future.every(d => d.score == null))
  })
  it('weekScore from analysis not hardcoded', () => {
    const s = buildWeekSummary({
      anchorDate: new Date('2024-06-18'),
      todayDate: '2024-06-20',
      measurements: [],
      checkins: mealCheckins({
        '2024-06-17': 3,
        '2024-06-18': 3,
        '2024-06-19': 3,
        '2024-06-20': 3,
      }),
      targets,
      workoutTarget: 4,
    })
    assert.ok(s.weekScore != null)
    assert.ok(s.weekScore.score >= 0 && s.weekScore.score <= 100)
  })
  it('best and worst day derived from daily scores', () => {
    const s = buildWeekSummary({
      anchorDate: new Date('2024-06-18'),
      todayDate: '2024-06-20',
      measurements: [],
      checkins: mealCheckins({
        '2024-06-17': 3,
        '2024-06-18': 3,
        '2024-06-19': 3,
        '2024-06-20': 3,
      }),
      targets,
    })
    if (s.bestDay && s.worstDay) {
      assert.ok(s.bestDay.score >= s.worstDay.score)
    }
  })
  it('meal and workout strategy from analysis', () => {
    const s = buildWeekSummary({
      anchorDate: new Date('2024-06-18'),
      todayDate: '2024-06-20',
      measurements: [],
      checkins: mealCheckins({
        '2024-06-17': 3,
        '2024-06-18': 3,
        '2024-06-19': 3,
      }),
      targets,
    })
    assert.equal(s.mealStrategy.length, 4)
    assert.equal(s.workoutStrategy.length, 4)
  })
  it('insights max 3', () => {
    const s = buildWeekSummary({
      anchorDate: new Date('2024-06-18'),
      todayDate: '2024-06-20',
      measurements: [],
      checkins: mealCheckins({
        '2024-06-17': 3,
        '2024-06-18': 3,
        '2024-06-19': 3,
        '2024-06-20': 3,
      }),
      targets,
    })
    assert.ok(s.insights.length <= 3)
  })
  it('today card flagged', () => {
    const s = buildWeekSummary({
      anchorDate: new Date('2024-06-18'),
      todayDate: '2024-06-18',
      measurements: [],
      checkins: mealCheckins({ '2024-06-17': 3, '2024-06-18': 3, '2024-06-19': 3 }),
      targets,
    })
    const today = s.dailyScores.find(d => d.isToday)
    assert.ok(today)
  })
})

describe('loading and empty semantics', () => {
  it('insufficient reason present', () => {
    const s = buildWeekSummary({
      anchorDate: new Date(),
      todayDate: formatToday(),
      measurements: [],
      checkins: [],
      targets,
    })
    assert.ok(s.insufficient_reason?.includes('3'))
  })
})

function formatToday() {
  return new Date().toISOString().slice(0, 10)
}
