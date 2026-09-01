import type { ActivityType, ExerciseIntensity } from '@/types'
import { ACTIVITY_LABEL_ZH, INTENSITY_MET, MAX_ACTIVITY_LABEL_LENGTH, MET_VALUES, isExerciseIntensity } from './activity-met'
import { resolveActivityCatalogEntry } from './activity-catalog'

export interface ResolvedExerciseActivity {
  activity_name: string
  met_value: number
  intensity: ExerciseIntensity | null
  /** Preserved for the pre-existing activity_label column — 'other' only, same as before. */
  activity_label: string | null
  matched_catalog_id: string | null
}

export type ResolveExerciseActivityResult =
  | { ok: true; value: ResolvedExerciseActivity }
  | { ok: false; error: 'label_required' | 'unmatched_activity_needs_intensity' | 'invalid_intensity' }

/**
 * Single source of truth for turning a save request into a frozen
 * (activity_name, met_value) pair — shared by the client preview and the
 * server route so they can never disagree about what an estimate means.
 *
 * Preset buckets (walking/running/cycling/swimming/strength_training)
 * resolve directly from MET_VALUES, unchanged from before this iteration.
 * 'other' resolves against the activity catalog first (exact alias match);
 * if nothing matches, the caller must supply an intensity tier instead of
 * silently getting one arbitrary generic MET.
 */
export function resolveExerciseLogActivity(
  activityType: ActivityType,
  rawLabel: unknown,
  rawIntensity: unknown
): ResolveExerciseActivityResult {
  if (activityType !== 'other') {
    return {
      ok: true,
      value: {
        activity_name: ACTIVITY_LABEL_ZH[activityType],
        met_value: MET_VALUES[activityType],
        intensity: null,
        activity_label: null,
        matched_catalog_id: null,
      },
    }
  }

  const label = typeof rawLabel === 'string' ? rawLabel.trim().slice(0, MAX_ACTIVITY_LABEL_LENGTH) : ''
  if (!label) return { ok: false, error: 'label_required' }

  const catalogEntry = resolveActivityCatalogEntry(label)
  if (catalogEntry) {
    return {
      ok: true,
      value: {
        activity_name: catalogEntry.name_zh,
        met_value: catalogEntry.met,
        intensity: null,
        activity_label: label,
        matched_catalog_id: catalogEntry.id,
      },
    }
  }

  if (rawIntensity == null) return { ok: false, error: 'unmatched_activity_needs_intensity' }
  if (!isExerciseIntensity(rawIntensity)) return { ok: false, error: 'invalid_intensity' }

  return {
    ok: true,
    value: {
      activity_name: label,
      met_value: INTENSITY_MET[rawIntensity],
      intensity: rawIntensity,
      activity_label: label,
      matched_catalog_id: null,
    },
  }
}
