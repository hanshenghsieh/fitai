import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { collectClientCandidates, classifyClientMatchLevel } from './matcher-core'

/**
 * Task 2C — minimal nutrition Golden Set (regression protection, not a
 * claim that every Taiwanese dish has one "true" calorie count).
 *
 * Two very different kinds of entries on purpose:
 *  - Standardized single foods (eggs, rice, fruit, milk, soy milk, chicken
 *    breast): tight tolerance, because a per-100g USDA/Taiwan-FDA reference
 *    value is a real, narrow number.
 *  - Composite dishes (便當, 牛肉麵): wide tolerance ranges only — recipes
 *    vary a lot by vendor, and asserting a narrow number would be false
 *    precision the task spec explicitly warned against.
 *
 * A few items are intentionally recorded as KNOWN GAPS rather than passing
 * assertions — 御飯糰 has zero coverage in the product database, 蛋餅's Food
 * DNA template doesn't currently outrank weaker runtime-menu matches, and
 * 地瓜 collides with an unrelated product ("小菜籃有機地瓜葉"). These are
 * real, pre-existing issues outside today's two-bug fix scope; they're
 * captured here (not silently dropped) so a future fix has a test to turn
 * green, and so this file doesn't overstate what was actually fixed.
 */

interface GoldenCase {
  name: string
  query: string
  expectedFoodName: string
  minKcal: number
  maxKcal: number
  minProtein?: number
  maxProtein?: number
  sourceNote: string
}

const GOLDEN_CASES: GoldenCase[] = [
  {
    name: '雞蛋',
    query: '雞蛋',
    expectedFoodName: '雞蛋（全蛋，熟）',
    minKcal: 73,
    maxKcal: 83,
    minProtein: 5.5,
    maxProtein: 7,
    sourceNote: 'USDA FDC / Taiwan FDA — cooked whole egg, ~50g piece',
  },
  {
    name: '水煮蛋',
    query: '水煮蛋',
    expectedFoodName: '水煮蛋',
    minKcal: 73,
    maxKcal: 83,
    sourceNote: 'Same reference as cooked whole egg',
  },
  {
    name: '茶葉蛋',
    query: '茶葉蛋',
    expectedFoodName: '茶葉蛋',
    minKcal: 60,
    maxKcal: 90,
    sourceNote: 'Food DNA template (convenience_tea_egg), 75 kcal/顆',
  },
  {
    name: '荷包蛋',
    query: '荷包蛋',
    expectedFoodName: '荷包蛋（不含額外油）',
    minKcal: 88,
    maxKcal: 108,
    sourceNote: 'USDA FDC / Taiwan FDA — fried egg, no extra oil counted',
  },
  {
    name: '白飯',
    query: '白飯',
    expectedFoodName: '白飯（熟）',
    minKcal: 120,
    maxKcal: 140,
    sourceNote: 'Per-100g reference (portion not specified in a bare query)',
  },
  {
    name: '雞胸肉',
    query: '雞胸肉',
    expectedFoodName: '雞胸肉（熟去皮）',
    minKcal: 150,
    maxKcal: 180,
    minProtein: 28,
    maxProtein: 34,
    sourceNote: 'Per-100g reference, cooked skinless',
  },
  {
    name: '香蕉',
    query: '香蕉',
    expectedFoodName: '香蕉',
    minKcal: 80,
    maxKcal: 98,
    sourceNote: 'Per-100g reference',
  },
  {
    name: '蘋果',
    query: '蘋果',
    expectedFoodName: '蘋果',
    minKcal: 45,
    maxKcal: 60,
    sourceNote: 'Per-100g reference',
  },
  {
    name: '無糖豆漿',
    query: '無糖豆漿',
    expectedFoodName: '無糖豆漿',
    minKcal: 25,
    maxKcal: 40,
    sourceNote: 'Per-100g reference',
  },
  {
    name: '牛奶',
    query: '牛奶',
    expectedFoodName: '鮮奶（全脂）',
    minKcal: 55,
    maxKcal: 68,
    sourceNote: 'Per-100g reference, whole milk (牛奶 aliased to 鮮奶（全脂）)',
  },
  {
    name: '雞腿便當',
    query: '雞腿便當',
    expectedFoodName: '雞腿便當',
    minKcal: 500,
    maxKcal: 750,
    sourceNote: 'Composite dish — wide range on purpose, no single "true" value',
  },
  {
    name: '牛肉麵',
    query: '牛肉麵',
    expectedFoodName: '紅燒牛肉麵',
    minKcal: 450,
    maxKcal: 750,
    sourceNote: 'Composite dish — wide range on purpose, no single "true" value',
  },
]

describe('Task 2C — Nutrition Golden Set (regression protection)', () => {
  for (const c of GOLDEN_CASES) {
    it(`${c.name}: resolves to "${c.expectedFoodName}" within [${c.minKcal}, ${c.maxKcal}] kcal (${c.sourceNote})`, () => {
      const candidates = collectClientCandidates(c.query)
      const result = classifyClientMatchLevel(c.query, candidates)
      assert.ok(result.best, `expected a best candidate for "${c.query}"`)
      assert.equal(result.best!.name, c.expectedFoodName)
      assert.ok(
        result.best!.macros.calories! >= c.minKcal && result.best!.macros.calories! <= c.maxKcal,
        `expected ${c.name} calories in [${c.minKcal}, ${c.maxKcal}], got ${result.best!.macros.calories}`
      )
      if (c.minProtein != null && c.maxProtein != null) {
        assert.ok(
          result.best!.macros.protein! >= c.minProtein && result.best!.macros.protein! <= c.maxProtein,
          `expected ${c.name} protein in [${c.minProtein}, ${c.maxProtein}], got ${result.best!.macros.protein}`
        )
      }
    })
  }

  describe('known gaps — documented, not silently passing', () => {
    it('KNOWN GAP: 御飯糰 has zero product-database coverage (Level C / unmatched)', () => {
      const candidates = collectClientCandidates('御飯糰')
      const result = classifyClientMatchLevel('御飯糰', candidates)
      assert.equal(result.level, 'C')
      assert.equal(result.best, null)
    })

    it('KNOWN GAP: 蛋餅 does not currently surface its Food DNA template above weaker runtime-menu matches (Level C)', () => {
      const candidates = collectClientCandidates('蛋餅')
      const result = classifyClientMatchLevel('蛋餅', candidates)
      assert.equal(result.level, 'C')
    })

    it('KNOWN GAP: 地瓜 currently collides with an unrelated product name ("小菜籃有機地瓜葉") via the token-overlap fallback in scoreNameMatch — pre-existing, outside today\'s two-bug fix scope', () => {
      const candidates = collectClientCandidates('地瓜')
      const result = classifyClientMatchLevel('地瓜', candidates)
      // Documents the current (wrong) behavior so a future fix has this test
      // to flip — NOT an assertion that this is correct.
      assert.equal(result.best?.name, '小菜籃有機地瓜葉')
    })
  })
})
