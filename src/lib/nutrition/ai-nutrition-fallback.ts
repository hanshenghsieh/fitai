/**
 * Build 37 BUG 2 — three-level nutrition resolution strategy.
 *
 * LEVEL 1 (trusted DB): collectClientCandidates — ingredient DB, Food DNA,
 * convenience-store/restaurant DB, aliases (search-v2/matcher-core.ts).
 * Already exists; this module never re-implements it, only calls it.
 *
 * LEVEL 2 (AI fallback): only invoked when LEVEL 1 has no official-status
 * candidate at all. Calls the existing Anthropic client
 * (estimateFoodNutrition in claude/client.ts) — no new AI SDK. Every result
 * passes through validateAiNutritionEstimate (schema + physical-consistency
 * guardrails) before ever becoming a candidate; a bad result is rejected,
 * never saved, never silently zero-filled.
 *
 * LEVEL 3 (user confirmation): this module returns AI results tagged
 * nutrition_confidence: 'C' / nutrition_status: 'estimated' — the existing
 * SearchV2Outcome/PhotoV2State confirmation flow (already built for level
 * B) is what actually gates them behind a user tap. See
 * photoV2ReadyForLog's handling of level 'C' in photo-pipeline.ts.
 *
 * This module never writes anything back into the trusted DB
 * (ingredient-db.json, food_aliases.json, food-kb) — an AI estimate stays
 * an AI estimate for this one food log, never becomes future "official"
 * data. See logAiNutritionAttempt for the (separate, analysis-only) record
 * of what was asked/answered/accepted.
 */
import { estimateFoodNutrition, type AiNutritionEstimateInput } from '@/lib/claude/client'
import type { AiNutritionEstimate } from '@/lib/claude/schemas'
import { collectClientCandidates, classifyClientMatchLevel } from '@/lib/nutrition/search-v2/matcher-core'
import type { NutritionMacros, SearchV2Candidate } from '@/lib/nutrition/search-v2/types'

/** A real food can't be almost pure fat/protein/carbs beyond these — catches "AI hallucinated a huge number". */
const MAX_PLAUSIBLE_KCAL_PER_100G = 900
/** kcal implied by protein*4+carbs*4+fat*9 must be within this fraction of the reported calories. */
const MACRO_ENERGY_TOLERANCE = 0.35
/** Below this AI-reported confidence, treat the estimate as unusable rather than a low-confidence candidate. */
const MIN_USABLE_AI_CONFIDENCE = 0.15

export type AiFallbackFailureReason =
  | 'schema_invalid'
  | 'physically_inconsistent'
  | 'confidence_too_low'
  | 'api_error'
  | 'timeout'

export type AiFallbackResult =
  | { ok: true; estimate: AiNutritionEstimate; demoted: boolean }
  | { ok: false; reason: AiFallbackFailureReason; message: string }

/**
 * Guardrails applied on top of Zod schema validation (which already rejects
 * negative numbers, non-finite numbers, and out-of-range values — see
 * AiNutritionEstimateSchema). This layer catches values that are each
 * individually "in range" but jointly implausible.
 */
export function checkAiNutritionPhysicalConsistency(estimate: AiNutritionEstimate): {
  consistent: boolean
  shouldDemote: boolean
  reason?: string
} {
  const { calories, protein_g, carbs_g, fat_g, estimated_weight_g } = estimate

  const impliedKcal = protein_g * 4 + carbs_g * 4 + fat_g * 9
  if (calories > 0 && impliedKcal > 0) {
    const diff = Math.abs(calories - impliedKcal) / calories
    if (diff > MACRO_ENERGY_TOLERANCE * 2) {
      return { consistent: false, shouldDemote: false, reason: `熱量與三大營養素換算相差過大（${calories} vs ${Math.round(impliedKcal)} kcal）` }
    }
    if (diff > MACRO_ENERGY_TOLERANCE) {
      return { consistent: true, shouldDemote: true, reason: '熱量與三大營養素換算有落差，降低信心' }
    }
  }

  const kcalPer100g = estimated_weight_g > 0 ? (calories / estimated_weight_g) * 100 : 0
  if (kcalPer100g > MAX_PLAUSIBLE_KCAL_PER_100G) {
    return { consistent: false, shouldDemote: false, reason: `每 100g 熱量密度超出合理範圍（${Math.round(kcalPer100g)} kcal/100g）` }
  }

  return { consistent: true, shouldDemote: false }
}

/** Schema validation (throws on malformed JSON / out-of-range values) + physical-consistency guardrails. */
export function validateAiNutritionEstimate(raw: AiNutritionEstimate): AiFallbackResult {
  if (raw.confidence < MIN_USABLE_AI_CONFIDENCE) {
    return { ok: false, reason: 'confidence_too_low', message: 'AI 估算信心過低，不採用' }
  }
  const physical = checkAiNutritionPhysicalConsistency(raw)
  if (!physical.consistent) {
    return { ok: false, reason: 'physically_inconsistent', message: physical.reason ?? '估算數值不合理' }
  }
  if (physical.shouldDemote) {
    return { ok: true, estimate: { ...raw, confidence: Math.min(raw.confidence, 0.4) }, demoted: true }
  }
  return { ok: true, estimate: raw, demoted: false }
}

/** In-memory de-dupe for identical requests within the same process — deliberately simple, not a new cache layer. */
const inFlightEstimates = new Map<string, Promise<AiFallbackResult>>()

function aiCacheKey(input: AiNutritionEstimateInput): string {
  return [
    input.foodName.trim().toLowerCase(),
    input.quantity ?? '',
    input.unit ?? '',
    input.preparation ?? '',
  ].join('|')
}

