import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseFoodQuantityGrams, wholeFoodSearchCandidates } from './whole-food-candidates'
import { collectClientCandidates, classifyClientMatchLevel } from './matcher-core'

describe('BUG 2 — whole-food ingredient candidates (egg accuracy root cause fix)', () => {
  describe('parseFoodQuantityGrams — count vs explicit-gram must never collapse to the same portion', () => {
    it('a bare food name with no quantity assumes a single typical piece, not 100g', () => {
      const q = parseFoodQuantityGrams('蛋', { grams_per_piece: 50 })
      assert.equal(q.grams, 50)
      assert.equal(q.explicit, false)
    })

    it('"1顆蛋" resolves to one piece (50g), not 100g', () => {
      const q = parseFoodQuantityGrams('1顆蛋', { grams_per_piece: 50 })
      assert.equal(q.grams, 50)
      assert.equal(q.explicit, true)
    })

    it('"2顆蛋" resolves to exactly double a single piece', () => {
      const q = parseFoodQuantityGrams('2顆蛋', { grams_per_piece: 50 })
      assert.equal(q.grams, 100)
    })

    it('"100g雞蛋" resolves to literal 100g — same numeric grams as 2顆 here, but via the explicit-gram path, not a count multiplier', () => {
      const q = parseFoodQuantityGrams('100g雞蛋', { grams_per_piece: 50 })
      assert.equal(q.grams, 100)
      assert.equal(q.explicit, true)
    })

    it('"100g雞蛋" must NOT be treated the same as "1顆蛋" (the exact bug in the task spec)', () => {
      const onePiece = parseFoodQuantityGrams('1顆蛋', { grams_per_piece: 50 })
      const hundredGrams = parseFoodQuantityGrams('100g雞蛋', { grams_per_piece: 50 })
      assert.notEqual(onePiece.grams, hundredGrams.grams)
      assert.equal(hundredGrams.grams, onePiece.grams * 2)
    })

    it('an implausible parsed quantity (severe-error guard) is clamped back to a single piece', () => {
      const q = parseFoodQuantityGrams('9999顆蛋', { grams_per_piece: 50 })
      assert.equal(q.grams, 50)
      assert.equal(q.clamped, true)
    })
  })

  describe('wholeFoodSearchCandidates — resolves generic eggs from the ingredient DB, not menu items', () => {
    it('"蛋" alone maps to generic cooked egg (~50g), not a large composite dish', () => {
      const [candidate] = wholeFoodSearchCandidates('蛋')
      assert.ok(candidate)
      assert.equal(candidate!.name, '雞蛋（全蛋，熟）')
      assert.equal(candidate!.macros.calories, 78) // 155 * 0.5, rounded
      assert.equal(candidate!.nutrition_confidence, 'A')
    })

    it('"雞蛋" resolves the same as "蛋"', () => {
      const [candidate] = wholeFoodSearchCandidates('雞蛋')
      assert.equal(candidate!.macros.calories, 78)
    })

    it('"水煮蛋" resolves to the boiled-egg entry (same macros as cooked whole egg)', () => {
      const [candidate] = wholeFoodSearchCandidates('水煮蛋')
      assert.equal(candidate!.name, '水煮蛋')
      assert.equal(candidate!.macros.calories, 78)
    })

    it('"茶葉蛋" is NOT hijacked by the generic egg entry (no ingredient-db row for it — Food DNA already handles it correctly)', () => {
      const candidates = wholeFoodSearchCandidates('茶葉蛋')
      assert.equal(candidates.length, 0)
    })

    it('"荷包蛋" resolves to a distinctly higher-fat entry than 水煮蛋 (frying adds fat)', () => {
      const [friedEgg] = wholeFoodSearchCandidates('荷包蛋')
      const [boiledEgg] = wholeFoodSearchCandidates('水煮蛋')
      assert.ok(friedEgg!.macros.calories! > boiledEgg!.macros.calories!)
      assert.ok(friedEgg!.macros.fat! > boiledEgg!.macros.fat!)
    })

    it('"煎蛋" (colloquial for fried egg) resolves the same entry as 荷包蛋, not an unrelated breakfast-shop set meal', () => {
      const [panFried] = wholeFoodSearchCandidates('煎蛋')
      const [friedEgg] = wholeFoodSearchCandidates('荷包蛋')
      assert.equal(panFried!.macros.calories, friedEgg!.macros.calories)
    })

    it('"1顆蛋" and "100g雞蛋" resolve to different calorie totals (1顆 ≈ 50g, not 100g)', () => {
      const [onePiece] = wholeFoodSearchCandidates('1顆蛋')
      const [hundredGrams] = wholeFoodSearchCandidates('100g雞蛋')
      assert.equal(onePiece!.macros.calories, 78)
      assert.equal(hundredGrams!.macros.calories, 155)
      assert.notEqual(onePiece!.macros.calories, hundredGrams!.macros.calories)
    })

    it('"2顆蛋" is double the raw (unrounded) per-piece calories of "1顆蛋"', () => {
      // 155 kcal/100g: 1顆(50g)=77.5→round78, 2顆(100g)=155 exactly — the two
      // don't multiply out perfectly because each is rounded independently,
      // but 2顆 must land within rounding distance of 2x, never at a
      // different portion entirely.
      const [onePiece] = wholeFoodSearchCandidates('1顆蛋')
      const [twoPieces] = wholeFoodSearchCandidates('2顆蛋')
      assert.ok(Math.abs(twoPieces!.macros.calories! - onePiece!.macros.calories! * 2) <= 1)
    })
  })

  describe('End-to-end matcher integration — 蛋 resolves as a confident (Level A) match through the same pipeline the photo flow uses', () => {
    it('"蛋" classifies as Level A via collectClientCandidates + classifyClientMatchLevel', () => {
      const candidates = collectClientCandidates('蛋')
      const result = classifyClientMatchLevel('蛋', candidates)
      assert.equal(result.level, 'A')
      assert.ok(result.best)
      assert.equal(result.best!.macros.calories, 78)
    })

    it('"雞蛋" ranks the generic egg above unrelated composite dishes (吉士香雞蛋堡 etc. legitimately stay candidates, not the winner)', () => {
      // "雞蛋" is a real substring of several convenience-store product names
      // (吉士香雞蛋堡, 雞蛋起司潛艇堡…), so — unlike bare "蛋" — genuine
      // ambiguity is expected here and Level B (ask for confirmation) is the
      // honest answer, not a bug. What must never happen is one of those
      // unrelated dishes outranking the plain egg as the top candidate.
      const candidates = collectClientCandidates('雞蛋')
      const result = classifyClientMatchLevel('雞蛋', candidates)
      assert.equal(result.best!.name, '雞蛋（全蛋，熟）')
      assert.equal(result.best!.macros.calories, 78)
    })
  })
})
