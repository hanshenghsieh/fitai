import {
  finalizeNutritionEstimate,
  finalizeToFoodLogPayload,
  runPhotoAccuracyPipeline,
} from './accuracy-engine'
import type {
  AccuracyEngineInput,
  FoodCandidate,
  FinalNutritionEstimate,
  NutritionEstimateDraft,
  PortionAdjustment,
  UserConfirmationAnswers,
} from './types'
import { resolveMenuFromQuery } from '@/lib/food-menu-lookup'

export interface PhotoAccuracyState {
  label: string
  store?: string
  candidates: FoodCandidate[]
  draft: NutritionEstimateDraft
  answers: UserConfirmationAnswers
  final: FinalNutritionEstimate
}

export interface NutritionAccuracyLogMeta {
  accuracy_level: FinalNutritionEstimate['accuracy_level']
  source_type: FinalNutritionEstimate['source_type']
  user_confirmed: boolean
  portion_adjustments: PortionAdjustment
  candidate_label: string
}

export function buildPhotoAccuracyInput(
  label: string,
  opts?: { store?: string; location_context?: string }
): AccuracyEngineInput {
  return {
    label: label.trim() || '未知食物',
    store: opts?.store,
    location_context: opts?.location_context,
    photo_parse: true,
    source_type: 'ai_photo_only',
  }
}

export function createPhotoAccuracyState(
  label: string,
  opts?: { store?: string; location_context?: string }
): PhotoAccuracyState {
  const verified = resolveMenuFromQuery(label, opts?.store)
  const input: AccuracyEngineInput = verified
    ? {
        label: label.trim() || '未知食物',
        store: verified.store ?? opts?.store,
        location_context: opts?.location_context,
        photo_parse: true,
        source_type: 'verified_brand_menu',
        verified_menu: {
          kcal: verified.calories,
          protein_g: verified.protein_g,
          carbs_g: verified.carbs_g,
          fat_g: verified.fat_g,
          requires_confirmation: false,
          high_risk_tags: [],
        },
      }
    : buildPhotoAccuracyInput(label, opts)
  const { candidates, draft, final } = runPhotoAccuracyPipeline(input)
  return {
    label: input.label,
    store: opts?.store ?? verified?.store,
    candidates,
    draft,
    answers: { user_confirmed: false },
    final,
  }
}

export function updatePhotoAccuracyState(
  state: PhotoAccuracyState,
  patch: Partial<UserConfirmationAnswers>
): PhotoAccuracyState {
  const answers: UserConfirmationAnswers = {
    ...state.answers,
    ...patch,
    user_confirmed: patch.user_confirmed ?? state.answers.user_confirmed ?? false,
  }
  const input = buildPhotoAccuracyInput(state.label, { store: state.store })
  const { candidates, draft, final } = runPhotoAccuracyPipeline(input, answers)
  return { ...state, candidates, draft, answers, final }
}

export function photoAccuracyReadyForLog(state: PhotoAccuracyState): boolean {
  return state.final.ready_for_food_log
}

export function mergePortionAdjustments(
  draft: NutritionEstimateDraft,
  answers: UserConfirmationAnswers
): PortionAdjustment {
  return {
    ...draft.adjustments,
    rice_portion: (answers.rice_portion as PortionAdjustment['rice_portion']) ?? draft.adjustments.rice_portion,
    cooking_method: (answers.cooking_method as PortionAdjustment['cooking_method']) ?? draft.adjustments.cooking_method,
    drink_sugar: (answers.drink_sugar as PortionAdjustment['drink_sugar']) ?? draft.adjustments.drink_sugar,
    sauce_level: (answers.sauce_level as PortionAdjustment['sauce_level']) ?? draft.adjustments.sauce_level,
    portion_size: (answers.portion_size as PortionAdjustment['portion_size']) ?? draft.adjustments.portion_size,
  }
}

export function buildNutritionAccuracyLogMeta(state: PhotoAccuracyState): NutritionAccuracyLogMeta {
  return {
    accuracy_level: state.final.accuracy_level,
    source_type: state.final.source_type,
    user_confirmed: state.final.user_confirmed,
    portion_adjustments: mergePortionAdjustments(state.draft, state.answers),
    candidate_label: state.draft.candidate.display_name,
  }
}

export function buildPhotoLogCommitFromAccuracy(
  state: PhotoAccuracyState,
  opts: { id: string; photo_data_url?: string }
): {
  payload: ReturnType<typeof finalizeToFoodLogPayload>
  meta: NutritionAccuracyLogMeta | null
} {
  if (!photoAccuracyReadyForLog(state)) {
    return { payload: null, meta: null }
  }
  const payload = finalizeToFoodLogPayload(state.final, {
    id: opts.id,
    logged_at: new Date().toISOString(),
    source: 'photo',
  })
  return {
    payload,
    meta: payload
      ? {
          accuracy_level: state.final.accuracy_level,
          source_type: state.answers.user_confirmed ? 'user_confirmed_estimate' : 'ai_photo_only',
          user_confirmed: state.final.user_confirmed,
          portion_adjustments: mergePortionAdjustments(state.draft, state.answers),
          candidate_label: state.draft.candidate.display_name,
        }
      : null,
  }
}

/** Recompute final estimate after UI edits without forcing confirm */
export function refreshPhotoAccuracyFinal(state: PhotoAccuracyState): PhotoAccuracyState {
  const input = buildPhotoAccuracyInput(state.label, { store: state.store })
  const selected =
    state.candidates.find(c => c.id === state.answers.selected_candidate_id) ?? state.candidates[0]!
  const { draft } = runPhotoAccuracyPipeline(input, state.answers)
  const final = finalizeNutritionEstimate(draft, state.answers)
  return { ...state, draft, final }
}
