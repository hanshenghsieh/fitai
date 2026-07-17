import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import type { FoodLogEntry } from '@/lib/banks/types'
import {
  buildRecordDayView,
  extractAllFoodLogs,
  type RecordCheckinRow,
} from '@/lib/record/record-page-data'
import {
  enqueueCheckinMutation,
  readOfflineMutationsForUser,
} from '@/lib/offline-mutation-queue'
import { foodLogNutritionDayKey } from '@/lib/nutrition-day-food-logs'
import { loggedAtForNutritionDate } from '@/lib/timezone'
import { todayActionContextFromSearch } from '@/lib/today-actions'

const root = new URL('../../', import.meta.url)
const source = (path: string) => readFileSync(new URL(path, root), 'utf8')

function historicalLog(id = 'RECORD_DATE_TEST_001'): FoodLogEntry {
  return {
    id,
    name: id,
    calories: 320,
    protein_g: 24,
    carbs_g: 31,
    fat_g: 9,
    slot: 'meal1',
    logged_at: loggedAtForNutritionDate(
      '2026-07-16',
      'meal1',
      new Date('2026-07-17T04:00:00.000Z')
    ),
    user_declared: true,
    source: 'free_text',
  }
}

function withMockStorage(run: () => void): void {
  const values = new Map<string, string>()
  const previousWindow = globalThis.window
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
        key: (index: number) => [...values.keys()][index] ?? null,
        get length() {
          return values.size
        },
      },
      dispatchEvent: () => true,
    },
  })
  try {
    run()
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: previousWindow,
    })
  }
}

describe('RECORD-DATE-002 real persistence contract', () => {
  it('queues the historical save with selectedDate as nutritionDate', () => {
    withMockStorage(() => {
      const log = historicalLog()
      enqueueCheckinMutation({
        userId: 'record-date-002-user',
        nutritionDate: '2026-07-16',
        payload: {
          notes_patch: { user_memory: { food_logs_today: [log] } },
        },
      })
      const entry = readOfflineMutationsForUser('record-date-002-user')[0]
      assert.equal(entry?.nutritionDate, '2026-07-16')
      assert.equal(
        entry?.payload.notes_patch?.user_memory?.food_logs_today?.[0]?.logged_at,
        log.logged_at
      )
    })
  })

  it('persists logged_at on the selected Taipei date and breakfast slot', () => {
    const log = historicalLog()
    assert.equal(foodLogNutritionDayKey(log), '2026-07-16')
    assert.equal(log.slot, 'meal1')
    assert.equal(log.logged_at, '2026-07-16T00:00:00.000Z')
  })

  it('server contract upserts the selected nutrition/checkin date', () => {
    const route = source('src/app/api/checkin/route.ts')
    assert.match(route, /const checkinDate = parsed\.contract\?\.nutritionDate/)
    assert.match(route, /checkin_date:\s*checkinDate/)
    assert.match(route, /nutrition_date:\s*parsed\.contract\.nutritionDate/)
  })

  it('refresh loader keeps the persisted row only on the historical day', () => {
    const log = historicalLog()
    const rows: RecordCheckinRow[] = [
      {
        checkin_date: '2026-07-16',
        notes: JSON.stringify({ user_memory: { food_logs_today: [log] } }),
      },
      {
        checkin_date: '2026-07-17',
        notes: JSON.stringify({ user_memory: { food_logs_today: [] } }),
      },
    ]
    const loaded = extractAllFoodLogs(rows)
    const yesterday = buildRecordDayView(
      '2026-07-16',
      '2026-07-17',
      loaded,
      {},
      { calories: 2000, protein_g: 120 },
      false
    )
    const today = buildRecordDayView(
      '2026-07-17',
      '2026-07-17',
      loaded,
      {},
      { calories: 2000, protein_g: 120 },
      false
    )
    assert.deepEqual(yesterday.meals[0]?.logs.map(item => item.id), [log.id])
    assert.equal(today.meals.flatMap(group => group.logs).some(item => item.id === log.id), false)
  })

  it('rejects a Record URL with missing targetDate instead of defaulting today', () => {
    assert.deepEqual(
      todayActionContextFromSearch('record=1&targetMealSlot=breakfast'),
      {
        intent: 'record',
        targetDate: undefined,
        targetMealSlot: 'breakfast',
        source: 'record',
      }
    )
    const home = source('src/components/dashboard/BetterBitHome.tsx')
    assert.match(home, /source === 'record' && !requestedTargetDate/)
    assert.match(home, /missing-target-date/)
  })

  it('allows only global capture events to default to today', () => {
    const todayOs = source('src/components/dashboard/TodayOS.tsx')
    assert.match(todayOs, /targetDate:\s*detail\?\.targetDate \?\? getNutritionDayKey\(\)/)
    assert.match(todayOs, /source:\s*detail\?\.source \?\? 'global'/)
    assert.match(todayOs, /context\.source === 'record'/)
    assert.match(todayOs, /record-target-date-missing/)
  })

  it('preserves Record context across P0 and estimate child-sheet transitions', () => {
    const todayOs = source('src/components/dashboard/TodayOS.tsx')
    assert.doesNotMatch(
      todayOs,
      /setP0PortionFood\(food\)[\s\S]{0,120}closeMore\(\)/
    )
    assert.match(
      todayOs,
      /setP0PortionFood\(food\)[\s\S]{0,120}setMoreOpen\(false\)/
    )
    assert.match(todayOs, /setEstimateQuery\(q\)[\s\S]{0,80}setMoreOpen\(false\)/)
  })

  it('uses one targetDate for photo, text, recommendation and pending confirmation', () => {
    const todayOs = source('src/components/dashboard/TodayOS.tsx')
    assert.match(todayOs, /applyCaptureContext\(contextFromEvent\(event\)\)/g)
    assert.match(todayOs, /recommendation-log-commit/)
    assert.match(
      todayOs,
      /pendingEntry[\s\S]*logged_at:\s*loggedAtForNutritionDate\(captureTargetDate, activeSlot\)/
    )
    assert.match(todayOs, /loggedAtLocalDate:\s*getNutritionDayKey/)
  })
})
