/**
 * Phase 2 TASK 3 — retention calculation (pure, DB-agnostic).
 *
 * "Active Food Logger" retention: a nutrition day counts as active for a
 * user only if they have at least one meal_log_succeeded event on that day
 * — NOT simply "opened the app" (see docs/founder-kpi-definitions.md).
 *
 * Day bucketing here uses the plain Asia/Taipei calendar day
 * (getTaipeiDateKey), not the in-app food-logging nutrition day (which
 * rolls over at 05:00 Taipei for calorie-bank UX reasons) — see
 * founder-dashboard/day-key.ts for why these are deliberately different.
 */

export const MIN_RETENTION_COHORT_SIZE = 5

export interface RetentionOffsetResult {
  offsetDays: number
  cohortSize: number
  activeCount: number
  /** Percentage 0-100, one decimal place. Null when cohortSize is 0 (nothing to divide by). */
  retentionPct: number | null
  /** True when cohortSize < MIN_RETENTION_COHORT_SIZE — UI must show "Insufficient data", not a lone percentage. */
  insufficientData: boolean
}

export interface RetentionCohortInput {
  /** userId -> the Taipei day their first_meal_logged event happened (cohort Day0). */
  cohortDayByUser: Map<string, string>
  /** userId -> set of Taipei days on which they had a meal_log_succeeded event. */
  activeDaysByUser: Map<string, Set<string>>
}

function roundPct(value: number): number {
  return Math.round(value * 1000) / 10
}

export function calculateRetentionForOffset(
  input: RetentionCohortInput,
  offsetDays: number,
  addDaysToTaipeiDateKey: (day: string, offset: number) => string
): RetentionOffsetResult {
  let cohortSize = 0
  let activeCount = 0
  for (const [userId, day0] of input.cohortDayByUser) {
    cohortSize += 1
    const targetDay = addDaysToTaipeiDateKey(day0, offsetDays)
    if (input.activeDaysByUser.get(userId)?.has(targetDay)) {
      activeCount += 1
    }
  }
  return {
    offsetDays,
    cohortSize,
    activeCount,
    retentionPct: cohortSize > 0 ? roundPct(activeCount / cohortSize) : null,
    insufficientData: cohortSize < MIN_RETENTION_COHORT_SIZE,
  }
}

export function calculateRetentionCurve(
  input: RetentionCohortInput,
  offsetsDays: readonly number[],
  addDaysToTaipeiDateKey: (day: string, offset: number) => string
): RetentionOffsetResult[] {
  return offsetsDays.map(offset => calculateRetentionForOffset(input, offset, addDaysToTaipeiDateKey))
}

/** Dashboard display formatting — always shows cohort size, never a bare percentage. */
export function formatRetentionResult(result: RetentionOffsetResult): string {
  if (result.insufficientData || result.retentionPct == null) return 'Insufficient data'
  return `${result.retentionPct}% (${result.activeCount} / ${result.cohortSize})`
}
