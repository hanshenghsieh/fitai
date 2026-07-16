import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { FoodLogEntry } from '@/lib/banks/types'
import { sumLoggedCalories } from '@/lib/engines/next-meal-engine'
import {
  groupTodayMealOverviewLogs,
  moveTodayMealLogSlot,
  TODAY_MEAL_OVERVIEW_SLOTS,
  visibleTodayMealLogs,
} from '@/lib/today-meal-overview'
import { buildMealGroups } from '@/lib/record/record-page-data'
import { foodLogNutritionDayKey } from '@/lib/nutrition-day-food-logs'

function beforeSleepLog(index: number): FoodLogEntry {
  return {
    id: `before-sleep-${index}`,
    name: `宵夜 ${index}`,
    calories: 100 + index,
    protein_g: 10,
    carbs_g: 10,
    fat_g: 5,
    slot: 'before_sleep',
    logged_at: `2099-06-18T0${index}:00:00+08:00`,
    user_declared: true,
    source: 'search',
    capture_status: 'resolved',
    nutrition_status: 'official',
  }
}

describe('Today meal overview visibility', () => {
  it('renders all before_sleep logs counted by macro totals', () => {
    const logs = [0, 1, 2, 3].map(beforeSleepLog)
    const grouped = groupTodayMealOverviewLogs(logs)

    assert.ok(sumLoggedCalories(logs) > 0)
    assert.equal(grouped.before_sleep.length, 4)
    assert.equal(visibleTodayMealLogs(logs).length, 4)
    assert.ok(TODAY_MEAL_OVERVIEW_SLOTS.includes('before_sleep'))
  })

  it('never has zero visible logs when input logs exist', () => {
    const logs = [beforeSleepLog(1)]
    assert.equal(visibleTodayMealLogs(logs).length, 1)
  })

  it('moves one log without changing its date, nutrition, or pending metadata', () => {
    const original: FoodLogEntry = {
      ...beforeSleepLog(1),
      logged_at: '2026-07-16T23:30:00+08:00',
      nutrition_status: 'estimated_pending_confirmation',
      capture_status: 'learning',
    }
    const beforeDay = foodLogNutritionDayKey(original)
    const beforeCalories = sumLoggedCalories([original])
    const moved = moveTodayMealLogSlot([original], original.id, 'meal1')

    assert.equal(moved.length, 1)
    assert.equal(moved[0]?.slot, 'meal1')
    assert.equal(moved[0]?.logged_at, original.logged_at)
    assert.equal(moved[0]?.nutrition_status, original.nutrition_status)
    assert.equal(moved[0]?.capture_status, original.capture_status)
    assert.equal(foodLogNutritionDayKey(moved[0]!), beforeDay)
    assert.equal(sumLoggedCalories(moved), beforeCalories)
    assert.equal(buildMealGroups(moved).find(group => group.logs.length)?.bucket, 'breakfast')
  })
})
