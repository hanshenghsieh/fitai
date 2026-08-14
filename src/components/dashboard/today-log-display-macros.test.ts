import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { logToDisplayItems } from '@/components/dashboard/TodayOS'
import type { FoodLogEntry } from '@/lib/banks/types'

/**
 * Root cause of the production "226 kcal / 蛋白質 6g・脂肪 0g・碳水 0g" bug:
 * a saved FoodLogEntry whose name contains " + " (e.g. "馬鈴薯沙拉 + 小黃瓜")
 * was split into segments and re-derived via convenience-store menu lookup
 * instead of reading the log's own already-correct calories/protein_g/
 * fat_g/carbs_g. When at least one segment had no menu match,
 * logToDisplayItems fell back to evenly dividing calories/protein_g across
 * segments via Math.round(x / names.length) and hardcoding carbs_g/fat_g to
 * 0 on every segment — DiceMealPreview then re-summed those segments,
 * silently drifting protein (5.4g -> two segments of Math.round(2.7)=3 ->
 * displayed 6g) and discarding carbs/fat entirely (51g/1g -> 0g/0g), even
 * though the Edit-meal sheet (which reads log.protein_g/fat_g/carbs_g
 * directly, see MealEditSheet.tsx:32-34) kept showing the correct values
 * for the exact same saved record.
 *
 * Fix: when menu lookup can't resolve every "+"-separated segment, the full
 * trusted aggregate is placed on exactly one segment (and 0 on the rest) —
 * DiceMealPreview never displays a segment's individual macros, only the
 * summed total, so this is a safe way to guarantee sum(segments) === the
 * log's own saved macros exactly, with no rounding/splitting drift at all.
 */

// FoodLogEntry types carbs_g/fat_g as `number | undefined`, but production
// code has always written literal `null` for a genuinely unknown record — a
// pre-existing type/runtime mismatch, not introduced by this fix.
type LogOverrides = Partial<Omit<FoodLogEntry, 'carbs_g' | 'fat_g'>> & {
  carbs_g?: number | null
  fat_g?: number | null
}

function baseLog(overrides: LogOverrides = {}): FoodLogEntry {
  return {
    id: 'log-1',
    name: '測試餐點',
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

function totalsOf(items: ReturnType<typeof logToDisplayItems>) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.calories ?? 0),
      protein: acc.protein + (item.protein_g ?? 0),
      fat: acc.fat + (item.fat_g ?? 0),
      carbs: acc.carbs + (item.carbs_g ?? 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  )
}

describe('Today recommendation-card macro conservation (logToDisplayItems)', () => {
  it('CASE 1 — 馬鈴薯沙拉 + 小黃瓜: aggregate totals must equal the saved log exactly, never 226/6/0/0', () => {
    const log = baseLog({
      name: '馬鈴薯沙拉 + 小黃瓜',
      calories: 226,
      protein_g: 5.4,
      carbs_g: 51,
      fat_g: 1,
    })
    const items = logToDisplayItems(log)
    const totals = totalsOf(items)
    assert.deepEqual(totals, { calories: 226, protein: 5.4, fat: 1, carbs: 51 })
    assert.notEqual(totals.protein, 6)
    assert.notEqual(totals.fat, 0)
    assert.notEqual(totals.carbs, 0)
  })

  it('CASE 2 — a 3-segment "+" name conserves the exact aggregate (no per-segment rounding drift)', () => {
    const log = baseLog({
      name: '雞胸肉 + 地瓜 + 花椰菜',
      calories: 337,
      protein_g: 27.3,
      carbs_g: 41.7,
      fat_g: 5.9,
    })
    const items = logToDisplayItems(log)
    assert.equal(items.length, 3)
    const totals = totalsOf(items)
    assert.deepEqual(totals, { calories: 337, protein: 27.3, fat: 5.9, carbs: 41.7 })
  })

  it('CASE 3 — a name without "+" is unaffected: still reads calories/protein_g/carbs_g/fat_g straight from the log', () => {
    const log = baseLog({
      name: '雞胸肉沙拉',
      calories: 320,
      protein_g: 28,
      carbs_g: 12,
      fat_g: 15,
    })
    const items = logToDisplayItems(log)
    assert.equal(items.length, 1)
    assert.equal(items[0]!.calories, 320)
    assert.equal(items[0]!.protein_g, 28)
    assert.equal(items[0]!.carbs_g, 12)
    assert.equal(items[0]!.fat_g, 15)
  })

  it('CASE 4 — a genuinely unresolved/pending-confirmation log never fakes 0 as a confident value (all four macros)', () => {
    const log = baseLog({
      name: '未知食物 + 未知配菜',
      calories: null,
      protein_g: null,
      carbs_g: null,
      fat_g: null,
      nutrition_status: 'unknown',
    })
    const items = logToDisplayItems(log)
    for (const item of items) {
      assert.equal(item.calories, null, 'calories must stay null, never fabricated as 0')
      assert.equal(item.protein_g, null, 'protein_g must stay null, never fabricated as 0')
      assert.equal(item.carbs_g, null, 'carbs_g must stay null, never fabricated as 0 (Build 38 BUG 5)')
      assert.equal(item.fat_g, null, 'fat_g must stay null, never fabricated as 0 (Build 38 BUG 5)')
    }
  })

  it('CASE 5 — existing golden case: when every "+"-segment resolves via menu lookup, real per-item menu macros are used (no regression)', () => {
    const log = baseLog({
      name: '泰式酸辣雞腿冷麵 + 京醬鴨絲飯',
      store: '7-11',
      calories: 869,
      protein_g: 54,
      carbs_g: 98,
      fat_g: 29,
    })
    const items = logToDisplayItems(log)
    assert.equal(items.length, 2)
    assert.equal(items[0]!.name, '泰式酸辣雞腿冷麵')
    assert.equal(items[0]!.calories, 369)
    assert.equal(items[1]!.name, '京醬鴨絲飯')
    assert.equal(items[1]!.calories, 500)
    // The resolved-menu-item branch is untouched by this fix — still returns
    // the real per-item macros directly, not the log's own aggregate.
    const totals = totalsOf(items)
    assert.equal(totals.calories, 869)
  })

  it('conservation holds even when the log has zero segments matching any menu item and macros are decimal-heavy', () => {
    const log = baseLog({
      name: '涼拌小黃瓜 + 番茄炒蛋 + 白飯',
      calories: 412,
      protein_g: 14.7,
      carbs_g: 63.2,
      fat_g: 9.1,
    })
    const items = logToDisplayItems(log)
    const totals = totalsOf(items)
    assert.deepEqual(totals, { calories: 412, protein: 14.7, fat: 9.1, carbs: 63.2 })
  })
})
