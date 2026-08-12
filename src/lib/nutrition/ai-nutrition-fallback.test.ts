import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  resolveNutritionWithAiFallback,
  runAiNutritionFallback,
  validateAiNutritionEstimate,
  checkAiNutritionPhysicalConsistency,
  aiEstimateToCandidate,
  buildAiNutritionAttemptLog,
  clearAiNutritionFallbackCacheForTests,
} from './ai-nutrition-fallback'
import { AiNutritionEstimateSchema, type AiNutritionEstimate } from '@/lib/claude/schemas'

function validEstimate(overrides: Partial<AiNutritionEstimate> = {}): AiNutritionEstimate {
  return {
    canonical_name: '未知食物',
    estimated_weight_g: 100,
    calories: 150,
    protein_g: 10,
    carbs_g: 15,
    fat_g: 5,
    confidence: 0.6,
    reason: '測試用估算',
    source_type: 'ai_estimate',
    ...overrides,
  }
}

function neverCallEstimator() {
  return Promise.reject(new Error('AI estimator must not be called — LEVEL 1 trusted DB already answered'))
}

beforeEach(() => clearAiNutritionFallbackCacheForTests())

describe('Build 37 BUG 2 — three-level nutrition resolution (Task: Regression Tests 1-6)', () => {
  it('1. 蛋 resolves via trusted DB, AI fallback is never called', async () => {
    const result = await resolveNutritionWithAiFallback('蛋', {}, neverCallEstimator)
    assert.equal(result.outcome, 'trusted_db')
    assert.equal(result.candidate?.name, '雞蛋（全蛋，熟）')
  })

  it('2. 水煮蛋 resolves via trusted DB, AI fallback is never called', async () => {
    const result = await resolveNutritionWithAiFallback('水煮蛋', {}, neverCallEstimator)
    assert.equal(result.outcome, 'trusted_db')
    assert.equal(result.candidate?.name, '水煮蛋')
  })

  it('3. 茶葉蛋 resolves via trusted DB (Food DNA template), AI fallback is never called', async () => {
    const result = await resolveNutritionWithAiFallback('茶葉蛋', {}, neverCallEstimator)
    assert.equal(result.outcome, 'trusted_db')
    assert.equal(result.candidate?.name, '茶葉蛋')
  })

  it('4. 溏心蛋 canonicalizes to trusted egg data (水煮蛋) — AI fallback is never called', async () => {
    const result = await resolveNutritionWithAiFallback('溏心蛋', {}, neverCallEstimator)
    assert.equal(result.outcome, 'trusted_db')
    assert.equal(result.candidate?.name, '水煮蛋')
    assert.equal(result.candidate?.macros.calories, 78)
  })

  it('5. 半熟水煮蛋 canonicalizes to trusted egg data (水煮蛋) — AI fallback is never called', async () => {
    const result = await resolveNutritionWithAiFallback('半熟水煮蛋', {}, neverCallEstimator)
    assert.equal(result.outcome, 'trusted_db')
    assert.equal(result.candidate?.name, '水煮蛋')
  })

  it('6. A genuinely unknown but plausible food falls through to AI fallback', async () => {
    // Confirmed via manual probing of classifyClientMatchLevel that this
    // query has zero trusted-DB candidates (level 'C', no best match) —
    // an uncommon but real dish, unlike a fabricated/impossible food.
    const estimator = async () => ({
      data: validEstimate({ canonical_name: '羊駝肉排', calories: 220, protein_g: 8, carbs_g: 30, fat_g: 7 }),
      tokensUsed: 100,
    })
    const result = await resolveNutritionWithAiFallback('羊駝肉排', {}, estimator)
    assert.equal(result.outcome, 'ai_fallback')
    assert.equal(result.candidate?.nutrition_status, 'estimated')
    assert.equal(result.candidate?.nutrition_confidence, 'C')
    assert.equal(result.candidate?.macros.calories, 220)
  })
})

