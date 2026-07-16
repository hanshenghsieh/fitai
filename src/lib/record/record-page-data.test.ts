import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { FoodLogEntry } from '@/lib/banks/types'
import { foodLogNutritionDayKey } from '@/lib/nutrition-day-food-logs'
import { formatTaipeiTime } from '@/lib/timezone'
import {
  buildMealGroups,
  compareRecordFoodLogsByTime,
  formatRecordMealTime,
  type RecordMealBucket,
} from '@/lib/record/record-page-data'

function log(
  id: string,
  loggedAt: string,
  slot?: FoodLogEntry['slot']
): FoodLogEntry {
  return {
    id,
    name: id,
    calories: 100,
    protein_g: 10,
    carbs_g: 10,
    fat_g: 5,
    logged_at: loggedAt,
    slot,
    user_declared: true,
    source: 'search',
    capture_status: 'resolved',
    nutrition_status: 'official',
  }
}

function groupFor(logEntry: FoodLogEntry): RecordMealBucket {
  const group = buildMealGroups([logEntry]).find(row => row.logs.length > 0)
  assert.ok(group)
  return group.bucket
}

describe('Record Taipei meal time and nutrition day', () => {
  for (const [clock, expectedDay] of [
    ['00:00', '2026-07-14'],
    ['04:59', '2026-07-14'],
    ['05:00', '2026-07-15'],
    ['10:49', '2026-07-15'],
    ['23:59', '2026-07-15'],
  ] as const) {
    it(`${clock} displays Taipei time and resolves its nutrition day`, () => {
      const entry = log(clock, `2026-07-15T${clock}:00+08:00`)
      assert.equal(formatTaipeiTime(entry.logged_at), clock)
      assert.equal(formatRecordMealTime([entry]), clock)
      assert.equal(foodLogNutritionDayKey(entry), expectedDay)
    })
  }

  it('groups late-night logs as before_sleep', () => {
    for (const clock of ['00:00', '04:59', '23:59']) {
      const entry = log(clock, `2026-07-15T${clock}:00+08:00`)
      assert.equal(groupFor(entry), 'before_sleep')
    }
  })

  it('honors every Today meal slot', () => {
    const cases: Array<[FoodLogEntry['slot'], RecordMealBucket]> = [
      ['meal1', 'breakfast'],
      ['meal2', 'lunch'],
      ['meal3', 'dinner'],
      ['before_sleep', 'before_sleep'],
      ['other', 'snack'],
    ]
    for (const [slot, expectedBucket] of cases) {
      assert.equal(groupFor(log(String(slot), '2026-07-15T12:00:00+08:00', slot)), expectedBucket)
    }
  })

  it('sorts mixed-offset timestamps by epoch', () => {
    const earlier = log('earlier', '2026-07-15T08:00:00+08:00', 'meal1')
    const later = log('later', '2026-07-15T01:00:00Z', 'meal1')
    const sorted = [later, earlier].sort(compareRecordFoodLogsByTime)
    assert.deepEqual(sorted.map(entry => entry.id), ['earlier', 'later'])
  })
})
