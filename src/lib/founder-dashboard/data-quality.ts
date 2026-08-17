import type { FunnelStageResult } from './funnel'
import type { PhotoOutcomeCounts } from './photo-outcomes'
import type { RetentionOffsetResult } from './retention'
import type { SubscriptionOverview } from './queries'

/**
 * Founder Dashboard data-quality invariants (Phase 3 correctness pass).
 *
 * Explicit instruction: never silently clamp an impossible number (e.g.
 * Math.min(100, pct)) to make it look clean — that hides the underlying data
 * bug instead of surfacing it. Every check here is a "this should be
 * structurally impossible given how the numbers are built" assertion; if one
 * fires, something upstream (a query, an event taxonomy assumption, a
 * migration) broke a guarantee this dashboard relies on, and a founder
 * reading a percentage needs to know the number in front of them is not
 * trustworthy rather than quietly see a plausible-looking wrong value.
 */
export interface DashboardInvariantWarning {
  code: string
  message: string
  context: Record<string, unknown>
}

export function checkFunnelInvariants(funnel: FunnelStageResult[]): DashboardInvariantWarning[] {
  const warnings: DashboardInvariantWarning[] = []
  for (const stage of funnel) {
    if (stage.conversionPct != null && stage.conversionPct > 100) {
      warnings.push({
        code: 'funnel_conversion_over_100',
        message: `漏斗階段「${stage.stage}」轉換率 ${stage.conversionPct}% 超過 100%`,
        context: { stage: stage.stage, count: stage.count, conversionPct: stage.conversionPct },
      })
    }
  }
  return warnings
}

export function checkPhotoInvariants(photo: PhotoOutcomeCounts): DashboardInvariantWarning[] {
  const warnings: DashboardInvariantWarning[] = []
  if (photo.success + photo.failure > photo.attempts) {
    warnings.push({
      code: 'photo_conservation_violated',
      message: `拍照成功數 (${photo.success}) + 失敗數 (${photo.failure}) 超過嘗試數 (${photo.attempts})`,
      context: { attempts: photo.attempts, success: photo.success, failure: photo.failure },
    })
  }
  if (photo.resolvedCount > photo.success) {
    warnings.push({
      code: 'photo_resolved_exceeds_success',
      message: `已解析餐點數 (${photo.resolvedCount}) 超過成功數 (${photo.success})`,
      context: { resolvedCount: photo.resolvedCount, success: photo.success },
    })
  }
  return warnings
}

export function checkRetentionInvariants(retention: RetentionOffsetResult[]): DashboardInvariantWarning[] {
  const warnings: DashboardInvariantWarning[] = []
  for (const r of retention) {
    if (r.activeCount > r.cohortSize) {
      warnings.push({
        code: 'retention_numerator_exceeds_denominator',
        message: `第 ${r.offsetDays} 天留存人數 (${r.activeCount}) 超過世代人數 (${r.cohortSize})`,
        context: { offsetDays: r.offsetDays, activeCount: r.activeCount, cohortSize: r.cohortSize },
      })
    }
  }
  return warnings
}

export function checkSubscriptionInvariants(sub: SubscriptionOverview): DashboardInvariantWarning[] {
  const warnings: DashboardInvariantWarning[] = []
  if (sub.mrrTwd < 0) {
    warnings.push({
      code: 'mrr_negative',
      message: `預估 MRR 為負數 (NT$${sub.mrrTwd})`,
      context: { mrrTwd: sub.mrrTwd },
    })
  }
  return warnings
}

export function collectDashboardWarnings(input: {
  funnel: FunnelStageResult[]
  photoToday: PhotoOutcomeCounts
  photoLast7Days: PhotoOutcomeCounts
  retention: RetentionOffsetResult[]
  subscriptionOverview: SubscriptionOverview
}): DashboardInvariantWarning[] {
  const warnings = [
    ...checkFunnelInvariants(input.funnel),
    ...checkPhotoInvariants(input.photoToday),
    ...checkPhotoInvariants(input.photoLast7Days),
    ...checkRetentionInvariants(input.retention),
    ...checkSubscriptionInvariants(input.subscriptionOverview),
  ]
  if (warnings.length > 0) {
    console.error('[founder-dashboard] data quality invariant violated', warnings)
  }
  return warnings
}
