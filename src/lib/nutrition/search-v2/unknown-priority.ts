import type { UnknownQueueEntry } from '@/lib/nutrition/search-v2/types'

/** Priority score — higher = more urgent for Founder data backfill. No AI. */
export function computeUnknownPriorityScore(entry: Pick<
  UnknownQueueEntry,
  'times_requested' | 'waiting_days' | 'possible_matches' | 'restaurant'
>): number {
  const freq = entry.times_requested * 10
  const wait = entry.waiting_days * 2
  const matchHint = entry.possible_matches.length > 0 ? 5 : 0
  const hasRestaurant = entry.restaurant ? 3 : 0
  return Math.round(freq + wait + matchHint + hasRestaurant)
}

export function sortByPriority(entries: UnknownQueueEntry[]): UnknownQueueEntry[] {
  return [...entries].sort((a, b) => b.priority_score - a.priority_score)
}
