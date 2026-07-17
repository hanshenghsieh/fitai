import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import type { CalorieBankRow } from '@/lib/banks/calorie-bank-types'
import { previewSpreadDays } from '@/lib/calorie-bank-v2-ui'
import {
  computeRecoveryWindow,
  distributeRecoveryBalance,
} from '@/lib/engines/calorie-bank-engine'
import { computeTodayMealState } from '@/lib/engines/next-meal-engine'
import { dishFitsRemainingNutrition } from '@/lib/recommendation/dish-first/score'
import type { DishTemplate } from '@/lib/recommendation/dish-first/types'
import {
  fitAdjustablePortionsToBudget,
} from '@/lib/recommendation/v2/engine'
import { pickRecommendationWithFallback } from '@/lib/recommendation/v2/reason-copy'
import { scoreMealForUserToday } from '@/lib/recommendation/v2/score-meal'
import type {
  RecommendationFoodV2,
  UserNutritionState,
} from '@/lib/recommendation/v2/types'
import { applyCalorieBankUserPrefs } from '@/lib/settings/calorie-bank-user-prefs'
import type { UserSettingsPreferences } from '@/lib/settings/user-settings-types'

const root = new URL('../../', import.meta.url)
const source = (path: string) => readFileSync(new URL(path, root), 'utf8')

function item(
  id: string,
  calories: number,
  protein: number,
  fat: number,
  overrides: Partial<RecommendationFoodV2> = {}
): RecommendationFoodV2 {
  return {
    id,
    brand: '測試',
    name: id,
    item_type: 'combo',
    calories,
    protein,
    fat,
    carbs: 30,
    meal_role: 'main_meal',
    portion_type: 'combo',
    meal_time: ['lunch', 'dinner'],
    venue_type: 'healthy_box',
    is_recommendable: true,
    confidence_level: 'official',
    source_type: 'official',
    source_note: '測試資料',
    tags: [],
    ...overrides,
  }
}

const nutritionState: UserNutritionState = {
  remainingCalories: 402,
  proteinGap: 72,
  remainingFat: -2,
  remainingCarbs: 50,
  mealTime: 'dinner',
  effectiveMealCalTarget: 402,
}

function bank(excess = 9): CalorieBankRow {
  return {
    user_id: 'ux-test',
    date: '2026-07-17',
    daily_target_kcal: 1800,
    internal_target_kcal: 1795,
    actual_kcal: 1800 + excess,
    delta_kcal: excess,
    running_balance_kcal: -excess,
    recovery_balance_kcal: excess,
    spread_days_remaining: 2,
    daily_adjust_kcal: -5,
  }
}

describe('UX-REC-CBANK-001 long press contract', () => {
  it('uses 800ms while preserving movement cancellation and pointer cleanup', () => {
    const overview = source('src/components/betterbit-v2/V2MealOverviewPanel.tsx')
    assert.match(overview, /const LONG_PRESS_MS = 800/)
    assert.match(overview, /const MOVE_CANCEL_PX = 12/)
    assert.match(overview, /Math\.hypot\(dx, dy\) > MOVE_CANCEL_PX\) clearLongPress\(\)/)
    assert.match(overview, /onPointerUp=\{handlePointerUp\}/)
    assert.match(overview, /onPointerCancel=\{handlePointerUp\}/)
  })
})

describe('UX-REC-CBANK-001 precise recommendations', () => {
  it('derives live remaining calories and macros from the same Today logs', () => {
    const state = computeTodayMealState({
      todayFoodLogs: [{
        id: 'today',
        name: '已吃餐點',
        calories: 1398,
        protein_g: 48,
        fat_g: 62,
        carbs_g: 130,
        logged_at: '2026-07-17T04:00:00.000Z',
        user_declared: true,
        source: 'search',
      }],
      normalTargetKcal: 1800,
      internalTargetKcal: 1800,
      proteinTargetG: 120,
      fatTargetG: 60,
      carbsTargetG: 180,
    })
    assert.equal(state.remainingCalories, 402)
    assert.equal(state.proteinGap, 72)
    assert.equal(state.remainingFat, -2)
    assert.equal(state.remainingCarbs, 50)
  })

  it('hard-excludes 580/620/800 kcal candidates from a 402 kcal budget', () => {
    for (const calories of [580, 620, 800]) {
      const scored = scoreMealForUserToday({
        item: item(`meal-${calories}`, calories, 35, 18),
        ...nutritionState,
        recentlyShownIds: [],
      })
      assert.equal(scored.excluded, true)
      assert.equal(scored.excludeReason, 'over_remaining_calories')
    }
  })

  it('prioritizes high-protein low-fat food when fat is already over target', () => {
    const result = pickRecommendationWithFallback(
      [
        item('低蛋白餐', 350, 10, 10),
        item('低脂雞胸', 360, 48, 7, { tags: ['高蛋白', '低脂'] }),
      ],
      nutritionState,
      []
    )
    assert.equal(result?.primary.id, '低脂雞胸')
  })

  it('shows an explicit adjusted portion only for portionable single foods', () => {
    const adjusted = fitAdjustablePortionsToBudget(
      [item('雞胸單品', 500, 50, 10, {
        item_type: 'single',
        portion_type: 'single_main',
      })],
      nutritionState
    )[0]!
    assert.equal(adjusted.calories, 400)
    assert.match(adjusted.name, /建議 80% 份量/)
    assert.ok(adjusted.calories <= nutritionState.remainingCalories)
  })

  it('returns a safe empty state when every complete candidate is ineligible', () => {
    const result = pickRecommendationWithFallback(
      [item('高脂大餐', 800, 40, 45)],
      nutritionState,
      []
    )
    assert.equal(result, null)
  })

  it('does not treat missing nutrition as a precise recommendation', () => {
    const scored = scoreMealForUserToday({
      item: item('缺脂肪資料', 300, 30, Number.NaN),
      ...nutritionState,
      recentlyShownIds: [],
    })
    assert.equal(scored.excluded, true)
    assert.equal(scored.excludeReason, 'missing_nutrition')
  })

  it('applies the same hard budget to dish-first recommendations', () => {
    const template: DishTemplate = {
      id: 'dish',
      name: '高脂大餐',
      foodType: 'meal',
      category: '主餐',
      aliases: [],
      tags: [],
      typicalCalories: { min: 700, mid: 800, max: 900 },
      typicalProtein: { min: 30, mid: 40, max: 50 },
      typicalFat: { min: 30, mid: 40, max: 50 },
      typicalCarbs: { min: 60, mid: 70, max: 80 },
      sourceType: 'official',
      confidence: 'high',
    }
    const day = computeTodayMealState({
      todayFoodLogs: [],
      normalTargetKcal: 402,
      proteinTargetG: 72,
      fatTargetG: -2,
      carbsTargetG: 50,
    })
    assert.equal(dishFitsRemainingNutrition(template, day), false)
  })
})

