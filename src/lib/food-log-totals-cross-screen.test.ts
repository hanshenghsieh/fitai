import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import type { FoodLogEntry } from '@/lib/banks/types'
import type { DayPlan } from '@/types'
import {
  isFoodLogCountedTowardTotals,
  sumCountedCalories,
  sumCountedProtein,
} from './food-log-totals'
import { buildUserBanks } from './banks/build-banks'
import { sumLoggedCalories } from './engines/next-meal-engine'
import { buildMealGroups, buildRecordDayView } from './record/record-page-data'
import { buildDayFacts } from './analytics/analytics-helpers'

function readRepoFile(relativePath: string): string {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8')
}

/**
 * P0-4 fixture: a confirmed 500kcal log, a pending_confirmation 300kcal log,
 * an unknown log with no nutrition data at all, and a confirmed 200kcal log.
 * Every screen that shows "today's counted total" must sum exactly the two
 * confirmed logs (500 + 200 = 700) and never include the pending/unknown
 * ones — regardless of which of the historically-duplicated implementations
 * that screen happened to be built on.
 */
function fixedFourLogs(): FoodLogEntry[] {
  return [
    {
      id: 'confirmed-500',
      name: '雞胸便當',
      calories: 500,
      protein_g: 35,
      logged_at: '2026-07-20T08:00:00+08:00',
      user_declared: true,
      source: 'search',
      capture_status: 'resolved',
      nutrition_status: 'official',
    },
    {
      id: 'pending-300',
      name: '未確認餐點',
      calories: 300,
      protein_g: 20,
      logged_at: '2026-07-20T12:00:00+08:00',
      user_declared: true,
      source: 'search',
      capture_status: 'resolved',
      nutrition_status: 'pending_confirmation',
    },
    {
      id: 'unknown-null',
      name: '未知食物',
      calories: null,
      protein_g: null,
      logged_at: '2026-07-20T15:00:00+08:00',
      user_declared: true,
      source: 'photo',
      capture_status: 'needs_name',
      nutrition_status: 'unknown',
    },
    {
      id: 'confirmed-200',
      name: '無糖豆漿',
      calories: 200,
      protein_g: 8,
      logged_at: '2026-07-20T20:00:00+08:00',
      user_declared: true,
      source: 'search',
      capture_status: 'resolved',
      nutrition_status: 'official',
    },
  ]
}

const EXPECTED_TOTAL_KCAL = 700

describe('P0-4 cross-screen calorie-total consistency (canonical isFoodLogCountedTowardTotals)', () => {
  it('gates exactly the two confirmed logs in, and the pending/unknown logs out', () => {
    const logs = fixedFourLogs()
    assert.deepEqual(
      logs.map(isFoodLogCountedTowardTotals),
      [true, false, false, true]
    )
  })

  it('canonical sumCountedCalories/sumCountedProtein — source of truth', () => {
    const logs = fixedFourLogs()
    assert.equal(sumCountedCalories(logs), EXPECTED_TOTAL_KCAL)
    assert.equal(sumCountedProtein(logs), 43)
  })

  it('Bank screen (build-banks.ts buildUserBanks) — todayLoggedKcal must be 700, not 1000', () => {
    const todayPlan = {
      day: 1,
      date: '2026-07-20',
      meals: [],
      workout: { type: 'rest' },
      daily_targets: { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 60, water_ml: 2000 },
    } as unknown as DayPlan

    const banks = buildUserBanks(todayPlan, null, fixedFourLogs(), 0, 0)
    assert.equal(banks.calorie.todayLoggedKcal, EXPECTED_TOTAL_KCAL)
  })

  it('Today screen (next-meal-engine.ts sumLoggedCalories, feeds BetterBitHome.tsx) — must be 700, not 1000', () => {
    assert.equal(sumLoggedCalories(fixedFourLogs()), EXPECTED_TOTAL_KCAL)
  })

  it('Record screen (record-page-data.ts buildMealGroups) — sum of all meal-group totals must be 700, not 1000', () => {
    const groups = buildMealGroups(fixedFourLogs())
    const grandTotal = groups.reduce((s, g) => s + g.totalKcal, 0)
    assert.equal(grandTotal, EXPECTED_TOTAL_KCAL)
  })

  it('Record screen (record-page-data.ts buildRecordDayView) — day summary totalKcal must be 700, not 1000', () => {
    const view = buildRecordDayView(
      '2026-07-20',
      '2026-07-20',
      fixedFourLogs(),
      {},
      { calories: 2000, protein_g: 150 },
      false
    )
    assert.equal(view.summary.totalKcal, EXPECTED_TOTAL_KCAL)
  })

  it('Analysis screen (analytics-helpers.ts buildDayFacts) — day calories must be 700, not 1000', () => {
    const facts = buildDayFacts('2026-07-20', fixedFourLogs(), undefined)
    assert.equal(facts.calories, EXPECTED_TOTAL_KCAL)
  })

  it('Today screen internal adherence context (TodayOS.tsx) — regression-locked to the canonical helper via source assertion', () => {
    const source = readRepoFile('src/components/dashboard/TodayOS.tsx')
    assert.match(source, /import \{ sumCountedCalories \} from '@\/lib\/food-log-totals'/)
    assert.match(source, /const todayLogged = sumCountedCalories\(logs\)/)
  })

  it('adherence engine (adherence-detect.ts detectPlateau) — regression-locked to the canonical helper via source assertion', () => {
    const source = readRepoFile('src/lib/engines/adherence-detect.ts')
    assert.match(source, /import \{ sumCountedCalories \} from '@\/lib\/food-log-totals'/)
    assert.match(source, /const kcal = sumCountedCalories\(dayLogs\)/)
  })

  it('daily-food-score.ts calculateDailyFoodScore — regression-locked to the canonical helper via source assertion', () => {
    const source = readRepoFile('src/lib/record/daily-food-score.ts')
    assert.match(source, /import \{ sumCountedCalories, sumCountedProtein \} from '@\/lib\/food-log-totals'/)
    assert.match(source, /const calories = sumCountedCalories\(dayLogs\)/)
  })

  it('analysis-summary.ts and analysis-page-data.ts — regression-locked to the canonical helper via source assertion', () => {
    const summarySource = readRepoFile('src/lib/analytics/analysis-summary.ts')
    assert.match(summarySource, /from '@\/lib\/food-log-totals'/)
    assert.match(summarySource, /calories: sumCountedCalories\(dayLogs\)/)

    const pageDataSource = readRepoFile('src/lib/analysis/analysis-page-data.ts')
    assert.match(pageDataSource, /import \{ sumCountedCalories \} from '@\/lib\/food-log-totals'/)
    assert.match(pageDataSource, /return sumCountedCalories\(dayLogs\)/)
  })

  it('V2MealOverviewPanel.tsx (Today V2 dashboard per-slot kcal) — regression-locked to the canonical helper via source assertion', () => {
    const source = readRepoFile('src/components/betterbit-v2/V2MealOverviewPanel.tsx')
    assert.match(source, /import \{ sumCountedCalories \} from '@\/lib\/food-log-totals'/)
    assert.match(source, /const kcal = sumCountedCalories\(logs\)/)
  })
})
