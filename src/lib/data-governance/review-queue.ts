import { isReviewDue } from './version-manager'
import type { GovernedMenuRecord, ReviewQueueItem, ReviewQueueReason, ReviewQueueStatus } from './types'

export function classifyReviewStatus(
  record: GovernedMenuRecord,
  opts?: { source_changed?: boolean; nutrition_diff?: boolean; now?: Date }
): ReviewQueueStatus | null {
  const now = opts?.now ?? new Date()
  if (record.status === 'deprecated') return null
  if (opts?.source_changed || opts?.nutrition_diff) return 'pending_review'
  if (isReviewDue(record.review_due_at, now)) return 'need_review'
  return null
}

export function buildReviewQueueItem(
  record: GovernedMenuRecord,
  queue_status: ReviewQueueStatus,
  reason: ReviewQueueReason
): ReviewQueueItem {
  return {
    record_id: record.record_id,
    brand: record.brand,
    item_name: record.item_name,
    queue_status,
    reason,
    due_at: record.review_due_at,
    promotion_stage: record.promotion_stage,
  }
}

export function buildReviewQueue(
  records: GovernedMenuRecord[],
  flags?: Map<string, { source_changed?: boolean; nutrition_diff?: boolean }>
): ReviewQueueItem[] {
  const queue: ReviewQueueItem[] = []
  for (const record of records) {
    const f = flags?.get(record.record_id)
    const status = classifyReviewStatus(record, {
      source_changed: f?.source_changed,
      nutrition_diff: f?.nutrition_diff,
    })
    if (!status) continue
    const reason: ReviewQueueReason =
      f?.source_changed ? 'source_updated'
      : f?.nutrition_diff ? 'nutrition_diff'
      : 'review_due'
    queue.push(buildReviewQueueItem(record, status, reason))
  }
  return queue.sort((a, b) => a.due_at.localeCompare(b.due_at))
}

export function partitionReviewQueue(queue: ReviewQueueItem[]): {
  need_review: ReviewQueueItem[]
  pending_review: ReviewQueueItem[]
} {
  return {
    need_review: queue.filter(q => q.queue_status === 'need_review'),
    pending_review: queue.filter(q => q.queue_status === 'pending_review'),
  }
}

export function nextReviewDate(queue: ReviewQueueItem[]): string | null {
  const upcoming = queue
    .filter(q => q.queue_status === 'need_review')
    .map(q => q.due_at)
    .sort()
  return upcoming[0] ?? null
}
