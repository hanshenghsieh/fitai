import type { ConfirmationQuestion } from '@/lib/nutrition/types'
import { PHOTO_UI_CANDIDATE_LIMIT } from '@/lib/nutrition/photo-display-limits'
import {
  photoV2DisplayCandidates,
  photoV2ReadyForLog,
  photoV2UiMessage,
  resolvePhotoOfficialRecord,
  resolvePhotoV2Outcome,
  type PhotoV2State,
} from '@/lib/nutrition/search-v2/photo-pipeline'
import type { SearchV2Candidate, SearchV2Outcome } from '@/lib/nutrition/search-v2/types'

/** Slim PhotoV2State for client hydration — caps candidate payload size. */
export type PhotoMatchSnapshot = PhotoV2State

function slimCandidate(candidate: SearchV2Candidate): SearchV2Candidate {
  return {
    id: candidate.id,
    name: candidate.name,
    store: candidate.store,
    macros: candidate.macros,
    nutrition_status: candidate.nutrition_status,
    nutrition_confidence: candidate.nutrition_confidence,
    nutrition_source: candidate.nutrition_source,
    source_tier: candidate.source_tier,
    match_score: candidate.match_score,
    explanation: candidate.explanation.slice(0, 160),
  }
}

function slimOutcome(outcome: SearchV2Outcome): SearchV2Outcome {
  const candidates = outcome.candidates.slice(0, PHOTO_UI_CANDIDATE_LIMIT).map(slimCandidate)
  return {
    ...outcome,
    candidates,
    official_record: outcome.official_record ? slimCandidate(outcome.official_record) : undefined,
    clarification: outcome.clarification
      ? {
          ...outcome.clarification,
          questions: outcome.clarification.questions.slice(0, 3),
        }
      : undefined,
  }
}

export function buildPhotoMatchSnapshot(v2: PhotoV2State): PhotoMatchSnapshot {
  const resolved = resolvePhotoV2Outcome(v2)
  return {
    detected_label: v2.detected_label,
    store: v2.store,
    photo_id: v2.photo_id,
    image_hash: v2.image_hash,
    visual_parse: v2.visual_parse,
    photo_ai_original_candidates: v2.photo_ai_original_candidates.slice(0, 5),
    outcome: slimOutcome(resolved),
    clarification: v2.clarification
      ? {
          ...v2.clarification,
          questions: v2.clarification.questions.slice(0, 3),
        }
      : null,
    answers: {},
    user_confirmed: false,
    selected_candidate_id: undefined,
  }
}

export function photoMatchDisplayFromSnapshot(snapshot: PhotoMatchSnapshot): {
  name: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  ready_for_log: boolean
  ui_message: string
  show_macros: boolean
  candidates: Array<{ id: string; display_name: string; confidence: number }>
  confirmation_questions: ConfirmationQuestion[]
} {
  const resolved = resolvePhotoV2Outcome(snapshot)
  const unknown = resolved.action === 'create_unknown'
  const levelA = resolved.level === 'A' && resolved.action === 'create_official'
  const picked = resolvePhotoOfficialRecord(snapshot)

  return {
    name: picked?.name ?? snapshot.detected_label,
    calories: picked?.macros.calories ?? null,
    protein_g: picked?.macros.protein ?? null,
    carbs_g: picked?.macros.carbs ?? null,
    fat_g: picked?.macros.fat ?? null,
    ready_for_log: photoV2ReadyForLog(snapshot),
    ui_message: photoV2UiMessage(snapshot),
    show_macros: !unknown && (levelA || Boolean(picked)),
    candidates: photoV2DisplayCandidates(snapshot).slice(0, PHOTO_UI_CANDIDATE_LIMIT).map(c => ({
      id: c.id,
      display_name: c.store ? `${c.store} · ${c.name}` : c.name,
      confidence: c.match_score / 100,
    })),
    confirmation_questions: (snapshot.clarification?.questions ?? []).slice(0, 3).map(q => ({
      id: q.id as ConfirmationQuestion['id'],
      prompt: q.prompt,
      options: q.options.map(o => ({ id: o.id, label: o.label })),
    })),
  }
}
