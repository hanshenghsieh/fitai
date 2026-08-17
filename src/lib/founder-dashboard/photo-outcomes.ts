import { PHOTO_PIPELINE_FAILURE_TYPES, type PhotoPipelineFailureType } from '@/lib/analytics/events'

/**
 * Phase 2 TASK 1 (AI Recognition Monitoring) + TASK 6 dashboard — aggregates
 * raw meal_log_started/succeeded/failed rows (source: 'photo') into the
 * counts the Founder Dashboard and "today's photo failure rate" answer need.
 * Pure function — the IO layer fetches rows, this just counts them.
 *
 * Conservation: attempts = success + failure + abandoned. `abandoned` is a
 * real, confirmed product behavior, not an instrumentation bug — every
 * PhotoLogSheet dismissal path (close button, backdrop click, Escape) resets
 * state without firing any terminal event (see TodayOS.tsx closePhotoSheet),
 * so a user who picks a photo and then backs out mid-flow leaves
 * meal_log_started with no matching succeeded/failed row. That is
 * indistinguishable from a genuine silent failure in the current event
 * taxonomy — a known limitation, documented rather than hidden.
 *
 * Resolution rate is a separate, stricter question than the success/failure
 * split above: a meal_log_succeeded row can still carry
 * nutrition_status='unknown' (the pipeline saved the log but never actually
 * resolved real nutrition data for it, e.g. no official DB match and no
 * usable AI estimate). Counting those as a resolved result would overstate
 * how often the pipeline actually delivers what it promises, so
 * resolvedCount excludes them.
 */
export interface PhotoOutcomeCounts {
  attempts: number
  success: number
  failure: number
  /** attempts - success - failure. Cancelled/backgrounded/no-terminal-event flows. Never negative under normal data; a negative value is itself a data-quality signal (see data-quality.ts). */
  abandoned: number
  failureRatePct: number | null
  failureByType: Record<PhotoPipelineFailureType, number>
  /** Of the `success` rows, how many actually resolved real nutrition data (nutrition_status !== 'unknown'). */
  resolvedCount: number
  /** resolvedCount / attempts, 0-100 one decimal place. Null when attempts is 0. */
  resolutionRatePct: number | null
}

export interface PhotoOutcomeEventRow {
  eventName: 'meal_log_started' | 'meal_log_succeeded' | 'meal_log_failed'
  source: string
  failureType?: string | null
  nutritionStatus?: string | null
}

function roundPct(value: number): number {
  return Math.round(value * 1000) / 10
}

export function summarizePhotoOutcomes(rows: PhotoOutcomeEventRow[]): PhotoOutcomeCounts {
  const photoRows = rows.filter(r => r.source === 'photo')
  const attempts = photoRows.filter(r => r.eventName === 'meal_log_started').length
  const successRows = photoRows.filter(r => r.eventName === 'meal_log_succeeded')
  const success = successRows.length
  const failureRows = photoRows.filter(r => r.eventName === 'meal_log_failed')
  const failure = failureRows.length
  const abandoned = attempts - success - failure

  const resolvedCount = successRows.filter(r => r.nutritionStatus !== 'unknown').length

  const failureByType = Object.fromEntries(
    PHOTO_PIPELINE_FAILURE_TYPES.map(type => [type, 0])
  ) as Record<PhotoPipelineFailureType, number>
  for (const row of failureRows) {
    if (row.failureType && row.failureType in failureByType) {
      failureByType[row.failureType as PhotoPipelineFailureType] += 1
    }
  }

  const failureDenominator = success + failure
  return {
    attempts,
    success,
    failure,
    abandoned,
    failureRatePct: failureDenominator > 0 ? roundPct(failure / failureDenominator) : null,
    failureByType,
    resolvedCount,
    resolutionRatePct: attempts > 0 ? roundPct(resolvedCount / attempts) : null,
  }
}

/** The single most common failure_type, or null when there are no failures. */
export function mostCommonFailureType(counts: PhotoOutcomeCounts): PhotoPipelineFailureType | null {
  let best: PhotoPipelineFailureType | null = null
  let bestCount = 0
  for (const type of PHOTO_PIPELINE_FAILURE_TYPES) {
    if (counts.failureByType[type] > bestCount) {
      best = type
      bestCount = counts.failureByType[type]
    }
  }
  return best
}