/**
 * Calls the AI (claude/client.ts by default), applies guardrails, never
 * throws — every failure mode returns `ok: false`. `estimator` is a test
 * seam only (defaults to the real Anthropic-backed function) so
 * malformed-JSON / negative-value / timeout / API-failure guardrail tests
 * can run without a live network call — see
 * src/lib/nutrition/ai-nutrition-fallback.test.ts.
 */
export async function runAiNutritionFallback(
  input: AiNutritionEstimateInput,
  estimator: (
    input: AiNutritionEstimateInput
  ) => Promise<{ data: AiNutritionEstimate; tokensUsed: number }> = estimateFoodNutrition
): Promise<AiFallbackResult> {
  const key = aiCacheKey(input)
  const cached = inFlightEstimates.get(key)
  if (cached) return cached

  const promise = (async (): Promise<AiFallbackResult> => {
    let raw: AiNutritionEstimate
    try {
      const { data } = await estimator(input)
      raw = data
    } catch (err) {
      if (err instanceof Error && /timeout|aborted/i.test(err.message)) {
        return { ok: false, reason: 'timeout', message: 'AI 估算逾時，請重試或手動輸入' }
      }
      if (err instanceof Error && /invalid JSON|Required|Expected|Invalid/i.test(err.message)) {
        return { ok: false, reason: 'schema_invalid', message: 'AI 回傳格式不正確，不採用' }
      }
      return { ok: false, reason: 'api_error', message: 'AI 估算服務暫時無法使用' }
    }
    return validateAiNutritionEstimate(raw)
  })()

  inFlightEstimates.set(key, promise)
  try {
    return await promise
  } finally {
    inFlightEstimates.delete(key)
  }
}

/** Test-only — clears the in-flight de-dupe cache between test cases. */
export function clearAiNutritionFallbackCacheForTests(): void {
  inFlightEstimates.clear()
}

function estimateToMacros(estimate: AiNutritionEstimate): NutritionMacros {
  return {
    calories: Math.round(estimate.calories),
    protein: Math.round(estimate.protein_g * 10) / 10,
    fat: Math.round(estimate.fat_g * 10) / 10,
    carbs: Math.round(estimate.carbs_g * 10) / 10,
    fiber: null,
    sugar: null,
    sodium: null,
  }
}

export function aiEstimateToCandidate(estimate: AiNutritionEstimate, demoted: boolean): SearchV2Candidate {
  return {
    id: `ai-estimate-${Date.now()}`,
    name: estimate.canonical_name,
    macros: estimateToMacros(estimate),
    // LEVEL 3 requirement: an AI estimate is never 'official' — 'estimated'
    // status + 'C' confidence route it through the existing pending/needs
    // confirmation UI, exactly like a Level B candidate, never auto-applied.
    nutrition_status: 'estimated',
    nutrition_confidence: 'C',
    nutrition_source: 'AI 營養估算',
    source_tier: 'official',
    match_score: demoted ? 55 : Math.round(60 + estimate.confidence * 30),
    explanation: `🟡 AI 營養估算 — ${estimate.reason}`,
  }
}

export interface ResolveNutritionResult {
  outcome: 'trusted_db' | 'ai_fallback' | 'ai_unavailable' | 'unresolved'
  candidate: SearchV2Candidate | null
  aiFailure?: AiFallbackFailureReason
}

/**
 * The actual LEVEL 1 -> LEVEL 2 orchestration. LEVEL 1 (collectClientCandidates,
 * which already includes canonicalization via aliases/whole-food matching)
 * always runs first and, on a confident match, short-circuits — the AI is
 * never called when the trusted DB already has an answer (cost control).
 */
export async function resolveNutritionWithAiFallback(
  query: string,
  aiInput: Omit<AiNutritionEstimateInput, 'foodName'>,
  estimator?: Parameters<typeof runAiNutritionFallback>[1]
): Promise<ResolveNutritionResult> {
  const candidates = collectClientCandidates(query)
  const classified = classifyClientMatchLevel(query, candidates)

  if (classified.level !== 'C' && classified.best) {
    return { outcome: 'trusted_db', candidate: classified.best }
  }

  const aiResult = await runAiNutritionFallback({ foodName: query, ...aiInput }, estimator)
  if (!aiResult.ok) {
    return { outcome: 'ai_unavailable', candidate: null, aiFailure: aiResult.reason }
  }
  return {
    outcome: 'ai_fallback',
    candidate: aiEstimateToCandidate(aiResult.estimate, aiResult.demoted),
  }
}

export interface AiNutritionAttemptLog {
  food_query: string
  canonical_name: string | null
  ai_estimate: AiNutritionEstimate | null
  user_accepted: boolean | null
  user_edited: boolean | null
  edited_values: Partial<Pick<AiNutritionEstimate, 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'>> | null
}

/**
 * Analysis-only record of an AI fallback attempt (query -> estimate -> did
 * the user accept/edit it). Deliberately NOT a promotion path: nothing here
 * writes into ingredient-db.json / food_aliases.json / food-kb. A future,
 * separate candidate -> validation -> promotion flow (explicitly out of
 * scope for Build 37) would read this log, not this module.
 */
export function buildAiNutritionAttemptLog(
  query: string,
  estimate: AiNutritionEstimate | null,
  userAccepted: boolean | null,
  editedValues: AiNutritionAttemptLog['edited_values'] = null
): AiNutritionAttemptLog {
  return {
    food_query: query,
    canonical_name: estimate?.canonical_name ?? null,
    ai_estimate: estimate,
    user_accepted: userAccepted,
    user_edited: editedValues != null,
    edited_values: editedValues,
  }
}
