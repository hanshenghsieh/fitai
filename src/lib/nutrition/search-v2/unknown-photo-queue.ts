import type { UnknownQueueStatus } from '@/lib/nutrition/search-v2/types'

export interface UnknownPhotoQueueEntry {
  id: string
  photo_id: string | null
  image_hash: string | null
  detected_label: string
  user_label: string | null
  restaurant: string | null
  created_at: string
  times_used: number
  last_used: string
  waiting_days: number
  possible_matches: string[]
  status: UnknownQueueStatus
}

function newPhotoQueueId(): string {
  return `phunk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const photoQueue = new Map<string, UnknownPhotoQueueEntry>()

function daysBetween(from: string, to = new Date()): number {
  const ms = to.getTime() - new Date(from).getTime()
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)))
}

export function getUnknownPhotoQueueSize(): number {
  return photoQueue.size
}

export function listUnknownPhotoQueue(status?: UnknownQueueStatus): UnknownPhotoQueueEntry[] {
  const all = [...photoQueue.values()]
  return status ? all.filter(e => e.status === status) : all
}

export function enqueueUnknownPhoto(input: {
  detected_label: string
  user_label?: string | null
  restaurant?: string | null
  photo_id?: string | null
  image_hash?: string | null
  possible_matches?: string[]
}): UnknownPhotoQueueEntry {
  const label = input.detected_label.trim() || '未知食物'
  const key = `${input.photo_id ?? ''}::${input.image_hash ?? ''}::${label.toLowerCase()}`
  const existing = [...photoQueue.values()].find(
    e =>
      `${e.photo_id ?? ''}::${e.image_hash ?? ''}::${e.detected_label.trim().toLowerCase()}` === key
  )

  const now = new Date().toISOString()
  if (existing) {
    const updated: UnknownPhotoQueueEntry = {
      ...existing,
      times_used: existing.times_used + 1,
      last_used: now,
      waiting_days: daysBetween(existing.created_at),
      user_label: input.user_label ?? existing.user_label,
      possible_matches: input.possible_matches ?? existing.possible_matches,
    }
    photoQueue.set(existing.id, updated)
    return updated
  }

  const entry: UnknownPhotoQueueEntry = {
    id: newPhotoQueueId(),
    photo_id: input.photo_id ?? null,
    image_hash: input.image_hash ?? null,
    detected_label: label,
    user_label: input.user_label ?? null,
    restaurant: input.restaurant ?? null,
    created_at: now,
    times_used: 1,
    last_used: now,
    waiting_days: 0,
    possible_matches: input.possible_matches ?? [],
    status: 'waiting',
  }
  photoQueue.set(entry.id, entry)
  return entry
}

export function clearUnknownPhotoQueueForTests(): void {
  photoQueue.clear()
}
