import type { ClarificationSession, SearchV2Candidate } from '@/lib/nutrition/search-v2/types'
import type { ConfirmationQuestion, UserConfirmationAnswers } from '@/lib/nutrition/types'
import type { PhotoVisualParse } from '@/lib/nutrition/photo-visual-parse'
import { buildPhotoVisualParse } from '@/lib/nutrition/photo-visual-parse'
import {
  createPhotoV2State,
  finalizePhotoV2ToFoodLogPayload,
  photoV2DisplayCandidates,
  photoV2ReadyForLog,
  photoV2UiMessage,
  resolvePhotoV2Outcome,
  updatePhotoV2State,
  type PhotoV2State,
} from '@/lib/nutrition/search-v2/photo-pipeline'

export type { PhotoV2State }

export interface PhotoAccuracyState {
  label: string
  store?: string
  photo_id?: string
  image_hash?: string
  visual_parse: PhotoVisualParse
  photo_ai_original_candidates: string[]
  v2: PhotoV2State
  /** Mapped for PhotoLogSheet — Search V2 candidates (max 3) */
  candidates: Array<{ id: string; display_name: string; confidence: number }>
  /** Mapped clarification questions from Search V2 */
  confirmation_questions: ConfirmationQuestion[]
  answers: UserConfirmationAnswers
  ready_for_food_log: boolean
  ui_message: string
  show_macros: boolean
  nutrition_status: 'official' | 'estimated' | 'unknown'
}

export interface NutritionAccuracyLogMeta {
  accuracy_level: 'A' | 'B' | 'C' | 'Unknown'
  source_type: string
  user_confirmed: boolean
  candidate_label: string
  nutrition_status: 'official' | 'estimated' | 'unknown'
  explanation: string
}

function mapClarificationQuestions(session: ClarificationSession | null): ConfirmationQuestion[] {
  if (!session) return []
  return session.questions.slice(0, 3).map(q => ({
    id: q.id as ConfirmationQuestion['id'],
    prompt: q.prompt,
    options: q.options.map(o => ({ id: o.id, label: o.label })),
  }))
}

function mapCandidates(candidates: SearchV2Candidate[]) {
  return candidates.slice(0, 3).map(c => ({
    id: c.id,
    display_name: c.store ? `${c.store} · ${c.name}` : c.name,
    confidence: c.match_score / 100,
  }))
}

function buildPhotoAccuracyStateFromV2(v2: PhotoV2State): PhotoAccuracyState {
  const resolved = resolvePhotoV2Outcome(v2)
  const unknown = resolved.action === 'create_unknown'
  const levelA = resolved.level === 'A' && resolved.action === 'create_official'
  const needsConfirm = resolved.action === 'clarify' || resolved.level === 'B'
  const confirmed = v2.user_confirmed

  return {
    label: v2.detected_label,
    store: v2.store,
    photo_id: v2.photo_id,
    image_hash: v2.image_hash,
    visual_parse: v2.visual_parse,
    photo_ai_original_candidates: v2.photo_ai_original_candidates,
    v2,
    candidates: mapCandidates(photoV2DisplayCandidates(v2)),
    confirmation_questions: mapClarificationQuestions(v2.clarification),
    answers: {
      user_confirmed: v2.user_confirmed,
      selected_candidate_id: v2.selected_candidate_id,
      ...v2.answers,
    },
    ready_for_food_log: photoV2ReadyForLog(v2),
    ui_message: photoV2UiMessage(v2),
    show_macros: !unknown && (levelA || (needsConfirm && confirmed)),
    nutrition_status: unknown ? 'unknown' : 'official',
  }
}

export function buildPhotoAccuracyInput(label: string, opts?: { store?: string }) {
  return { label: label.trim() || '未知食物', store: opts?.store, photo_parse: true as const }
}

export function createPhotoAccuracyState(
  label: string,
  opts?: { store?: string; photo_id?: string; image_hash?: string; visual_parse?: PhotoVisualParse }
): PhotoAccuracyState {
  const visual_parse = opts?.visual_parse ?? buildPhotoVisualParse(label)
  const v2 = createPhotoV2State(label, { ...opts, visual_parse })
  return buildPhotoAccuracyStateFromV2(v2)
}

export function updatePhotoAccuracyState(
  state: PhotoAccuracyState,
  patch: Partial<UserConfirmationAnswers>
): PhotoAccuracyState {
  const clarificationKeys = state.v2.clarification?.questions.map(q => q.id) ?? []
  let v2 = state.v2

  for (const qid of clarificationKeys) {
    const val = (patch as Record<string, unknown>)[qid]
    if (typeof val === 'string') {
      v2 = updatePhotoV2State(v2, { clarification_answer: { questionId: qid, optionId: val } })
    }
  }

  v2 = updatePhotoV2State(v2, {
    user_confirmed: patch.user_confirmed,
    selected_candidate_id: patch.selected_candidate_id,
  })

  return buildPhotoAccuracyStateFromV2(v2)
}

export function photoAccuracyReadyForLog(state: PhotoAccuracyState): boolean {
  return state.ready_for_food_log
}

export function photoAccuracyDisplayMacros(state: PhotoAccuracyState): {
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
} {
  if (!state.show_macros) {
    return { calories: null, protein_g: null, carbs_g: null, fat_g: null }
  }
  const official = resolvePhotoV2Outcome(state.v2).official_record
  if (!official) {
    return { calories: null, protein_g: null, carbs_g: null, fat_g: null }
  }
  return {
    calories: official.macros.calories,
    protein_g: official.macros.protein,
    carbs_g: official.macros.carbs,
    fat_g: official.macros.fat,
  }
}

export function buildNutritionAccuracyLogMeta(state: PhotoAccuracyState): NutritionAccuracyLogMeta {
  const resolved = resolvePhotoV2Outcome(state.v2)
  const official = resolved.official_record
  return {
    accuracy_level:
      resolved.level === 'A' ? 'A' : resolved.level === 'B' ? 'B' : resolved.level === 'C' ? 'Unknown' : 'Unknown',
    source_type: official?.nutrition_source ?? 'ai_photo_label_only',
    user_confirmed: state.v2.user_confirmed,
    candidate_label: official?.name ?? state.label,
    nutrition_status: state.nutrition_status,
    explanation: resolved.explanation,
  }
}

export function buildPhotoLogCommitFromAccuracy(
  state: PhotoAccuracyState,
  opts: { id: string; photo_data_url?: string }
) {
  const payload = finalizePhotoV2ToFoodLogPayload(state.v2, {
    id: opts.id,
    photo_data_url: opts.photo_data_url,
  })
  return {
    payload,
    meta: payload ? buildNutritionAccuracyLogMeta(state) : null,
  }
}

export function refreshPhotoAccuracyFinal(state: PhotoAccuracyState): PhotoAccuracyState {
  return buildPhotoAccuracyStateFromV2(state.v2)
}
