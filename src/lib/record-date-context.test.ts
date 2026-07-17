import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import type { FoodLogEntry } from '@/lib/banks/types'
import {
  foodSlotForCaptureLabel,
  recordCaptureHref,
  targetMealSlotForCaptureLabel,
  todayActionContextFromSearch,
} from '@/lib/today-actions'
import {
  getNutritionDayKey,
  loggedAtForNutritionDate,
} from '@/lib/timezone'
import { mergeCapturedFoodLogsForDate } from '@/lib/record/mutate-today-food-log'
import {
  enqueueCheckinMutation,
  readOfflineMutationsForUser,
} from '@/lib/offline-mutation-queue'

const root = new URL('../../', import.meta.url)
const source = (path: string) => readFileSync(new URL(path, root), 'utf8')

function log(id: string, date: string, slot: FoodLogEntry['slot']): FoodLogEntry {
  return {
    id,
    name: id,
    calories: 300,
    protein_g: 20,
    carbs_g: 30,
    fat_g: 10,
    slot,
    logged_at: loggedAtForNutritionDate(date, slot, new Date('2026-07-17T04:00:00Z')),
    user_declared: true,
    source: 'free_text',
  }
}

function withMockStorage(run: () => void): void {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size
    },
  }
  const previousWindow = globalThis.window
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: storage, dispatchEvent: () => true },
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

describe('RECORD-DATE-001 targetDate contract', () => {
  it('carries selected date and meal slot through the dashboard action URL', () => {
    const href = recordCaptureHref({
      targetDate: '2026-07-14',
      targetMealSlot: 'breakfast',
    })
    assert.deepEqual(todayActionContextFromSearch(href.split('?')[1] ?? ''), {
      intent: 'record',
      targetDate: '2026-07-14',
      targetMealSlot: 'breakfast',
      source: 'record',
    })
    assert.match(href, /targetMealSlot=breakfast/)
    assert.doesNotMatch(href, /[?&]slot=/)
  })

  it('supports the complete targetMealSlot contract', () => {
    const cases = [
      ['breakfast', 'meal1'],
      ['lunch', 'meal2'],
      ['dinner', 'meal3'],
      ['late_snack', 'before_sleep'],
      ['snack', 'other'],
    ] as const

    for (const [targetMealSlot, foodSlot] of cases) {
      assert.equal(targetMealSlotForCaptureLabel(targetMealSlot), targetMealSlot)
      assert.equal(foodSlotForCaptureLabel(targetMealSlot), foodSlot)
    }
  })

  it('keeps historical timestamps on the requested Taipei nutrition date', () => {
    const timestamp = loggedAtForNutritionDate(
      '2026-07-14',
      'meal1',
      new Date('2026-07-15T16:30:00Z')
    )
    assert.equal(getNutritionDayKey(new Date(timestamp)), '2026-07-14')
    assert.equal(timestamp, '2026-07-14T00:00:00.000Z')
  })

  it('uses the real instant when targetDate is the current nutrition date', () => {
    const now = new Date('2026-07-17T04:34:56.000Z')
    assert.equal(getNutritionDayKey(now), '2026-07-17')
    assert.equal(loggedAtForNutritionDate('2026-07-17', 'meal2', now), now.toISOString())
  })

  it('merges only entries that belong to the requested historical date', () => {
    const yesterday = log('yesterday-breakfast', '2026-07-14', 'meal1')
    const today = log('today-lunch', '2026-07-17', 'meal2')
    const merged = mergeCapturedFoodLogsForDate([], [yesterday, today], '2026-07-14')
    assert.deepEqual(merged.map(item => item.id), ['yesterday-breakfast'])
    assert.equal(merged[0]?.slot, 'meal1')
  })

  it('keeps historical and today mutations in separate durable queue entries', () => {
    withMockStorage(() => {
      enqueueCheckinMutation({
        userId: 'record-date-user',
        nutritionDate: '2026-07-14',
        payload: {
          notes_patch: { user_memory: { food_logs_today: [log('historical', '2026-07-14', 'meal1')] } },
        },
      })
      enqueueCheckinMutation({
        userId: 'record-date-user',
        nutritionDate: '2026-07-17',
        payload: {
          notes_patch: { user_memory: { food_logs_today: [log('today', '2026-07-17', 'meal2')] } },
        },
      })
      const entries = readOfflineMutationsForUser('record-date-user')
      assert.deepEqual(entries.map(entry => entry.nutritionDate).sort(), [
        '2026-07-14',
        '2026-07-17',
      ])
      assert.equal(new Set(entries.map(entry => entry.idempotencyKey)).size, 2)
    })
  })

  it('wires photo, text, recommendation and pending confirmation to targetDate', () => {
    const actionSheet = source('src/components/dashboard/today/RecordActionSheet.tsx')
    const todayOs = source('src/components/dashboard/TodayOS.tsx')
    const home = source('src/components/dashboard/BetterBitHome.tsx')
    const record = source('src/components/record/RecordV2Screen.tsx')

    assert.match(record, /recordCaptureHref\(\{[\s\S]*targetDate:\s*selectedDate/)
    assert.match(actionSheet, /onSelect\(\{ targetDate, targetMealSlot, source: captureSource \}\)/)
    assert.match(todayOs, /loggedAtForNutritionDate\([\s\S]*captureTargetDate/)
    assert.match(todayOs, /targetDate:\s*captureTargetDate/g)
    assert.match(todayOs, /targetMealSlot:\s*targetMealSlotForFoodSlot\(/)
    assert.match(todayOs, /closePhotoSheet[\s\S]*clearCaptureContext\(\)/)
    assert.match(todayOs, /const closeMore[\s\S]*clearCaptureContext\(\)/)
    assert.match(
      todayOs,
      /pendingEntry[\s\S]*logged_at:\s*loggedAtForNutritionDate\(captureTargetDate, activeSlot\)/
    )
    assert.match(home, /patchFoodLogsForDate\([\s\S]*context\.targetDate/)
    assert.match(home, /historicalLogDatesRef/)
    assert.match(home, /payload\.targetDate !== trackedDayKey/)
  })
})
