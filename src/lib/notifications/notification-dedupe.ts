import {
  COPY_COOLDOWN_DAYS,
  MAX_CONSECUTIVE_SAME_CATEGORY,
  MAX_NOTIFICATIONS_PER_DAY,
  type NotificationCategory,
  type NotificationCopyEntry,
  type NotificationPayload,
  type NotificationSentRecord,
} from './notification-types'

export function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24)
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function countSentToday(
  sentHistory: NotificationSentRecord[],
  now: Date
): number {
  return sentHistory.filter(r => isSameLocalDay(new Date(r.sent_at), now)).length
}

export function wasCopySentWithinCooldown(
  copyId: string,
  sentHistory: NotificationSentRecord[],
  now: Date,
  cooldownDays = COPY_COOLDOWN_DAYS
): boolean {
  return sentHistory.some(r => {
    if (r.copy_id !== copyId) return false
    return daysBetween(new Date(r.sent_at), now) < cooldownDays
  })
}

export function consecutiveCategoryCount(
  sentHistory: NotificationSentRecord[],
  category: NotificationCategory
): number {
  const sorted = [...sentHistory].sort(
    (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
  )
  let count = 0
  for (const row of sorted) {
    if (row.category !== category) break
    count++
  }
  return count
}

export function categoryWouldExceedStreak(
  category: NotificationCategory,
  sentHistory: NotificationSentRecord[]
): boolean {
  return consecutiveCategoryCount(sentHistory, category) >= MAX_CONSECUTIVE_SAME_CATEGORY
}

export function filterEligibleCopy(
  candidates: NotificationCopyEntry[],
  sentHistory: NotificationSentRecord[],
  now: Date
): NotificationCopyEntry[] {
  return candidates.filter(copy => {
    if (wasCopySentWithinCooldown(copy.id, sentHistory, now, copy.cooldown_days)) {
      return false
    }
    if (categoryWouldExceedStreak(copy.category, sentHistory)) {
      return false
    }
    return true
  })
}

export function canSendMoreToday(
  sentHistory: NotificationSentRecord[],
  plannedToday: NotificationPayload[],
  now: Date
): boolean {
  const already = countSentToday(sentHistory, now) + plannedToday.length
  return already < MAX_NOTIFICATIONS_PER_DAY
}

export function pickCopyDeterministic(
  eligible: NotificationCopyEntry[],
  seed: string
): NotificationCopyEntry | null {
  if (!eligible.length) return null
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return eligible[hash % eligible.length] ?? null
}
