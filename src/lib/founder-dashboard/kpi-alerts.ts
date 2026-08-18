import type { FunnelStageResult } from './funnel'
import type { RetentionOffsetResult } from './retention'
import type { PhotoOutcomeCounts } from './photo-outcomes'

/**
 * Founder Attention System — pure, deterministic KPI alert classification.
 *
 * This module reads *already-computed* results from funnel.ts / retention.ts
 * / photo-outcomes.ts / queries.ts and classifies them into a display-only
 * severity level. It never recomputes a metric, never changes a cohort
 * definition, and never touches the data-quality invariant checks in
 * data-quality.ts (those stay a separate, always-danger concern — a
 * data-quality violation means the number itself is untrustworthy, not that
 * it's "low"). This file only answers: given a number that is already known
 * to be trustworthy, is it good enough that the founder can ignore it today?
 *
 * 'insufficient_data' is a first-class outcome, not a fallback — a metric
 * with no valid denominator (attempts=0, trial cohort=0, retention cohort
 * too young/too small) must never be silently coerced into a 0% that then
 * reads as danger. Every function below checks for the "no valid value"
 * case *before* comparing thresholds, and never uses `value || 0`-style
 * coercion that would conflate "genuinely zero" with "undefined."
 */
export type KpiAlertLevel = 'normal' | 'danger' | 'insufficient_data'

/** Display color for each level. `undefined` for 'normal' means "don't override the existing default color." */
export const KPI_ALERT_COLOR: Record<KpiAlertLevel, string | undefined> = {
  normal: undefined,
  danger: '#c0392b',
  insufficient_data: '#999',
}

/** Activation Rate = the funnel's firstMealLogged stage. < 30% is danger. Null conversionPct (empty accountCreated cohort) is insufficient data, never danger. */
export function activationRateAlert(stage: Pick<FunnelStageResult, 'conversionPct'> | undefined): KpiAlertLevel {
  if (!stage || stage.conversionPct == null) return 'insufficient_data'
  return stage.conversionPct < 30 ? 'danger' : 'normal'
}

/** D1/D3/D7 retention. Pass `dangerBelowPct: null` for offsets with no defined threshold yet (D3) — those stay 'normal' whenever there's valid data, never flagged. insufficientData (below MIN_RETENTION_COHORT_SIZE, or every member not yet eligible) always wins over any threshold check. */
export function retentionAlert(result: RetentionOffsetResult, dangerBelowPct: number | null): KpiAlertLevel {
  if (result.insufficientData || result.retentionPct == null) return 'insufficient_data'
  if (dangerBelowPct == null) return 'normal'
  return result.retentionPct < dangerBelowPct ? 'danger' : 'normal'
}

/** Photo Resolution Rate. < 80% is danger. attempts=0 (no sample) is insufficient data, never a red 0%. */
export function photoResolutionRateAlert(photo: Pick<PhotoOutcomeCounts, 'attempts' | 'resolutionRatePct'>): KpiAlertLevel {
  if (photo.attempts === 0 || photo.resolutionRatePct == null) return 'insufficient_data'
  return photo.resolutionRatePct < 80 ? 'danger' : 'normal'
}

/** Photo Failure Rate (success+failure denominator, unchanged formula). > 10% is danger. A null rate (denominator 0) is insufficient data, never danger. */
export function photoFailureRateAlert(photo: Pick<PhotoOutcomeCounts, 'failureRatePct'>): KpiAlertLevel {
  if (photo.failureRatePct == null) return 'insufficient_data'
  return photo.failureRatePct > 10 ? 'danger' : 'normal'
}

/** Trial -> Paid conversion (cohort-intersected, from FunnelWithConversions.trialToPaidPct). < 5% is danger — including a real 0% when the trial cohort is non-empty. Null (trial cohort is empty, nothing to convert from) is insufficient data, never a red 0%. */
export function trialToPaidAlert(trialToPaidPct: number | null): KpiAlertLevel {
  if (trialToPaidPct == null) return 'insufficient_data'
  return trialToPaidPct < 5 ? 'danger' : 'normal'
}

/** Real system/photo failure counts (e.g. today's or last-7-days' photo.failure). Any count > 0 is danger — these are error counts, not statistical rates, so there's no "insufficient data" state: 0 is always a known, valid, good answer. */
export function errorCountAlert(count: number): KpiAlertLevel {
  return count > 0 ? 'danger' : 'normal'
}

/** The "most common failure type" row. Danger whenever there is at least one failure to name; insufficient data (renders as "—") when there are none — never danger on an empty "—". */
export function mostCommonFailureTypeAlert(failureCount: number): KpiAlertLevel {
  return failureCount > 0 ? 'danger' : 'insufficient_data'
}

/** The existing data-quality invariant banner (collectDashboardWarnings) restyled into the same red/normal vocabulary as the rest of this system — the check logic itself is untouched, this only classifies its output for consistent presentation. */
export function dataQualityAlert(warningCount: number): KpiAlertLevel {
  return warningCount > 0 ? 'danger' : 'normal'
}
