import { PHOTO_PIPELINE_FAILURE_TYPES, type PhotoPipelineFailureType } from '@/lib/analytics/events'

/**
 * Best-effort classification of a photo/manual nutrition pipeline failure
 * into the canonical taxonomy (shared with the meal_log_failed analytics
 * event and Sentry error tags). This repo has no typed error hierarchy for
 * the AI/matching pipeline today, so classification is pattern-matched
 * against the error name/message — good enough to answer "what's the most
 * common failure type" without needing a larger refactor, and can be
 * tightened later by throwing typed errors at each stage instead.
 */
export function classifyPipelineFailure(error: unknown): PhotoPipelineFailureType {
  const name = error instanceof Error ? error.name : ''
  const message = error instanceof Error ? error.message : String(error ?? '')
  const haystack = `${name} ${message}`

  if (name === 'AbortError' || /timeout|timed out|aborted/i.test(haystack)) return 'timeout'
  if (/network|fetch failed|ECONNRESET|ENOTFOUND|EAI_AGAIN|failed to fetch/i.test(haystack)) {
    return 'network_error'
  }
  if (/anthropic|claude|rate limit|overloaded|5\d\d/i.test(haystack)) return 'provider_error'
  if (/schema|validation|invalid.*shape|unexpected shape/i.test(haystack)) return 'schema_error'
  if (/json|unexpected token|parse/i.test(haystack)) return 'parse_error'
  if (/no food|not.*food.*detected|empty result/i.test(haystack)) return 'no_food_detected'
  if (/no match|not found in menu|match failed|no matching item/i.test(haystack)) {
    return 'database_match_failed'
  }
  return 'unknown_error'
}

export function isPhotoPipelineFailureType(value: unknown): value is PhotoPipelineFailureType {
  return (
    typeof value === 'string' &&
    (PHOTO_PIPELINE_FAILURE_TYPES as readonly string[]).includes(value)
  )
}
