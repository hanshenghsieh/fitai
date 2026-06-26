/**
 * Photo Nutrition Pipeline — same rules as Nutrition Search V2.
 * AI photo label is candidate source only; never final nutrition.
 */
import type {
  ClarificationSession,
  NutritionConfidence,
  NutritionMacros,
  NutritionStatus,
  SearchV2Candidate,
  SearchV2Context,
  SearchV2Outcome,
} from '@/lib/nutrition/search-v2/types'
import { NULL_MACROS } from '@/lib/nutrition/search-v2/types'
import { searchNutritionV2Client as searchNutritionV2, finalizeClarification } from '@/lib/nutrition/search-v2/search-client'
import {
  applyClarificationAnswer,
  clarificationComplete,
} from '@/lib/nutrition/search-v2/clarification'
import { enqueueUnknownPhoto } from '@/lib/nutrition/search-v2/unknown-photo-queue'
import { explainConfidence } from '@/lib/nutrition/search-v2/confidence'

export interface PhotoV2State {
  detected_label: string
  store?: string
  photo_id?: string
  image_hash?: string
  outcome: SearchV2Outcome
  clarification: ClarificationSession | null
  answers: Record<string, string>
  user_confirmed: boolean
  selected_candidate_id?: string
}

export interface PhotoV2FoodLogPayload {
  id: string
  name: string
  store?: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fiber_g: number | null
  sugar_g: number | null
  sodium_mg: number | null
  nutrition_status: NutritionStatus
  nutrition_confidence: NutritionConfidence
  source: 'photo'
  user_declared: true
  logged_at: string
  capture_status: 'resolved' | 'photo_only'
  explanation: string
  ui_message?: string
  photo_data_url?: string
  /** Never ai_photo_only when writing nutrition — only verified sources */
  nutrition_source?: string
}

const UNRECOGNIZED_LABELS = /^(未知食物|無法辨識|不清楚|unknown)$/i

export function isUnrecognizablePhotoLabel(label: string): boolean {
  const t = label.trim()
  return !t || UNRECOGNIZED_LABELS.test(t)
}

export function createPhotoV2State(
  detectedLabel: string,
  opts?: {
    store?: string
    photo_id?: string
    image_hash?: string
    ctx?: SearchV2Context
  }
): PhotoV2State {
  const label = detectedLabel.trim() || '未知食物'
  const outcome = isUnrecognizablePhotoLabel(label)
    ? buildPhotoUnknownOutcome(label, [])
    : searchNutritionV2(label, opts?.ctx)

  if (outcome.action === 'create_unknown') {
    enqueueUnknownPhoto({
      detected_label: label,
      restaurant: opts?.store ?? null,
      photo_id: opts?.photo_id ?? null,
      image_hash: opts?.image_hash ?? null,
      possible_matches: outcome.candidates.slice(0, 3).map(c => c.name),
    })
  }

  return {
    detected_label: label,
    store: opts?.store,
    photo_id: opts?.photo_id,
    image_hash: opts?.image_hash,
    outcome,
    clarification: outcome.clarification ?? null,
    answers: {},
    user_confirmed: false,
  }
}

function buildPhotoUnknownOutcome(query: string, candidates: SearchV2Candidate[]): SearchV2Outcome {
  return {
    level: 'C',
    action: 'create_unknown',
    query,
    explanation: '完全沒有可信營養資料，建立 Photo Only Record。',
    candidates,
    unknown_record: {
      food_name: query,
      restaurant: null,
      nutrition_status: 'unknown',
      nutrition_confidence: 'Unknown',
      macros: NULL_MACROS,
      ui_message: '目前沒有可信營養資料。可以先保存照片紀錄，之後找到資料再更新。',
    },
  }
}

export function updatePhotoV2State(
  state: PhotoV2State,
  patch: Partial<{
    answers: Record<string, string>
    user_confirmed: boolean
    selected_candidate_id: string
    clarification_answer: { questionId: string; optionId: string }
  }>
): PhotoV2State {
  let clarification = state.clarification
  if (patch.clarification_answer && clarification) {
    clarification = applyClarificationAnswer(
      clarification,
      patch.clarification_answer.questionId,
      patch.clarification_answer.optionId
    )
  }

  const answers = { ...state.answers, ...patch.answers }
  if (patch.clarification_answer) {
    answers[patch.clarification_answer.questionId] = patch.clarification_answer.optionId
  }

  return {
    ...state,
    clarification,
    answers,
    user_confirmed: patch.user_confirmed ?? state.user_confirmed,
    selected_candidate_id: patch.selected_candidate_id ?? state.selected_candidate_id,
  }
}

export function resolvePhotoV2Outcome(state: PhotoV2State): SearchV2Outcome {
  if (state.outcome.action === 'clarify' && state.clarification) {
    const session: ClarificationSession = {
      ...state.clarification,
      answers: { ...state.clarification.answers, ...state.answers },
    }
    if (clarificationComplete(session)) {
      return finalizeClarification(session)
    }
    return { ...state.outcome, clarification: session }
  }
  return state.outcome
}

