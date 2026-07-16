export { searchNutritionV2, finalizeClarification } from '@/lib/nutrition/search-v2/search-nutrition-v2-core'

export {
  getUnknownAnalytics,
  listUnknownQueue,
  getFounderUnknownDashboard,
} from '@/lib/nutrition/search-v2/unknown-queue'
export { runAutoRematch, applyRematchProposal } from '@/lib/nutrition/search-v2/auto-rematch'
export { collectAllCandidates } from '@/lib/nutrition/search-v2/matcher'
export { rankSearchCandidates } from '@/lib/nutrition/search-v2/search-ranking'

export {
  createPhotoV2State,
  finalizePhotoV2ToFoodLogPayload,
  photoV2ReadyForLog,
  runPhotoSearchV2Pipeline,
} from '@/lib/nutrition/search-v2/photo-pipeline'

export {
  resolveFreeTextMeal,
  candidateToSearchHit,
  type TextFoodLogPayload,
  type TextMealResolveResult,
} from '@/lib/nutrition/search-v2/text-log-pipeline'

export { enqueueUnknownPhoto, listUnknownPhotoQueue } from '@/lib/nutrition/search-v2/unknown-photo-queue'

export type {
  SearchV2Context,
  SearchV2Outcome,
  SearchV2Candidate,
  ClarificationSession,
} from '@/lib/nutrition/search-v2/types'
