/**
 * Build 38 BUG 5 — UNKNOWN != ZERO. A photo-only record whose nutrition was
 * genuinely never resolved (nutrition_status: 'unknown') displayed as a
 * confident "0 kcal / 蛋白質 0g / 脂肪 0g / 碳水 0g" on the Today
 * recommendation card, even though the Edit sheet correctly said "資料庫尚無
 * 對應食材". Root cause: logToDisplayItems()'s single-item branch checked
 * `unknown` for calories/protein_g but not carbs_g/fat_g (`?? 0`
 * unconditionally); DiceMealPreview then summed across all four fields with
 * no unknown-awareness at all. This file locks CASE numbering from the
 * fix-phase request exactly (CASE 1/2 here; CASE 3/4/5 are in
 * dice-meal-preview-unknown.test.tsx; CASE 6/7/8 are in
 * photo-compound-meal-guard.test.ts).
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { logToDisplayItems } from '@/components/dashboard/TodayOS'
import { buildFoodLogFromManualPhotoCorrection } from '@/lib/nutrition/photo-manual-correction'
import { countsTowardDailyTotals } from '@/lib/nutrition/nutrition-pending-status'
import { sumCountedCalories, sumCountedProtein } from '@/lib/food-log-totals'
import type { FoodLogEntry } from '@/lib/banks/types'

// FoodLogEntry types carbs_g/fat_g as `number | undefined`, but production
// code (e.g. finalizePhotoV2ToFoodLogPayload's unknown branch) has always
// written literal `null` for a genuinely unknown record — a pre-existing
// type/runtime mismatch, not introduced by this fix and out of scope to
// correct here. This override type matches the real runtime shape so these
// fixtures can express it.
type LogOverrides = Partial<Omit<FoodLogEntry, 'carbs_g' | 'fat_g'>> & {
  carbs_g?: number | null
  fat_g?: number | null
}

function baseLog(overrides: LogOverrides = {}): FoodLogEntry {
  return {
    id: 'log-unknown',
    name: '任意未知食物',
    calories: 100,
    protein_g: 10,
    carbs_g: 10,
    fat_g: 10,
    source: 'photo',
    slot: 'lunch',
    logged_at: new Date().toISOString(),
    user_declared: true,
    nutrition_status: 'estimated',
    ...overrides,
  } as FoodLogEntry
}

describe('Build 38 BUG 5 — CASE 1: unknown single item never fakes a literal 0', () => {
  it('a single-name (non-"+") unknown photo-only log returns null for all four macros', () => {
    const log = baseLog({
      name: '任意未知食物',
      calories: null,
      protein_g: null,
      carbs_g: null,
      fat_g: null,
      nutrition_status: 'unknown',
      capture_status: 'photo_only',
    })
    const items = logToDisplayItems(log)
    assert.equal(items.length, 1)
    assert.equal(items[0]!.calories, null)
    assert.equal(items[0]!.protein_g, null)
    assert.equal(items[0]!.carbs_g, null)
    assert.equal(items[0]!.fat_g, null)
  })
})

describe('Build 38 BUG 5 — CASE 2: known genuine zero must stay zero (UNKNOWN != ZERO is bidirectional)', () => {
  it('a real, known 0-calorie item (e.g. black coffee) is not misclassified as unknown', () => {
    const log = baseLog({
      name: '無糖黑咖啡',
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      nutrition_status: 'official',
      capture_status: 'resolved',
    })
    const items = logToDisplayItems(log)
    assert.equal(items.length, 1)
    assert.equal(items[0]!.calories, 0)
    assert.equal(items[0]!.protein_g, 0)
    assert.equal(items[0]!.carbs_g, 0)
    assert.equal(items[0]!.fat_g, 0)
    // Explicitly not null — a real zero must render as a real zero.
    assert.notEqual(items[0]!.calories, null)
  })
})

describe('Build 38 BUG 5 — CASE 9: photo-only full chain never surfaces a literal 0', () => {
  it('buildFoodLogFromManualPhotoCorrection(unknown_photo) -> logToDisplayItems keeps null throughout', () => {
    const entry = buildFoodLogFromManualPhotoCorrection(
      {
        mode: 'unknown_photo',
        label: '任意無法辨識的食物',
        category: 'unknown',
        photoAi: {
          photo_ai_original_candidates: [],
          photo_ai_detected_label: '任意無法辨識的食物',
          photo_ai_visual_category: 'unknown',
          photo_ai_category_confidence: 'low',
        },
      },
      { id: 'photo-only-1' }
    )
    assert.equal(entry.nutrition_status, 'unknown')
    assert.equal(entry.capture_status, 'photo_only')
    assert.equal(entry.calories, null)

    const items = logToDisplayItems(entry)
    assert.equal(items.length, 1)
    assert.equal(items[0]!.calories, null)
    assert.equal(items[0]!.protein_g, null)
    assert.equal(items[0]!.carbs_g, null)
    assert.equal(items[0]!.fat_g, null)
  })
})

describe('Build 38 BUG 5 — CASE 10: daily totals still exclude unknown/photo-only records', () => {
  it('countsTowardDailyTotals is false for an unknown photo-only log', () => {
    const log = baseLog({
      nutrition_status: 'unknown',
      capture_status: 'photo_only',
      calories: null,
      protein_g: null,
      carbs_g: null,
      fat_g: null,
    })
    assert.equal(countsTowardDailyTotals(log), false)
  })

  it('sumCountedCalories/sumCountedProtein skip an unknown log entirely (not add 0)', () => {
    const known = baseLog({ id: 'k1', calories: 300, protein_g: 20, nutrition_status: 'official', capture_status: 'resolved' })
    const unknown = baseLog({
      id: 'u1',
      calories: null,
      protein_g: null,
      nutrition_status: 'unknown',
      capture_status: 'photo_only',
    })
    assert.equal(sumCountedCalories([known, unknown]), 300)
    assert.equal(sumCountedProtein([known, unknown]), 20)
  })
})
