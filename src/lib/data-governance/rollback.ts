import type { GovernedMenuRecord, PromotionSnapshot, RollbackResult } from './types'

export function createPromotionSnapshot(input: {
  records: GovernedMenuRecord[]
  stage: PromotionSnapshot['stage']
  actor: string
  reason: string
  snapshot_id?: string
  now?: string
}): PromotionSnapshot {
  const now = input.now ?? new Date().toISOString()
  return {
    snapshot_id: input.snapshot_id ?? `snap-${Date.now()}`,
    created_at: now,
    actor: input.actor,
    reason: input.reason,
    stage: input.stage,
    records: input.records.map(r => ({ ...r })),
  }
}

export function rollbackToSnapshot(
  current: GovernedMenuRecord[],
  snapshot: PromotionSnapshot
): RollbackResult {
  if (!snapshot.records.length) {
    return {
      success: false,
      snapshot_id: snapshot.snapshot_id,
      restored_count: 0,
      message: 'Snapshot empty — rollback aborted.',
    }
  }

  const snapMap = new Map(snapshot.records.map(r => [r.record_id, r]))
  const restored: GovernedMenuRecord[] = []
  const untouched: GovernedMenuRecord[] = []

  for (const record of current) {
    const prev = snapMap.get(record.record_id)
    if (prev) {
      restored.push({ ...prev })
      snapMap.delete(record.record_id)
    } else {
      untouched.push(record)
    }
  }

  for (const leftover of snapMap.values()) {
    restored.push({ ...leftover })
  }

  return {
    success: true,
    snapshot_id: snapshot.snapshot_id,
    restored_count: restored.length,
    message: `Restored ${restored.length} records from snapshot without overwriting unrelated entries.`,
  }
}

export function mergeRollbackResult(
  current: GovernedMenuRecord[],
  snapshot: PromotionSnapshot
): GovernedMenuRecord[] {
  const result = rollbackToSnapshot(current, snapshot)
  if (!result.success) return current
  const snapMap = new Map(snapshot.records.map(r => [r.record_id, r]))
  const out: GovernedMenuRecord[] = []
  const seen = new Set<string>()
  for (const record of current) {
    const prev = snapMap.get(record.record_id)
    out.push(prev ? { ...prev } : { ...record })
    seen.add(record.record_id)
  }
  for (const r of snapshot.records) {
    if (!seen.has(r.record_id)) out.push({ ...r })
  }
  return out
}