describe('UX-REC-CBANK-001 Calorie Bank', () => {
  it('does not inflate a 9 kcal debt into a fixed 100 kcal adjustment', () => {
    assert.deepEqual(computeRecoveryWindow(9), {
      spreadDays: 2,
      dailyAdjustKcal: -5,
    })
  })

  it('splits 9 kcal exactly across 3, 5, and 10 days', () => {
    assert.deepEqual(distributeRecoveryBalance(9, 3, 600), [3, 3, 3])
    assert.deepEqual(distributeRecoveryBalance(9, 5, 600), [2, 2, 2, 2, 1])
    assert.deepEqual(distributeRecoveryBalance(9, 10, 600), [1, 1, 1, 1, 1, 1, 1, 1, 1, 0])
    for (const days of [3, 5, 10] as const) {
      const rows = previewSpreadDays(bank(), days, 1200)
      assert.equal(rows.reduce((sum, row) => sum - row.adjustKcal, 0), 9)
      assert.ok(rows.every(row => row.originalKcal + row.adjustKcal === row.targetKcal))
    }
  })

  it('maps persisted 3/5/10-day preferences to distinct safe daily targets', () => {
    const daily = ([3, 5, 10] as const).map(days => {
      const prefs = {
        calorie_bank_enabled: true,
        calorie_bank_days: days,
        calorie_bank_intensity: 'standard',
      } as UserSettingsPreferences
      return applyCalorieBankUserPrefs(bank(), prefs, 1200).daily_adjust_kcal
    })
    assert.deepEqual(daily, [-3, -2, -1])
  })

  it('feeds the saved adjusted daily budget back into recommendation state', () => {
    const adjusted = applyCalorieBankUserPrefs(
      bank(),
      {
        calorie_bank_enabled: true,
        calorie_bank_days: 3,
        calorie_bank_intensity: 'standard',
      } as UserSettingsPreferences,
      1200
    )
    const state = computeTodayMealState({
      todayFoodLogs: [],
      normalTargetKcal: adjusted.daily_target_kcal,
      internalTargetKcal: adjusted.internal_target_kcal,
      proteinTargetG: 120,
      fatTargetG: 60,
      carbsTargetG: 180,
      calorieBank: adjusted,
    })
    assert.equal(adjusted.internal_target_kcal, 1797)
    assert.equal(state.todayTarget, 1797)
    assert.equal(state.remainingCalories, 1797)
  })

  it('persists the selector through existing user preferences and updates Today state', () => {
    const detail = source('src/components/betterbit-v2/CalorieBankDetailView.tsx')
    const mini = source('src/components/betterbit-v2/CalorieBankMiniCard.tsx')
    const dashboard = source('src/components/betterbit-v2/TodayV2Dashboard.tsx')
    const home = source('src/components/dashboard/BetterBitHome.tsx')
    assert.match(detail, /onSavePlan\(spreadDays\)/)
    assert.match(mini, /apiFetch\('\/api\/settings\/preferences'[\s\S]*calorie_bank_days: spreadDays/)
    assert.match(dashboard, /onPreferencesChange=\{onCalorieBankPreferencesChange\}/)
    assert.match(home, /onCalorieBankPreferencesChange=\{setUserPrefs\}/)
  })

  it('keeps the fullscreen header below one safe-top and removes the right icon', () => {
    const detail = source('src/components/betterbit-v2/CalorieBankDetailView.tsx')
    const shellCss = source('src/styles/capacitor-ios-shell.css')
    assert.match(detail, /app-fullscreen-safe-shell/)
    assert.match(detail, /variant="back"[\s\S]*onBack=\{onClose\}[\s\S]*hideRight/)
    assert.doesNotMatch(detail, /rightSlot=|<Info/)
    assert.match(shellCss, /\.app-fullscreen-safe-shell\s*\{[\s\S]*padding-top: var\(--app-safe-top\)/)
  })
})
