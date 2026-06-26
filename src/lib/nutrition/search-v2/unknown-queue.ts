import type {
  UnknownAnalytics,
  UnknownQueueEntry,
  UnknownQueueStatus,
} from '@/lib/nutrition/search-v2/types'
import { computeUnknownPriorityScore, sortByPriority } from '@/lib/nutrition/search-v2/unknown-priority'
import { listUnknownPhotoQueue } from '@/lib/nutrition/search-v2/unknown-photo-queue'

function newQueueId(): string {
  return `unk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const queue = new Map<string, UnknownQueueEntry>()

function daysBetween(from: string, to = new Date()): number {
  const ms = to.getTime() - new Date(from).getTime()
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)))
}

function withPriority(entry: Omit<UnknownQueueEntry, 'priority_score'> & { priority_score?: number }): UnknownQueueEntry {
  const priority_score = entry.priority_score ?? computeUnknownPriorityScore(entry)
  return { ...entry, priority_score }
}

export function getUnknownQueueSize(): number {
  return queue.size
}

export function listUnknownQueue(status?: UnknownQueueStatus): UnknownQueueEntry[] {
  const all = [...queue.values()]
  const filtered = status ? all.filter(e => e.status === status) : all
  return sortByPriority(filtered)
}

export function enqueueUnknownFood(input: {
  food_name: string
  restaurant?: string | null
  image_hash?: string | null
  possible_matches?: string[]
}): UnknownQueueEntry {
  const key = `${input.restaurant ?? ''}::${input.food_name.trim().toLowerCase()}`
  const existing = [...queue.values()].find(
    e => `${e.restaurant ?? ''}::${e.food_name.trim().toLowerCase()}` === key
  )

  const now = new Date().toISOString()
  if (existing) {
    const times = existing.times_used + 1
    const updated = withPriority({
      ...existing,
      times_used: times,
      times_requested: times,
      last_used: now,
      last_requested: now,
      waiting_days: daysBetween(existing.created_at),
      image_hash: input.image_hash ?? existing.image_hash,
      possible_matches: input.possible_matches ?? existing.possible_matches,
    })
    queue.set(existing.id, updated)
    return updated
  }

  const entry = withPriority({
    id: newQueueId(),
    food_name: input.food_name.trim(),
    restaurant: input.restaurant ?? null,
    image_hash: input.image_hash ?? null,
    created_at: now,
    times_used: 1,
    times_requested: 1,
    last_used: now,
    last_requested: now,
    waiting_days: 0,
    possible_matches: input.possible_matches ?? [],
    status: 'waiting',
  })
  queue.set(entry.id, entry)
  return entry
}

export function updateUnknownQueueStatus(id: string, status: UnknownQueueStatus): UnknownQueueEntry | null {
  const entry = queue.get(id)
  if (!entry) return null
  const updated = withPriority({ ...entry, status, waiting_days: daysBetween(entry.created_at) })
  queue.set(id, updated)
  return updated
}

export function setUnknownPossibleMatches(id: string, matches: string[]): UnknownQueueEntry | null {
  const entry = queue.get(id)
  if (!entry) return null
  const updated = withPriority({ ...entry, possible_matches: matches })
  queue.set(id, updated)
  return updated
}

export function clearUnknownQueueForTests(): void {
  queue.clear()
}

export function getUnknownAnalytics(): UnknownAnalytics {
  const entries = listUnknownQueue('waiting')
  const byName = new Map<string, { times: number; priority: number }>()
  const byRestaurant = new Map<string, number>()

  for (const e of entries) {
    const prev = byName.get(e.food_name) ?? { times: 0, priority: 0 }
    byName.set(e.food_name, {
      times: prev.times + e.times_requested,
      priority: Math.max(prev.priority, e.priority_score),
    })
    const r = e.restaurant ?? '（未指定）'
    byRestaurant.set(r, (byRestaurant.get(r) ?? 0) + 1)
  }

  const top_unknown = [...byName.entries()]
    .map(([food_name, v]) => ({ food_name, times_used: v.times, priority_score: v.priority }))
    .sort((a, b) => b.times_used - a.times_used)
    .slice(0, 10)

  const restaurant_unknown = [...byRestaurant.entries()]
    .map(([restaurant, count]) => ({ restaurant, count }))
    .sort((a, b) => b.count - a.count)

  const longest_waiting = [...entries]
    .map(e => ({ food_name: e.food_name, waiting_days: daysBetween(e.created_at), priority_score: e.priority_score }))
    .sort((a, b) => b.waiting_days - a.waiting_days)
    .slice(0, 10)

  const priority_queue = sortByPriority(entries)
    .slice(0, 20)
    .map(e => ({
      food_name: e.food_name,
      priority_score: e.priority_score,
      times_requested: e.times_requested,
    }))

  const waiting_days_avg =
    entries.length === 0
      ? 0
      : entries.reduce((s, e) => s + daysBetween(e.created_at), 0) / entries.length

  return {
    unknown_foods: entries.length,
    top_unknown,
    restaurant_unknown,
    most_requested: top_unknown,
    longest_waiting,
    priority_queue,
    waiting_days_avg: Math.round(waiting_days_avg * 10) / 10,
    pending_review: entries.filter(e => e.possible_matches.length > 0).length,
  }
}

/** Founder dashboard data — text + photo unknown merged view. */
export function getFounderUnknownDashboard() {
  const text = getUnknownAnalytics()
  const photoWaiting = listUnknownPhotoQueue('waiting')
  return {
    generated_at: new Date().toISOString(),
    text_unknown: text,
    photo_unknown_count: photoWaiting.length,
    photo_top: photoWaiting
      .sort((a, b) => b.times_used - a.times_used)
      .slice(0, 10)
      .map(e => ({
        detected_label: e.detected_label,
        times_used: e.times_used,
        waiting_days: e.waiting_days,
      })),
    combined_priority: [
      ...text.priority_queue.map(e => ({ source: 'text' as const, ...e })),
      ...photoWaiting.slice(0, 10).map(e => ({
        source: 'photo' as const,
        food_name: e.detected_label,
        priority_score: e.times_used * 10 + e.waiting_days * 2,
        times_requested: e.times_used,
      })),
    ].sort((a, b) => b.priority_score - a.priority_score),
  }
}
