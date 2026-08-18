import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { wholeFoodSearchCandidates } from './whole-food-candidates'
import { compoundMealCandidateFromLabel } from './compound-meal-candidate'

/**
 * P0 photo-portion fix — Step 10 minimal golden set.
 *
 * Scope: the ingredient-DB-driven whole-food/compound path
 * (whole-food-candidates.ts / compound-meal-candidate.ts) that photo logs
 * actually go through once the AI has named the food — NOT a claim that any
 * one AI vision guess or portion description is "correct." The point of this
 * file is to separate three layers that can each fail independently, per the
 * P0 investigation's own framing:
 *
 *   1. food identification — does the query resolve to a DB row at all?
 *   2. portion estimate     — does an explicit/counted quantity produce a
 *                             different (non-default-100g) weight?
 *   3. nutrition calculation — is the resulting kcal in a plausible range
 *                              for that food/portion?
 *
 * Composite/mixed-platter cases use wide tolerance ranges on purpose (recipe
 * variance is real) — same philosophy as nutrition-golden-set.test.ts's
 * existing composite-dish entries (便當/牛肉麵). Categories with zero
 * ingredient-DB coverage (便當 and 炒飯 as bare single-row lookups) are
 * represented as compound labels instead, matching how the real photo
 * pipeline actually resolves them — there is no single "便當" row and
 * treating that as a gap-to-fix would be out of scope for this fix.
 */

interface GoldenCase {
  name: string
  query: string
  layer: 'single' | 'compound'
  expectIdentified: boolean
  minKcal?: number
  maxKcal?: number
  note: string
}

const CASES: GoldenCase[] = [
  { name: '白飯', query: '150g白飯', layer: 'single', expectIdentified: true, minKcal: 175, maxKcal: 215, note: 'explicit 150g, per-100g reference 130 kcal' },
  { name: '糙米飯', query: '150g糙米飯', layer: 'single', expectIdentified: true, minKcal: 165, maxKcal: 205, note: 'explicit 150g, per-100g reference 123 kcal' },
  { name: '雞胸肉', query: '150g雞胸肉', layer: 'single', expectIdentified: true, minKcal: 225, maxKcal: 270, note: 'explicit 150g, cooked skinless 165 kcal/100g' },
  { name: '雞腿肉（去骨）', query: '雞腿肉', layer: 'single', expectIdentified: true, minKcal: 190, maxKcal: 230, note: 'no portion text -> 100g reference (boneless, no edible_fraction)' },
  { name: '帶骨雞腿', query: '4塊帶骨雞腿', layer: 'single', expectIdentified: true, minKcal: 280, maxKcal: 370, note: 'P0 fix: bone-in, 4 chopped pieces, edible_fraction applied' },
  { name: '雞翅', query: '3支雞翅', layer: 'single', expectIdentified: true, minKcal: 130, maxKcal: 180, note: 'bone-in, 3 whole wings, edible_fraction applied' },
  { name: '排骨', query: '150g排骨', layer: 'single', expectIdentified: true, minKcal: 330, maxKcal: 410, note: 'pre-existing BUG2 fix, bone-in edible_fraction 0.65' },
  { name: '水煮蛋', query: '2顆水煮蛋', layer: 'single', expectIdentified: true, minKcal: 130, maxKcal: 175, note: '2 pieces, ~50g/piece reference' },
  { name: '青江菜', query: '青江菜', layer: 'single', expectIdentified: true, minKcal: 8, maxKcal: 25, note: 'leafy green, 100g reference (low calorie)' },
  { name: '麵條', query: '200g麵條', layer: 'single', expectIdentified: true, minKcal: 250, maxKcal: 340, note: 'explicit 200g cooked noodles' },
  { name: '牛腱', query: '100g牛腱', layer: 'single', expectIdentified: true, minKcal: 150, maxKcal: 260, note: 'lean cooked beef shank' },
  { name: '鮭魚', query: '120g鮭魚', layer: 'single', expectIdentified: true, minKcal: 180, maxKcal: 280, note: 'cooked salmon' },
  {
    name: '簡易炒飯（compound: 白飯+蛋+高麗菜+火腿）',
    query: '白飯 + 蛋 + 高麗菜 + 火腿',
    layer: 'compound',
    expectIdentified: true,
    minKcal: 250,
    maxKcal: 500,
    note: 'composite dish approximated as ingredient sum — wide range on purpose',
  },
  {
    name: '簡易便當（compound: 白飯+帶骨雞腿+青江菜）',
    query: '白飯 + 帶骨雞腿 + 青江菜',
    layer: 'compound',
    expectIdentified: true,
    minKcal: 200,
    maxKcal: 400,
    note: 'composite dish approximated as ingredient sum (single default-portion chicken piece) — wide range on purpose',
  },
  {
    name: '混合餐盤（compound: 白飯+雞胸肉+青江菜+櫛瓜）',
    query: '白飯 + 雞胸肉 + 青江菜 + 櫛瓜',
    layer: 'compound',
    expectIdentified: true,
    minKcal: 200,
    maxKcal: 400,
    note: 'mixed plate, 4 segments, all should resolve and sum',
  },
]

describe('P0 photo-portion fix — Step 10 minimal golden set (identification / portion / calculation layers)', () => {
  for (const c of CASES) {
    it(`${c.name}: "${c.query}" (${c.note})`, () => {
      if (c.layer === 'single') {
        const candidates = wholeFoodSearchCandidates(c.query)
        if (!c.expectIdentified) {
          assert.equal(candidates.length, 0, `expected ${c.name} to NOT resolve (documented gap)`)
          return
        }
        assert.ok(candidates.length > 0, `[identification layer] expected ${c.name} to resolve to at least one candidate`)
        const best = candidates[0]!
        if (c.minKcal != null && c.maxKcal != null) {
          assert.ok(
            best.macros.calories! >= c.minKcal && best.macros.calories! <= c.maxKcal,
            `[calculation layer] expected ${c.name} calories in [${c.minKcal}, ${c.maxKcal}], got ${best.macros.calories}`
          )
        }
      } else {
        const result = compoundMealCandidateFromLabel(c.query)
        if (!c.expectIdentified) {
          assert.equal(result, null, `expected ${c.name} to NOT produce a compound aggregate (documented gap)`)
          return
        }
        assert.ok(result, `[identification layer] expected ${c.name} to produce a compound aggregate`)
        if (c.minKcal != null && c.maxKcal != null) {
          assert.ok(
            result!.macros.calories! >= c.minKcal && result!.macros.calories! <= c.maxKcal,
            `[calculation layer] expected ${c.name} calories in [${c.minKcal}, ${c.maxKcal}], got ${result!.macros.calories}`
          )
        }
      }
    })
  }

  describe('portion-estimate layer — explicit/counted quantity must change the result, not collapse to the same default', () => {
    it('white rice: explicit 150g differs from the bare-name 100g-reference default', () => {
      const explicit = wholeFoodSearchCandidates('150g白飯')[0]!
      const bareDefault = wholeFoodSearchCandidates('白飯')[0]!
      assert.notEqual(explicit.macros.calories, bareDefault.macros.calories)
    })

    it('bone-in chicken: a counted quantity (3塊) differs from the single-piece default', () => {
      const counted = wholeFoodSearchCandidates('3塊帶骨雞腿')[0]!
      const singleDefault = wholeFoodSearchCandidates('帶骨雞腿')[0]!
      assert.notEqual(counted.macros.calories, singleDefault.macros.calories)
      assert.ok(counted.macros.calories! > singleDefault.macros.calories! * 2)
    })
  })
})
