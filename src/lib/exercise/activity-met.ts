import type { ActivityType, ExerciseIntensity } from '@/types'

/**
 * Deterministic MET-based calorie estimate for user-logged exercise.
 *
 * This is intentionally NOT wired into daily_targets.calories, calorie_bank,
 * or any weekly-plan math. The existing weekly-plan pipeline
 * (src/lib/workout-nutrition.ts) already bakes a 40% "eat-back" of the
 * *prescribed* workout's estimated burn into that day's calorie target at
 * plan-generation time — before the user does anything. Feeding a second,
 * independent calorie credit from actual logged exercise into the same
 * target or into calorie_bank's actual_kcal would double-count. Until that
 * eat-back architecture is reconciled in a dedicated iteration, exercise_logs
 * stays a display-only record: what happened + an estimate, nothing more.
 */

export const ACTIVITY_TYPES: readonly ActivityType[] = [
  'walking',
  'running',
  'cycling',
  'swimming',
  'strength_training',
  'other',
]

export const ACTIVITY_LABEL_ZH: Record<ActivityType, string> = {
  walking: '走路',
  running: '跑步',
  cycling: '騎自行車',
  swimming: '游泳',
  strength_training: '重量訓練',
  other: '其他',
}

/**
 * MET (Metabolic Equivalent of Task) — general/moderate-intensity default
 * per activity, from the Compendium of Physical Activities. These are
 * estimates for a typical session, not measurements of the specific one the
 * user just did. Centralized here so tuning a constant later doesn't touch
 * call sites — but note exercise_logs freezes the computed calories at save
 * time, so tuning these does not retroactively change past records.
 */
export const MET_VALUES: Record<ActivityType, number> = {
  walking: 3.5,
  running: 9.8,
  cycling: 7.5,
  swimming: 6.0,
  strength_training: 5.0,
  other: 4.0,
}

const DEFAULT_BODY_WEIGHT_KG = 70
const MIN_DURATION_MINUTES = 1
const MAX_DURATION_MINUTES = 600
export const MAX_ACTIVITY_LABEL_LENGTH = 40

export function isActivityType(value: unknown): value is ActivityType {
  return typeof value === 'string' && (ACTIVITY_TYPES as readonly string[]).includes(value)
}

export function isValidDurationMinutes(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= MIN_DURATION_MINUTES &&
    value <= MAX_DURATION_MINUTES
  )
}

/** Calories ≈ MET × body weight (kg) × duration (hours). Falls back to a 70kg reference weight when the profile has none. */
export function estimateCaloriesForMet(met: number, durationMinutes: number, bodyWeightKg?: number | null): number {
  const weight = bodyWeightKg && bodyWeightKg > 0 ? bodyWeightKg : DEFAULT_BODY_WEIGHT_KG
  const hours = Math.max(0, durationMinutes) / 60
  return Math.max(0, Math.round(met * weight * hours))
}

/** Calories for one of the 6 quick-pick buckets. For a custom "other" activity, use resolve-activity.ts + estimateCaloriesForMet instead. */
export function estimateExerciseCalories(
  activityType: ActivityType,
  durationMinutes: number,
  bodyWeightKg?: number | null
): number {
  const met = MET_VALUES[activityType] ?? MET_VALUES.other
  return estimateCaloriesForMet(met, durationMinutes, bodyWeightKg)
}

export const EXERCISE_INTENSITIES: readonly ExerciseIntensity[] = ['light', 'moderate', 'vigorous']

export const INTENSITY_LABEL_ZH: Record<ExerciseIntensity, string> = {
  light: '輕度',
  moderate: '中等',
  vigorous: '高強度',
}

/**
 * Conservative fallback MET per intensity tier — used only when a typed
 * custom activity doesn't match anything in the activity catalog. Better to
 * ask the user how hard it felt than to silently assign one arbitrary
 * generic MET to every unmatched activity.
 */
export const INTENSITY_MET: Record<ExerciseIntensity, number> = {
  light: 3,
  moderate: 5,
  vigorous: 8,
}

export function isExerciseIntensity(value: unknown): value is ExerciseIntensity {
  return value === 'light' || value === 'moderate' || value === 'vigorous'
}
