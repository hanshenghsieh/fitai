/**
 * PART 19/F/G regression — the exact "known DB hit" / "known DB miss" cases
 * from the AI-fallback spec, run against the real production paths (not a
 * parallel/looser test double).
 *
 * Two layers are checked, because they are genuinely different systems (see
 * the Phase-3/4 architecture map): searchFoodMenu() is the lightweight
 * client-side search TodayFoodMore actually gates the AI trigger on, while
 * resolveNutritionWithAiFallback's LEVEL 1 uses search-v2's own, independent
 * matcher (matcher-core.ts). A query can be a genuine local hit in one and
 * not the other — 蛋餅 is a documented example (see the second describe
 * block) — so both are asserted, and the claim "AI is not invoked" is
 * anchored to the layer that actually gates the client's AI trigger.
 */
import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import { searchFoodMenu } from '@/lib/food-search'
import {
  resolveNutritionWithAiFallback,
  clearAiNutritionFallbackCacheForTests,
} from './ai-nutrition-fallback'
import type { AiNutritionEstimate } from '@/lib/claude/schemas'

const DB_HIT_QUERIES = ['蛋餅', '茶葉蛋', '冬瓜茶', '玉米濃湯', '麥香雞']
const DB_MISS_QUERIES = ['麥脆雞', '多多綠', '夏威夷披薩', '鹹酥雞']

function neverCallEstimator() {
  return Promise.reject(new Error('AI estimator must not be called — a local hit already answered'))
}

function fakeEstimate(overrides: Partial<AiNutritionEstimate> = {}) {
  return (input: { foodName: string }) =>
    Promise.resolve({
      data: {
        canonical_name: input.foodName,
        estimated_weight_g: 150,
        calories: 300,
        protein_g: 15,
        carbs_g: 20,
        fat_g: 12,
        confidence: 0.6,
        reason: '測試估算',
        source_type: 'ai_estimate' as const,
        ...overrides,
      },
      tokensUsed: 10,
    })
}

beforeEach(() => clearAiNutritionFallbackCacheForTests())

describe('PART 19.F — known DB-hit queries never reach the client AI trigger', () => {
  for (const query of DB_HIT_QUERIES) {
    it(`"${query}" is a local searchFoodMenu() hit — TodayFoodMore's noSearchHits stays false, so the AI-trigger branch in handlePrimaryAction is unreachable`, () => {
      const hits = searchFoodMenu(query, 6)
      assert.ok(hits.length > 0, `expected "${query}" to be locally searchable`)
    })
  }
})

describe('PART 19.G — known DB-miss queries invoke AI fallback exactly once and return a usable, correctly-tagged result', () => {
  for (const query of DB_MISS_QUERIES) {
    it(`"${query}": local search misses, AI fallback is invoked, result is tagged nutrition_confidence 'C' / estimate_provenance 'ai_estimate'`, async () => {
      assert.equal(searchFoodMenu(query, 6).length, 0, `expected "${query}" to have no local search hits (that is the point of this regression case)`)

      let aiCalls = 0
      const estimator = (input: { foodName: string }) => {
        aiCalls++
        return fakeEstimate()(input)
      }
      const result = await resolveNutritionWithAiFallback(query, {}, estimator)
      assert.equal(aiCalls, 1)
      assert.equal(result.outcome, 'ai_fallback')
      assert.ok(result.candidate)
      assert.equal(result.candidate?.nutrition_confidence, 'C')
      assert.equal(result.candidate?.nutrition_status, 'estimated')
      assert.equal(result.candidate?.estimate_provenance, 'ai_estimate')
    })
  }
})

describe('search-v2 LEVEL 1 (resolveNutritionWithAiFallback) resolves 4 of the 5 example DB hits itself, without AI', () => {
  // Documents a real architecture nuance found while building this: search-v2's
  // own matcher (independent from searchFoodMenu()) does not cover 蛋餅 the
  // way the lightweight client search does — see PART D of the final report.
  // This does not affect production behavior (the client-side check above is
  // what actually gates the AI trigger), but is pinned here so a future
  // change to either matcher surfaces as an intentional, reviewed diff.
  for (const query of ['茶葉蛋', '冬瓜茶', '玉米濃湯', '麥香雞']) {
    it(`"${query}" resolves via search-v2's own matcher too — AI estimator is never called`, async () => {
      const result = await resolveNutritionWithAiFallback(query, {}, neverCallEstimator)
      assert.equal(result.outcome, 'trusted_db')
    })
  }
})