/** Photo cannot be looser than text search — Level A only without confirm */
export function photoV2ReadyForLog(state: PhotoV2State): boolean {
  const resolved = resolvePhotoV2Outcome(state)

  if (resolved.action === 'create_official' && resolved.level === 'A') {
    return Boolean(resolved.official_record)
  }

  if (resolved.action === 'pick_candidate' || (resolved.action === 'create_official' && resolved.level === 'B')) {
    return state.user_confirmed && Boolean(resolved.official_record)
  }

  if (resolved.action === 'create_unknown') {
    return true
  }

  if (resolved.action === 'clarify') {
    return false
  }

  return false
}

export function photoV2UiMessage(state: PhotoV2State): string {
  const resolved = resolvePhotoV2Outcome(state)
  if (resolved.action === 'create_unknown') {
    return resolved.unknown_record?.ui_message ?? '目前沒有可信營養資料。可以先保存照片紀錄，之後找到資料再更新。'
  }
  if (resolved.action === 'clarify') {
    return '我想先確認一下'
  }
  return resolved.explanation
}

export function photoV2DisplayCandidates(state: PhotoV2State): SearchV2Candidate[] {
  const resolved = resolvePhotoV2Outcome(state)
  return resolved.candidates.filter(c => c.source_tier !== 'unknown').slice(0, 3)
}

function candidateToMacros(c: SearchV2Candidate): NutritionMacros {
  return { ...c.macros }
}

export function finalizePhotoV2ToFoodLogPayload(
  state: PhotoV2State,
  opts: { id: string; logged_at?: string; photo_data_url?: string }
): PhotoV2FoodLogPayload | null {
  if (!photoV2ReadyForLog(state)) return null

  const resolved = resolvePhotoV2Outcome(state)
  const logged_at = opts.logged_at ?? new Date().toISOString()

  if (resolved.action === 'create_unknown' || resolved.level === 'C') {
    const unknown = resolved.unknown_record
    enqueueUnknownPhoto({
      detected_label: state.detected_label,
      user_label: state.detected_label,
      restaurant: state.store ?? null,
      photo_id: state.photo_id ?? null,
      image_hash: state.image_hash ?? null,
      possible_matches: resolved.candidates.slice(0, 5).map(c => c.name),
    })
    return {
      id: opts.id,
      name: unknown?.food_name ?? state.detected_label,
      store: state.store,
      ...NULL_MACROS,
      protein_g: null,
      carbs_g: null,
      fat_g: null,
      fiber_g: null,
      sugar_g: null,
      sodium_mg: null,
      nutrition_status: 'unknown',
      nutrition_confidence: 'Unknown',
      source: 'photo',
      user_declared: true,
      logged_at,
      capture_status: 'photo_only',
      explanation: resolved.explanation,
      ui_message: unknown?.ui_message,
      photo_data_url: opts.photo_data_url,
    }
  }

  const official = resolved.official_record
  if (!official) return null

  const macros = candidateToMacros(official)
  const confidence: NutritionConfidence =
    resolved.level === 'A' && !state.user_confirmed ? 'A' : 'B'

  return {
    id: opts.id,
    name: official.name,
    store: official.store ?? state.store,
    calories: macros.calories,
    protein_g: macros.protein,
    carbs_g: macros.carbs,
    fat_g: macros.fat,
    fiber_g: macros.fiber,
    sugar_g: macros.sugar,
    sodium_mg: macros.sodium,
    nutrition_status: 'official',
    nutrition_confidence: confidence,
    source: 'photo',
    user_declared: true,
    logged_at,
    capture_status: 'resolved',
    explanation: explainConfidence(confidence, official.nutrition_source),
    nutrition_source: official.nutrition_source,
    photo_data_url: opts.photo_data_url,
  }
}

/** Bridge for accuracy-engine.runPhotoAccuracyPipeline */
export function runPhotoSearchV2Pipeline(
  label: string,
  opts?: {
    store?: string
    photo_id?: string
    image_hash?: string
    ctx?: SearchV2Context
    user_confirmed?: boolean
    clarification_answers?: Record<string, string>
  }
) {
  let state = createPhotoV2State(label, opts)
  if (opts?.clarification_answers) {
    for (const [questionId, optionId] of Object.entries(opts.clarification_answers)) {
      state = updatePhotoV2State(state, { clarification_answer: { questionId, optionId } })
    }
  }
  if (opts?.user_confirmed) {
    state = updatePhotoV2State(state, { user_confirmed: true })
  }
  const resolved = resolvePhotoV2Outcome(state)
  return { state, resolved, ready: photoV2ReadyForLog(state), payload: finalizePhotoV2ToFoodLogPayload(state, { id: 'preview' }) }
}
