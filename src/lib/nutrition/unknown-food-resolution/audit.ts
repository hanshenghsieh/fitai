import type { FoodLogEntry } from '@/lib/banks/types'
import type { AutoApplyAnalytics, AutoApplyAuditEntry } from '@/lib/nutrition/unknown-food-resolution/types'
import { isNutritionPendingConfirmation } from '@/lib/nutrition/food-log-display'
import { listUnknownQueue } from '@/lib/nutrition/search-v2/unknown-queue'

const audits: AutoApplyAuditEntry[] = []

function newAuditId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function recordAutoApplyAudit(entry: AutoApplyAuditEntry): AutoApplyAuditEntry {
  const dup = audits.find(
    a =>
      !a.rolled_back &&
      a.unknown_record_id === entry.unknown_record_id &&
      a.matched_item_id === entry.matched_item_id
  )
  if (dup) return dup
  audits.push(entry)
  return entry
}

export function listAutoApplyAudits(): AutoApplyAuditEntry[] {
  return [...audits]
}

export function findAuditByRollbackToken(token: string): AutoApplyAuditEntry | undefined {
  return audits.find(a => a.rollback_token === token)
}

export function markAuditRolledBack(auditId: string): void {
  const a = audits.find(x => x.id === auditId)
  if (a) {
    a.rolled_back = true
    a.rolled_back_at = new Date().toISOString()
  }
}

export function rollbackAutoResolvedLog(log: FoodLogEntry, audit: AutoApplyAuditEntry): FoodLogEntry {
  markAuditRolledBack(audit.id)
  return {
    ...log,
    calories: null,
    protein_g: null,
    fat_g: null,
    carbs_g: null,
    nutrition_status: 'unknown',
    nutrition_confidence: 'Unknown',
    capture_status: 'photo_only',
    resolution_note: undefined,
    auto_resolved_meta: undefined,
  }
}

export function clearAutoApplyAuditsForTests(): void {
  audits.length = 0
}

export function getAutoApplyAnalytics(logs: FoodLogEntry[] = []): AutoApplyAnalytics {
  const unknownLogs = logs.filter(l => isNutritionPendingConfirmation(l))
  const autoResolvedLogs = logs.filter(l => l.nutrition_status === 'auto_resolved')
  const pendingReviewQueue = listUnknownQueue('pending_review')
  const pendingReviewLogs = logs.filter(l => l.nutrition_status === 'pending_review')

  const applied = audits.filter(a => !a.rolled_back).length
  const rolled = audits.filter(a => a.rolled_back).length
  const attempts = audits.length
  const successRate = attempts === 0 ? 0 : Math.round((applied / attempts) * 1000) / 10

  const unresolvedMap = new Map<string, number>()
  for (const l of unknownLogs) {
    unresolvedMap.set(l.name, (unresolvedMap.get(l.name) ?? 0) + 1)
  }

  const resolvedMap = new Map<string, number>()
  for (const l of autoResolvedLogs) {
    resolvedMap.set(l.name, (resolvedMap.get(l.name) ?? 0) + 1)
  }

  return {
    unknown_count: unknownLogs.length,
    auto_resolved_count: autoResolvedLogs.length,
    pending_review_count: pendingReviewQueue.length + pendingReviewLogs.length,
    auto_apply_success_rate: successRate,
    rollback_count: rolled,
    top_unresolved_foods: [...unresolvedMap.entries()]
      .map(([food_name, count]) => ({ food_name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    top_auto_resolved_foods: [...resolvedMap.entries()]
      .map(([food_name, count]) => ({ food_name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  }
}

export function newRollbackToken(): string {
  return `rb-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function newAuditEntry(
  partial: Omit<AutoApplyAuditEntry, 'id' | 'rollback_token'>
): AutoApplyAuditEntry {
  return {
    id: newAuditId(),
    rollback_token: newRollbackToken(),
    ...partial,
  }
}
