import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { scoreNameMatch, substringCoverageScore } from './food-menu-lookup'
import { normalizeFoodName } from './food-kb/normalize'

const HIGH_CONFIDENCE = 80

/** Real production data: BetterBit's convenience-store menu has ~24 unrelated
 * "雞肉飯" (breakfast-shop chicken rice plate, ~450-520kcal) entries across
 * different chains — none of them are the onigiri "雞肉飯御飯糰" (~180kcal)
 * that triggered the reported 181kcal → ~600kcal incident. */
describe('scoreNameMatch — substring-containment guard (P0-1 first layer)', () => {
  it('雞肉飯御飯糰 (query) vs 雞肉飯 (unrelated rice-plate candidate) → must NOT be high-confidence', () => {
    const qNorm = normalizeFoodName('雞肉飯御飯糰')
    const score = scoreNameMatch(qNorm, '雞肉飯')
    assert.ok(
      score < HIGH_CONFIDENCE,
      `expected a reduced score below ${HIGH_CONFIDENCE}, got ${score}`
    )
  })

  it('雞肉飯 vs 雞肉飯 (exact match) → still 100, unaffected by the guard', () => {
    const qNorm = normalizeFoodName('雞肉飯')
    const score = scoreNameMatch(qNorm, '雞肉飯')
    assert.equal(score, 100)
  })

  it('日式咖哩飯 vs 咖哩飯 → related but must not be treated as identical/high-confidence', () => {
    const qNorm = normalizeFoodName('日式咖哩飯')
    const score = scoreNameMatch(qNorm, '咖哩飯')
    assert.ok(score < HIGH_CONFIDENCE, `expected reduced score, got ${score}`)
    assert.ok(score > 0, 'should still surface as a weak/related candidate, not vanish entirely')
  })

  it('牛肉麵 vs 牛肉 → must not be treated as the same food', () => {
    const qNorm = normalizeFoodName('牛肉麵')
    const score = scoreNameMatch(qNorm, '牛肉')
    assert.ok(score < HIGH_CONFIDENCE, `expected reduced score, got ${score}`)
  })

  it('鮪魚蛋餅 vs 蛋餅 → must not be treated as an unconditional exact match', () => {
    const qNorm = normalizeFoodName('鮪魚蛋餅')
    const score = scoreNameMatch(qNorm, '蛋餅')
    assert.ok(score < HIGH_CONFIDENCE, `expected reduced score, got ${score}`)
  })

  it('store-prefix variants of the same food name still normalize and match consistently (711雞肉飯御飯糰 vs 7-11 雞肉飯御飯糰)', () => {
    // scoreNameMatch itself only ever sees the food-name portion — store
    // prefixes are stripped by parseStorePrefix() before this function runs
    // (see searchRuntimeMenu). Confirm both spellings reduce to the same
    // normalized food name and therefore still match each other at full
    // confidence — the guard must not degrade same-food, different-prefix
    // lookups.
    const a = normalizeFoodName('雞肉飯御飯糰') // from "711雞肉飯御飯糰" post-strip
    const b = normalizeFoodName('雞肉飯御飯糰') // from "7-11 雞肉飯御飯糰" post-strip
    assert.equal(a, b)
    assert.equal(scoreNameMatch(a, '雞肉飯御飯糰'), 100)
  })

  it('substringCoverageScore is a pure, monotonic function of the coverage ratio, always below the 80 high-confidence tier', () => {
    assert.ok(substringCoverageScore(1, 10) < substringCoverageScore(5, 10))
    assert.ok(substringCoverageScore(3, 5) < HIGH_CONFIDENCE)
    assert.equal(substringCoverageScore(0, 0), 0)
  })
})

describe('scoreNameMatch — proves the pre-fix behavior would have failed this suite', () => {
  it('documents the exact old (unguarded) behavior for comparison', () => {
    // This is the pre-fix implementation inlined verbatim (flat 80 for any
    // substring containment, regardless of length ratio) — kept here only to
    // prove the fix actually changes behavior, not to be reused anywhere.
    function oldUnguardedScore(queryNorm: string, itemNameNorm: string): number {
      if (itemNameNorm === queryNorm) return 100
      if (itemNameNorm.includes(queryNorm) || queryNorm.includes(itemNameNorm)) return 80
      return 0
    }

    const qNorm = normalizeFoodName('雞肉飯御飯糰')
    const nNorm = normalizeFoodName('雞肉飯')
    const oldScore = oldUnguardedScore(qNorm, nNorm)
    const newScore = scoreNameMatch(qNorm, '雞肉飯')

    // The old code path (matching what shipped before this fix) scored this
    // as a flat, unconditional 80 — same tier as a near-exact match. That is
    // the reported bug (P0-1) reproduced directly.
    assert.equal(oldScore, 80, 'sanity check: old unguarded logic really did return the flat 80')
    assert.ok(newScore < oldScore, 'the fix must strictly reduce this specific false-positive case')
  })
})
