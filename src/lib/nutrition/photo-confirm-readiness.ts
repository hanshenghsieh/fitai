/**
 * Whether PhotoLogSheet's primary Confirm button should be disabled — pulled
 * out of PhotoReviewFooter's inline expression so the "no premature confirm"
 * invariant is unit testable without a DOM. Uses only existing draft state
 * (draft.loading, draft.matchingNutrition, the already-computed
 * iosLiteMode/readyForLog) — no new state introduced.
 *
 * iosLiteMode is a deliberate exception: its primary action is "save the
 * photo now, resolve nutrition later" (savePhotoOnly) and never claims
 * resolved macros, so it isn't gated on matchingNutrition — gating it would
 * regress that existing, intentionally-lighter commitment.
 */
export interface PhotoConfirmReadinessInput {
  loading: boolean
  matchingNutrition?: boolean
  saving?: boolean
  nameTrim: string
  iosLiteMode: boolean
  hasSavePhotoOnly: boolean
  readyForLog: boolean
}

export function isPhotoConfirmDisabled(input: PhotoConfirmReadinessInput): boolean {
  if (input.loading || input.saving || !input.nameTrim) return true
  if (input.iosLiteMode) return !input.hasSavePhotoOnly
  return !input.readyForLog || !!input.matchingNutrition
}
