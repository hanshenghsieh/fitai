import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { candidateToSearchHit, deriveNutritionProvenanceFromHit } from './ai-fallback-search-hit'
import type { SearchV2Candidate } from './search-v2/types'
import type { FoodSearchHit } from '@/lib/food-search'

function makeCandidate(overrides: Partial<SearchV2Candidate> = {}): SearchV2Candidate {
  return {
    id: 'c-1',
    name: '測試食物',
    macros: { calories: 200, protein: 10, fat: 5, carbs: 20, fiber: null, sugar: null, sodium: null },
    nutrition_status: 'estimated',
    nutrition_confidence: 'C',
    nutrition_source: 'AI 營養估算',
    source_tier: 'official',
    match_score: 70,
    explanation: '🟡 AI 營養估算',
    estimate_provenance: 'ai_estimate',
    ...overrides,
  }
}

describe('candidateToSearchHit — trust tagging (PART 21 trust regression)', () => {
  it('a genuine AI-fallback result is tagged searchSource "ai_estimate"', () => {
    const hit = candidateToSearchHit(makeCandidate(), 'ai_fallback')
    assert.equal(hit.searchSource, 'ai_estimate')
    assert.equal(hit.sourceLabel, 'AI 營養估算')
  })

  it('a trusted_db outcome (LEVEL 1 hit via search-v2 matcher) is never tagged as ai_estimate, even if the candidate itself carries stray provenance', () => {
    const hit = candidateToSearchHit(
      makeCandidate({ estimate_provenance: undefined, nutrition_source: '官方資料' }),
      'trusted_db'
    )
    assert.equal(hit.searchSource, 'runtime')
    assert.equal(hit.sourceLabel, '官方資料')
  })

  it('an ai_fallback outcome whose candidate lacks estimate_provenance is not mislabeled as an AI estimate', () => {
    // Defensive: outcome alone isn't trusted, the discriminator field must agree too.
    const hit = candidateToSearchHit(makeCandidate({ estimate_provenance: undefined }), 'ai_fallback')
    assert.equal(hit.searchSource, 'runtime')
  })

  it('null macro fields become 0/undefined rather than NaN or a crash', () => {
    const hit = candidateToSearchHit(
      makeCandidate({ macros: { calories: null, protein: null, fat: null, carbs: null, fiber: null, sugar: null, sodium: null } }),
      'ai_fallback'
    )
    assert.equal(hit.calories, 0)
    assert.equal(hit.protein_g, 0)
    assert.equal(hit.carbs_g, undefined)
    assert.equal(hit.fat_g, undefined)
  })
})

describe('deriveNutritionProvenanceFromHit — AI estimate is never mislabeled as trusted catalog (PART 21.2)', () => {
  function makeHit(overrides: Partial<FoodSearchHit> = {}): FoodSearchHit {
    return { id: 'h-1', name: '測試', calories: 100, protein_g: 5, searchSource: 'runtime', ...overrides }
  }

  it('an ai_estimate hit always resolves to estimated/C, regardless of sourceType', () => {
    const p = deriveNutritionProvenanceFromHit(makeHit({ searchSource: 'ai_estimate', sourceType: 'official' as never }))
    assert.deepEqual(p, { nutrition_status: 'estimated', nutrition_confidence: 'C' })
  })

  it('an official-catalog hit resolves to official/A', () => {
    const p = deriveNutritionProvenanceFromHit(makeHit({ sourceType: 'official' as never }))
    assert.deepEqual(p, { nutrition_status: 'official', nutrition_confidence: 'A' })
  })

  it('a non-official runtime/p0 hit resolves to estimated/B (unchanged prior behavior)', () => {
    const p = deriveNutritionProvenanceFromHit(makeHit({ searchSource: 'p0' }))
    assert.deepEqual(p, { nutrition_status: 'estimated', nutrition_confidence: 'B' })
  })
})
