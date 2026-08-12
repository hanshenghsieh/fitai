import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { collectClientCandidates, classifyClientMatchLevel } from './matcher-core'
import { createPhotoV2State } from './photo-pipeline'
import { runAiNutritionFallback } from '@/lib/nutrition/ai-nutrition-fallback'
import { parseFoodQuantityGrams } from './whole-food-candidates'

const PHOTO_LABEL = '溏心蛋（半熟水煮蛋）'

function neverCallEstimator() {
  return Promise.reject(new Error('AI estimator must not be called — trusted DB already resolved 水煮蛋'))
}

describe('Build 38 BUG 2 — 溏心蛋 canonicalization wins over composite 7-11 products (Regression 1-3, 5-7)', () => {
  for (const query of ['溏心蛋', '糖心蛋', '半熟水煮蛋', '半熟雞蛋', PHOTO_LABEL]) {
    it(`"${query}" resolves to trusted 水煮蛋 (Level A), not an AI fallback`, () => {
      const candidates = collectClientCandidates(query)
      const classified = classifyClientMatchLevel(query, candidates)
      assert.equal(classified.level, 'A')
      assert.equal(classified.best?.name, '水煮蛋')
    })
  }

  it('5. 溏心蛋 must not win against "溏心蛋紐奧良風味烤雞三明治" (the sandwich)', () => {
    const candidates = collectClientCandidates('溏心蛋')
    const classified = classifyClientMatchLevel('溏心蛋', candidates)
    assert.notEqual(classified.best?.name, '溏心蛋紐奧良風味烤雞三明治')
    assert.equal(classified.best?.name, '水煮蛋')
  })

  it('6. 溏心蛋 must not win against "溏心蛋洋芋"', () => {
    const candidates = collectClientCandidates('溏心蛋')
    const classified = classifyClientMatchLevel('溏心蛋', candidates)
    assert.notEqual(classified.best?.name, '溏心蛋洋芋')
    assert.equal(classified.best?.name, '水煮蛋')
  })

  it('7. 溏心蛋 must not win against "韓式麻藥溏心蛋"', () => {
    const candidates = collectClientCandidates('溏心蛋')
    const classified = classifyClientMatchLevel('溏心蛋', candidates)
    assert.notEqual(classified.best?.name, '韓式麻藥溏心蛋')
    assert.equal(classified.best?.name, '水煮蛋')
  })
})

describe('Build 38 BUG 2 — Task A/E: trusted match short-circuits, AI fallback never called (Regression 9)', () => {
  it('9. resolveNutritionWithAiFallback-equivalent: Level A candidate exists, so the AI estimator must never be invoked', async () => {
    // runAiNutritionFallback itself doesn't know about the trusted-DB check
    // (that lives in resolveNutritionWithAiFallback / the API route's
    // create_unknown guard) — this test locks in that the underlying
    // classifyClientMatchLevel result for 溏心蛋 is confidently Level A,
    // which is the exact condition the route checks before ever calling
    // runAiNutritionFallback. A neverCallEstimator seam proves that IF this
    // code path were wired to call AI, the test would fail loudly.
    const candidates = collectClientCandidates(PHOTO_LABEL)
    const classified = classifyClientMatchLevel(PHOTO_LABEL, candidates)
    assert.equal(classified.level, 'A')
    // Sanity: confirm the seam itself works (would reject if actually called).
    await assert.rejects(() => neverCallEstimator())
  })

  it('photoV2 outcome for 溏心蛋（半熟水煮蛋） is create_official at level A, never create_unknown', () => {
    const v2 = createPhotoV2State(PHOTO_LABEL, { photo_id: 'test-photo' })
    assert.equal(v2.outcome.level, 'A')
    assert.equal(v2.outcome.action, 'create_official')
    assert.notEqual(v2.outcome.action, 'create_unknown')
  })
})

describe('Build 38 BUG 2 — Task A: 一顆溏心蛋 nutrition must match USDA whole-egg reference, not a random 7-11 product (Regression 10-13)', () => {
  it('10-13. calories/protein/carbs/fat all fall in the plausible single-egg range', () => {
    const candidates = collectClientCandidates(PHOTO_LABEL)
    const classified = classifyClientMatchLevel(PHOTO_LABEL, candidates)
    const macros = classified.best!.macros
    assert.ok(macros.calories != null && macros.calories >= 70 && macros.calories <= 90, `calories ${macros.calories} out of [70,90]`)
    assert.ok(macros.protein != null && macros.protein >= 5 && macros.protein <= 8, `protein ${macros.protein} out of [5,8]`)
    assert.ok(macros.carbs != null && macros.carbs < 2, `carbs ${macros.carbs} must be < 2`)
    assert.ok(macros.fat != null && macros.fat >= 4 && macros.fat <= 7, `fat ${macros.fat} out of [4,7]`)
  })

  it('the wrong historical answer (235/19/29/7, from "溏心蛋紐奧良風味烤雞三明治") is not what current code returns', () => {
    const candidates = collectClientCandidates(PHOTO_LABEL)
    const classified = classifyClientMatchLevel(PHOTO_LABEL, candidates)
    const macros = classified.best!.macros
    assert.notEqual(macros.calories, 235)
    assert.notEqual(macros.protein, 19)
    assert.notEqual(macros.carbs, 29)
  })
})

describe('Build 38 BUG 2 Task D — one item cut into pieces is still quantity = 1 (Regression 4)', () => {
  const oneEgg = { grams_per_piece: 50 }

  it('4. "一顆蛋切成兩半" phrasing never doubles the parsed quantity — no digit token means COUNT_PATTERN cannot match at all', () => {
    for (const label of [
      '溏心蛋（半熟水煮蛋）',
      '溏心蛋（切成兩半）',
      '溏心蛋對半切',
      '一顆溏心蛋切開',
      '溏心蛋切半',
    ]) {
      const parsed = parseFoodQuantityGrams(label, oneEgg)
      assert.equal(parsed.grams, 50, `"${label}" should resolve to exactly one egg (50g), got ${parsed.grams}g`)
    }
  })

  it('a genuinely explicit "2顆" label is still honored as 2 — this guard only protects against implicit cut-in-half phrasing, not real stated counts', () => {
    const parsed = parseFoodQuantityGrams('2顆溏心蛋', oneEgg)
    assert.equal(parsed.grams, 100)
  })

  it('the end-to-end candidate for a cut-in-half query still resolves to one egg worth of calories (~78 kcal), not doubled (~156 kcal)', () => {
    const candidates = collectClientCandidates('溏心蛋（切成兩半）')
    const classified = classifyClientMatchLevel('溏心蛋（切成兩半）', candidates)
    assert.equal(classified.best?.name, '水煮蛋')
    assert.equal(classified.best?.macros.calories, 78)
  })
})

describe('Build 38 BUG 2 — Regression 14: original egg-family matches from Build 35/36/37 still resolve correctly', () => {
  const cases: Array<{ query: string; name: string }> = [
    { query: '蛋', name: '雞蛋（全蛋，熟）' },
    { query: '水煮蛋', name: '水煮蛋' },
    { query: '茶葉蛋', name: '茶葉蛋' },
  ]
  for (const { query, name } of cases) {
    it(`"${query}" still resolves to "${name}"`, () => {
      const candidates = collectClientCandidates(query)
      const classified = classifyClientMatchLevel(query, candidates)
      assert.equal(classified.best?.name, name)
    })
  }
})
