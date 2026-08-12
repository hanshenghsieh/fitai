import { PHOTO_PIPELINE_FAILURE_TYPES, type PhotoPipelineFailureType } from '@/lib/analytics/events'

/**
 * Phase 2 TASK 1 (AI Recognition Monitoring) + TASK 6 dashboard — aggregates
 * raw meal_log_started/succeeded/failed rows (source: 'photo') into the
 * counts the Founder Dashboard and "today's photo failure rate" answer need.
 * Pure function — the IO layer fetches rows, this just counts them.
 */
export interface PhotoOutcomeCounts {
  attempts: number
  success: number
  failure: number
  failureRatePct: number | null
  failureByType: Record<PhotoPipelineFailureType, number>
}

export interface PhotoOutcomeEventRow {
  eventName: 'meal_log_started' | 'meal_log_succeeded' | 'meal_log_failed'
  source: string
  failureType?: string | null
}

export function summarizePhotoOutcomes(rows: PhotoOutcomeEventRow[]): PhotoOutcomeCounts {
  const photoRows = rows.filter(r => r.source === 'photo')
  const attempts = photoRows.filter(r => r.eventName === 'meal_log_started').length
  const success = photoRows.filter(r => r.eventName === 'meal_log_succeeded').length
  const failureRows = photoRows.filter(r => r.eventName === 'meal_log_failed')
  const failure = failureRows.length

  const failureByType = Object.fromEntries(
    PHOTO_PIPELINE_FAILURE_TYPES.map(type => [type, 0])
  ) as Record<PhotoPipelineFailureType, number>
  for (const row of failureRows) {
    if (row.failureType && row.failureType in failureByType) {
      failureByType[row.failureType as PhotoPipelineFailureType] += 1
    }
  }

  const denominator = success + failure
  return {
    attempts,
    success,
    failure,
    failureRatePct: denominator > 0 ? Math.round((failure / denominator) * 1000) / 10 : null,
    failureByType,
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
