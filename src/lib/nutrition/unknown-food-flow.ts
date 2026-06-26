import type { FoodLogEntry } from '@/lib/banks/types'
import { searchFoodMenuExtended } from '@/lib/food-menu-lookup'
import { resolveMenuFromQuery } from '@/lib/food-menu-lookup'
import type { MenuLookupHit } from '@/lib/food-menu-lookup'
import { enqueueUnknownFood } from '@/lib/nutrition/search-v2/unknown-queue'
import type { ClarificationSession } from '@/lib/nutrition/search-v2/types'
import { collectClientCandidates } from '@/lib/nutrition/search-v2/matcher-core'
import {
  applyUnknownClarificationAnswer,
  buildUnknownFoodClarification,
  clarificationComplete as unknownClarificationComplete,
  resolvedQueryFromUnknownClarification,
} from '@/lib/nutrition/unknown-food-clarification'

export interface ManualNutritionInput {
  calories: number | null
  protein_g: number | null
  fat_g: number | null
  carbs_g: number | null
  fiber_g?: number | null
  sugar_g?: number | null
  sodium_mg?: number | null
  portion?: string
  notes?: string
  source_note?: string
}

const VERIFIED_MIN_CONFIDENCE = 0.72

/** Verified / official hits only — no fake candidates. */
export function findSimilarVerifiedItems(query: string, limit = 8): MenuLookupHit[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  const hits = searchFoodMenuExtended(trimmed, limit * 2)
  const verified = hits.filter(h => h.confidence >= VERIFIED_MIN_CONFIDENCE)

  const seen = new Set<string>()
  const out: MenuLookupHit[] = []
  for (const hit of verified) {
    const key = `${hit.store}::${hit.name}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(hit)
    if (out.length >= limit) break
  }
  return out
}

export function enqueueUnknownFromLog(log: FoodLogEntry): void {
  const matches = findSimilarVerifiedItems(log.name, 6).map(h => h.name)
  enqueueUnknownFood({
    food_name: log.name,
    restaurant: log.store ?? null,
    possible_matches: matches,
  })
}

export function hitToFoodLogPatch(hit: MenuLookupHit): Pick<
  FoodLogEntry,
  'name' | 'store' | 'calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'nutrition_status' | 'nutrition_confidence' | 'capture_status'
> {
  return {
    name: hit.name,
    store: hit.store,
    calories: hit.calories,
    protein_g: hit.protein_g,
    carbs_g: hit.carbs_g,
    fat_g: hit.fat_g,
    nutrition_status: 'official',
    nutrition_confidence: hit.confidence >= 0.85 ? 'A' : 'B',
    capture_status: 'resolved',
  }
}

export function isManualNutritionPartial(input: ManualNutritionInput): boolean {
  const fields = [input.calories, input.protein_g, input.fat_g, input.carbs_g]
  const filled = fields.filter(v => v != null && !Number.isNaN(v)).length
  return filled > 0 && filled < 4
}

export function applyManualNutritionToLog(log: FoodLogEntry, input: ManualNutritionInput): FoodLogEntry {
  const partial = isManualNutritionPartial(input)
  return {
    ...log,
    calories: input.calories,
    protein_g: input.protein_g,
    fat_g: input.fat_g ?? undefined,
    carbs_g: input.carbs_g ?? undefined,
    nutrition_status: 'user_entered',
    nutrition_confidence: 'user_confirmed',
    capture_status: 'resolved',
    nutrition_accuracy_meta: {
      accuracy_level: partial ? 'D' : 'C',
      source_type: 'user_input',
      user_confirmed: true,
      portion_adjustments: input.portion ? { portion: input.portion } : {},
      candidate_label: log.name,
    },
    user_nutrition_meta: {
      source_type: 'user_input',
      portion: input.portion,
      notes: input.notes,
      source_note: input.source_note,
      entered_at: new Date().toISOString(),
      partial,
      fiber_g: input.fiber_g ?? undefined,
      sugar_g: input.sugar_g ?? undefined,
      sodium_mg: input.sodium_mg ?? undefined,
    },
  }
}

export function startUnknownFoodClarification(query: string): ClarificationSession | null {
  return buildUnknownFoodClarification(query)
}

export function answerUnknownClarification(
  session: ClarificationSession,
  questionId: string,
  optionId: string
): ClarificationSession {
  return applyUnknownClarificationAnswer(session, questionId, optionId)
}

export interface ClarificationResolveResult {
  can_commit: boolean
  log_patch?: ReturnType<typeof hitToFoodLogPatch>
  nutrition_status: 'official' | 'unknown'
  message: string
}

/** Template / verified lookup only — never GPT nutrition estimate. */
export function finalizeUnknownClarification(session: ClarificationSession): ClarificationResolveResult {
  if (!unknownClarificationComplete(session)) {
    return { can_commit: false, nutrition_status: 'unknown', message: '請完成澄清問題' }
  }

  const refined = resolvedQueryFromUnknownClarification(session)
  const kb = resolveMenuFromQuery(refined)
  if (kb) {
    return {
      can_commit: true,
      log_patch: hitToFoodLogPatch(kb),
      nutrition_status: 'official',
      message: `找到可信資料：${kb.name}`,
    }
  }

  const candidates = collectClientCandidates(refined).filter(c => c.nutrition_status === 'official')
  const best = candidates[0]
  if (best && best.match_score >= 85) {
    return {
      can_commit: true,
      log_patch: {
        name: best.name,
        store: best.store,
        calories: best.macros.calories ?? null,
        protein_g: best.macros.protein ?? null,
        carbs_g: best.macros.carbs ?? undefined,
        fat_g: best.macros.fat ?? undefined,
        nutrition_status: 'official',
        nutrition_confidence: best.nutrition_confidence,
        capture_status: 'resolved',
      },
      nutrition_status: 'official',
      message: `找到可信資料：${best.name}`,
    }
  }

  return {
    can_commit: true,
    nutrition_status: 'unknown',
    message: '目前沒有可信營養資料，保持文字紀錄。',
  }
}