describe('Build 37 BUG 2 — AI guardrails (Task: Regression Tests 7-10)', () => {
  it('7. Malformed JSON from the AI (thrown during parsing) is rejected, not saved', async () => {
    const estimator = async () => {
      throw new Error('AI nutrition estimate returned invalid JSON: not json at all')
    }
    const result = await runAiNutritionFallback({ foodName: 'x' }, estimator)
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.reason, 'schema_invalid')
  })

  it('7b. A response failing Zod schema validation (thrown by .parse()) is rejected, not saved', async () => {
    const estimator = async (): Promise<never> => {
      throw new Error('Required: calories')
    }
    const result = await runAiNutritionFallback({ foodName: 'x' }, estimator)
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.reason, 'schema_invalid')
  })

  it('8. Negative macro values are rejected by schema validation before guardrails even run', () => {
    // AiNutritionEstimateSchema.parse() itself throws on negative numbers —
    // validateAiNutritionEstimate only ever receives an already-schema-valid
    // object. This proves a negative value can never reach it as a
    // finalized AiNutritionEstimate in the first place.
    const parsed = AiNutritionEstimateSchema.safeParse(validEstimate({ calories: -50 }))
    assert.equal(parsed.success, false)
    const parsedNegProtein = AiNutritionEstimateSchema.safeParse(validEstimate({ protein_g: -1 }))
    assert.equal(parsedNegProtein.success, false)
  })

  it('9. An extreme, physically-implausible calorie density is rejected outright', () => {
    // 100g claiming 2500 kcal (2500 kcal/100g) — no real food is that dense.
    const result = validateAiNutritionEstimate(
      validEstimate({ estimated_weight_g: 100, calories: 2500, protein_g: 5, carbs_g: 5, fat_g: 5 })
    )
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.reason, 'physically_inconsistent')
  })

  it('9b. A milder macro/calorie mismatch is demoted in confidence, not outright rejected', () => {
    // protein*4+carbs*4+fat*9 = 40+40+0 = 80, vs reported 130 kcal — diff
    // ratio 0.38 sits between the demote threshold (0.35) and the reject
    // threshold (0.70): a real but moderate mismatch, not an extreme one.
    const result = validateAiNutritionEstimate(
      validEstimate({ estimated_weight_g: 100, calories: 130, protein_g: 10, carbs_g: 10, fat_g: 0 })
    )
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.demoted, true)
      assert.ok(result.estimate.confidence <= 0.4)
    }
  })

  it('10. An AI API failure degrades gracefully — no data saved, reason reported', async () => {
    const estimator = async (): Promise<never> => {
      throw new Error('network error: ECONNRESET')
    }
    const result = await runAiNutritionFallback({ foodName: 'x' }, estimator)
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.reason, 'api_error')
  })

  it('10b. An AI timeout is reported distinctly so the UI can offer retry/manual entry', async () => {
    const estimator = async (): Promise<never> => {
      throw new Error('Request timeout after 30000ms')
    }
    const result = await runAiNutritionFallback({ foodName: 'x' }, estimator)
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.reason, 'timeout')
  })

  it('checkAiNutritionPhysicalConsistency: a well-formed estimate is neither rejected nor demoted', () => {
    const result = checkAiNutritionPhysicalConsistency(
      validEstimate({ estimated_weight_g: 100, calories: 150, protein_g: 10, carbs_g: 15, fat_g: 5 })
    )
    assert.equal(result.consistent, true)
    assert.equal(result.shouldDemote, false)
  })
})

describe('Build 37 BUG 2 — no auto-learning pollution (Task: Regression Test 11)', () => {
  it('11. aiEstimateToCandidate never marks the result as official — it is always "estimated" status / "C" confidence, never written as trusted data', () => {
    const estimate = validEstimate({ canonical_name: '藜麥沙拉' })
    const candidate = aiEstimateToCandidate(estimate, false)
    assert.equal(candidate.nutrition_status, 'estimated')
    assert.equal(candidate.nutrition_confidence, 'C')
    assert.notEqual(candidate.nutrition_status, 'official')
  })

  it('11b. This module has no write path into the trusted ingredient DB / alias / food-kb files — it may only reference them in comments, never import or write to them', () => {
    const selfPath = fileURLToPath(new URL('./ai-nutrition-fallback.ts', import.meta.url))
    const source = readFileSync(selfPath, 'utf8')
    assert.doesNotMatch(source, /writeFileSync|\bfs\.write|require\(['"]fs['"]\)|from ['"]node:fs['"]/)
    assert.doesNotMatch(source, /import[^\n]*(ingredient-db|food_aliases)/)
  })
})

describe('Build 37 BUG 2 — analysis-only attempt log (Task: Regression Test 12)', () => {
  it('12. When the user accepts the AI estimate as-is, the log records acceptance with no edits', () => {
    const estimate = validEstimate({ canonical_name: '藜麥沙拉' })
    const log = buildAiNutritionAttemptLog('藜麥沙拉', estimate, true)
    assert.equal(log.user_accepted, true)
    assert.equal(log.user_edited, false)
    assert.equal(log.edited_values, null)
  })

  it('12b. When the user edits the AI estimate before saving, the log records the edited values (not the original AI numbers) as what was actually saved', () => {
    const estimate = validEstimate({ canonical_name: '藜麥沙拉', calories: 220, protein_g: 8 })
    const editedValues = { calories: 250, protein_g: 9 }
    const log = buildAiNutritionAttemptLog('藜麥沙拉', estimate, true, editedValues)
    assert.equal(log.user_edited, true)
    assert.deepEqual(log.edited_values, editedValues)
    // The original AI estimate is preserved in the log for analysis, but
    // marked distinctly from what the user actually chose to save.
    assert.equal(log.ai_estimate?.calories, 220)
  })
})
