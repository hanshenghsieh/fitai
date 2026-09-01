/**
 * Text-search AI fallback — the small mapping layer between search-v2's
 * SearchV2Candidate (returned by resolveNutritionWithAiFallback) and the
 * lightweight FoodSearchHit shape TodayFoodMore/TodayOS already know how to
 * render and commit (see food-search.ts, TodayOS.handlePickSearch).
 *
 * Deliberately pure/framework-free so provenance mapping — the part that
 * must never mislabel an AI guess as trusted catalog data — is unit
 * testable without a DOM.
 */
import type { FoodSearchHit } from '@/lib/food-search'
import type { SearchV2Candidate } from '@/lib/nutrition/search-v2/types'
import { CONFIDENCE_BADGE } from '@/lib/nutrition/search-v2/confidence'

/**
 * A candidate returned by resolveNutritionWithAiFallback can come from two
 * places: LEVEL 1 (trusted_db — search-v2's own matcher, a real DB hit the
 * lighter searchFoodMenu() missed) or LEVEL 2 (ai_fallback — a genuine AI
 * estimate). Only the latter is tagged 'ai_estimate' — a trusted_db result
 * must render and commit exactly like any other trusted search hit.
 */
export function candidateToSearchHit(
  candidate: SearchV2Candidate,
  outcome: 'trusted_db' | 'ai_fallback'
): FoodSearchHit {
  const isAiEstimate = outcome === 'ai_fallback' && candidate.estimate_provenance === 'ai_estimate'
  return {
    id: candidate.id,
    name: candidate.name,
    store: candidate.store,
    calories: candidate.macros.calories ?? 0,
    protein_g: candidate.macros.protein ?? 0,
    carbs_g: candidate.macros.carbs ?? undefined,
    fat_g: candidate.macros.fat ?? undefined,
    searchSource: isAiEstimate ? 'ai_estimate' : 'runtime',
    sourceLabel: isAiEstimate ? CONFIDENCE_BADGE.C.label : candidate.nutrition_source,
  }
}

export interface NutritionProvenance {
  nutrition_status: 'official' | 'estimated'
  nutrition_confidence: 'A' | 'B' | 'C'
}

/**
 * What handlePickSearch should stamp onto the committed FoodLogEntry, kept
 * as a standalone pure function so "an AI estimate always lands as C, never
 * A/B" is testable independently of the (large, hard-to-unit-test)
 * TodayOS component that calls it.
 */
export function deriveNutritionProvenanceFromHit(hit: FoodSearchHit): NutritionProvenance {
  if (hit.searchSource === 'ai_estimate') {
    return { nutrition_status: 'estimated', nutrition_confidence: 'C' }
  }
  return hit.sourceType === 'official'
    ? { nutrition_status: 'official', nutrition_confidence: 'A' }
    : { nutrition_status: 'estimated', nutrition_confidence: 'B' }
}
