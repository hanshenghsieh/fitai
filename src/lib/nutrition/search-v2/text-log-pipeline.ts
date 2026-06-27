/**
 * Text log pipeline — same rules as Nutrition Search V2 (photo cannot be looser).
 */
import type { SearchV2Candidate, SearchV2Context, SearchV2Outcome } from '@/lib/nutrition/search-v2/types'
import { NULL_MACROS } from '@/lib/nutrition/search-v2/types'
import { searchNutritionV2 } from '@/lib/nutrition/search-v2/index'
import { confidenceFromLevel } from '@/lib/nutrition/search-v2/confidence'

export interface TextFoodLogPayload {
  id: string
  name: string
  display_label?: string
  user_input_label?: string
  matched_item_label?: string
  matched_restaurant?: string
  match_type?: string
  possible_matches?: string[]
  store?: string
  calories: number | null
  protein_g: number | null
  carbs_g?: number | null
  fat_g?: number | null
  nutrition_status: 'official' | 'unknown'
  nutrition_confidence: 'A' | 'B' | 'Unknown'
  capture_status: 'resolved' | 'photo_only'
  source: 'search' | 'free_text'
  explanation: string
}

export type TextMealResolveResult =
  | { can_commit: true; action: 'create_official'; payload: TextFoodLogPayload }
  | { can_commit: true; action: 'create_unknown'; payload: TextFoodLogPayload }
  | { can_commit: false; action: 'clarify'; message: string; outcome: SearchV2Outcome }

function newTextLogId(): string {
  return `text-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function officialPayload(candidate: SearchV2Candidate, clarified: boolean): TextFoodLogPayload {
  const confidence = confidenceFromLevel(
    candidate.nutrition_confidence === 'A' ? 'A' : 'B',
    clarified
  )
  return {
    id: newTextLogId(),
    name: candidate.name,
    store: candidate.store,
    calories: candidate.macros.calories,
    protein_g: candidate.macros.protein,
    carbs_g: candidate.macros.carbs,
    fat_g: candidate.macros.fat,
    nutrition_status: 'official',
    nutrition_confidence: confidence === 'C' ? 'B' : confidence,
    capture_status: 'resolved',
    source: 'free_text',
    explanation: candidate.explanation,
  }
}

function unknownPayload(outcome: SearchV2Outcome, query: string): TextFoodLogPayload {
  const unknown = outcome.unknown_record
  return {
    id: newTextLogId(),
    name: unknown?.food_name ?? query.trim(),
    store: unknown?.restaurant ?? undefined,
    ...NULL_MACROS,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    nutrition_status: 'unknown',
    nutrition_confidence: 'Unknown',
    capture_status: 'photo_only',
    source: 'free_text',
    explanation: outcome.explanation,
  }
}

/** Resolve free-text meal — never guesses nutrition. */
export function resolveFreeTextMeal(query: string, ctx?: SearchV2Context): TextMealResolveResult {
  const trimmed = query.trim()
  const outcome = searchNutritionV2(trimmed, ctx)

  if (outcome.action === 'clarify') {
    return {
      can_commit: false,
      action: 'clarify',
      message:
        '目前沒有可信營養資料。菜名需要再確認一下，請從搜尋建議選擇正確品項，或建立純文字紀錄。',
      outcome,
    }
  }

  if (outcome.action === 'create_official' && outcome.official_record) {
    const clarified = outcome.level === 'B' || outcome.official_record.nutrition_confidence === 'B'
    return {
      can_commit: true,
      action: 'create_official',
      payload: officialPayload(outcome.official_record, clarified),
    }
  }

  if (outcome.action === 'pick_candidate' && outcome.official_record) {
    return {
      can_commit: true,
      action: 'create_official',
      payload: officialPayload(outcome.official_record, true),
    }
  }

  return {
    can_commit: true,
    action: 'create_unknown',
    payload: unknownPayload(outcome, trimmed),
  }
}

export function candidateToSearchHit(candidate: SearchV2Candidate) {
  return {
    id: candidate.id,
    name: candidate.name,
    store: candidate.store,
    calories: candidate.macros.calories ?? 0,
    protein_g: candidate.macros.protein ?? 0,
    carbs_g: candidate.macros.carbs ?? undefined,
    fat_g: candidate.macros.fat ?? undefined,
    nutrition_confidence: candidate.nutrition_confidence,
    nutrition_status: candidate.nutrition_status,
    explanation: candidate.explanation,
  }
}
