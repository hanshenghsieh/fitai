import type { FoodLogEntry } from '@/lib/banks/types'
import type {
  CustomEatOutSelection,
  DailyRollState,
  MealSuggestState,
  MealType,
  UserMemoryMeta,
} from '@/lib/checkin-utils'
import type { WorkoutCheckinItem } from '@/types'

// Deliberately outside the `betterbit:` read-cache prefix. Account-switch
// cache cleanup must never delete another user's durable, user-scoped outbox.
export const OFFLINE_MUTATION_STORAGE_KEY = 'bb_offline_mutations_v1'
export const OFFLINE_MUTATION_EVENT = 'bb-pending-sync'
export const OFFLINE_MUTATION_REPLAY_EVENT = 'bb-offline-mutation-replay'
export const OFFLINE_MUTATION_CONFIRMED_EVENT = 'bb-offline-mutation-confirmed'

export type OfflineMutationStatus =
  | 'pending'
  | 'syncing'
  | 'auth_blocked'
  | 'failed_retryable'
  | 'needs_attention'
  | 'confirmed'

export type CheckinUserMemoryPatch = Omit<
  Partial<UserMemoryMeta>,
  'food_logs_today'
> & {
  food_logs_today?: FoodLogEntry[]
}

export interface CheckinNotesPatch {
  user_memory?: CheckinUserMemoryPatch
  daily_rolls?: DailyRollState
  meal_suggest?: Partial<Record<MealType, MealSuggestState>>
  custom_eat_out?: Partial<Record<MealType, CustomEatOutSelection[]>>
}

export interface CheckinMutationPayload {
  weekly_plan_id?: string | null
  workout_items?: WorkoutCheckinItem[]
  water_ml?: number
  notes_patch?: CheckinNotesPatch
}

export interface OfflineMutationEntry {
  id: string
  userId: string
  nutritionDate: string
  type: 'checkin_patch'
  method: 'PATCH'
  endpoint: '/api/checkin'
  payload: CheckinMutationPayload
  createdAt: string
  updatedAt: string
  attemptCount: number
  nextRetryAt: string | null
  status: OfflineMutationStatus
  idempotencyKey: string
  lastErrorCode: number | string | null
  /** Payload generation. Status-only updates do not change this value. */
  revision: number
}

interface OfflineMutationEnvelope {
  schemaVersion: 1
  entries: OfflineMutationEntry[]
}

export interface EnqueueMutationResult {
  ok: boolean
  durable: boolean
  entry: OfflineMutationEntry
  error?: 'storage_unavailable'
}

export interface OfflineMutationStatusSummary {
  status: OfflineMutationStatus | 'storage_error' | null
  count: number
}

const inMemoryStorageFailures = new Set<string>()
let fallbackIdCounter = 0

function storage(): Storage | null {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function emptyEnvelope(): OfflineMutationEnvelope {
  return { schemaVersion: 1, entries: [] }
}

function isEntry(value: unknown): value is OfflineMutationEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<OfflineMutationEntry>
  return (
    typeof entry.id === 'string' &&
    typeof entry.userId === 'string' &&
    typeof entry.nutritionDate === 'string' &&
    entry.type === 'checkin_patch' &&
    entry.method === 'PATCH' &&
    entry.endpoint === '/api/checkin' &&
    typeof entry.revision === 'number' &&
    entry.payload != null &&
    typeof entry.payload === 'object'
  )
}

function readEnvelope(): OfflineMutationEnvelope {
  const target = storage()
  if (!target) return emptyEnvelope()
  try {
    const raw = target.getItem(OFFLINE_MUTATION_STORAGE_KEY)
    if (!raw) return emptyEnvelope()
    const parsed = JSON.parse(raw) as Partial<OfflineMutationEnvelope>
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.entries)) return emptyEnvelope()
    return { schemaVersion: 1, entries: parsed.entries.filter(isEntry) }
  } catch {
    return emptyEnvelope()
  }
}

function dispatchChange(userId?: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OFFLINE_MUTATION_EVENT, { detail: { userId } }))
}

function writeEnvelope(envelope: OfflineMutationEnvelope, userId: string): boolean {
  const target = storage()
  if (!target) {
    inMemoryStorageFailures.add(userId)
    dispatchChange(userId)
    return false
  }
  try {
    target.setItem(OFFLINE_MUTATION_STORAGE_KEY, JSON.stringify(envelope))
    inMemoryStorageFailures.delete(userId)
    dispatchChange(userId)
    return true
  } catch {
    inMemoryStorageFailures.add(userId)
    dispatchChange(userId)
    return false
  }
}

function createId(userId: string, nutritionDate: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  fallbackIdCounter += 1
  return `${userId}:${nutritionDate}:${Date.now()}:${fallbackIdCounter}`
}

function mergeNotesPatch(
  current: CheckinNotesPatch | undefined,
  incoming: CheckinNotesPatch | undefined
): CheckinNotesPatch | undefined {
  if (!current && !incoming) return undefined
  const merged: CheckinNotesPatch = { ...(current ?? {}), ...(incoming ?? {}) }
  if (current?.user_memory || incoming?.user_memory) {
    merged.user_memory = {
      ...(current?.user_memory ?? {}),
      ...(incoming?.user_memory ?? {}),
    }
  }
  return merged
}

export function mergeCheckinMutationPayload(
  current: CheckinMutationPayload,
  incoming: CheckinMutationPayload
): CheckinMutationPayload {
  const merged: CheckinMutationPayload = { ...current, ...incoming }
  const notesPatch = mergeNotesPatch(current.notes_patch, incoming.notes_patch)
  if (notesPatch) merged.notes_patch = notesPatch
  return merged
}

export function readOfflineMutationEntries(): OfflineMutationEntry[] {
  return readEnvelope().entries
}

export function readOfflineMutationsForUser(userId: string): OfflineMutationEntry[] {
  if (!userId) return []
  return readEnvelope().entries
    .filter(entry => entry.userId === userId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function readOfflineMutation(
  entryId: string,
  userId?: string
): OfflineMutationEntry | null {
  return (
    readEnvelope().entries.find(
      entry => entry.id === entryId && (!userId || entry.userId === userId)
    ) ?? null
  )
}

export function readPendingCheckinMutation(
  userId: string,
  nutritionDate: string
): OfflineMutationEntry | null {
  return (
    readEnvelope().entries.find(
      entry =>
        entry.userId === userId &&
        entry.nutritionDate === nutritionDate &&
        entry.type === 'checkin_patch' &&
        entry.status !== 'confirmed'
    ) ?? null
  )
}

export function readPendingFoodLogs(
  userId: string,
  nutritionDate: string
): FoodLogEntry[] | null {
  const logs = readPendingCheckinMutation(userId, nutritionDate)?.payload.notes_patch
    ?.user_memory?.food_logs_today
  return Array.isArray(logs) ? (logs as FoodLogEntry[]) : null
}

export function enqueueCheckinMutation(input: {
  userId: string
  nutritionDate: string
  payload: CheckinMutationPayload
  now?: Date
}): EnqueueMutationResult {
  const now = (input.now ?? new Date()).toISOString()
  const envelope = readEnvelope()
  const existingIndex = envelope.entries.findIndex(
    entry =>
      entry.userId === input.userId &&
      entry.nutritionDate === input.nutritionDate &&
      entry.type === 'checkin_patch' &&
      entry.status !== 'confirmed'
  )

  let entry: OfflineMutationEntry
  if (existingIndex >= 0) {
    const existing = envelope.entries[existingIndex]!
    entry = {
      ...existing,
      payload: mergeCheckinMutationPayload(existing.payload, input.payload),
      updatedAt: now,
      nextRetryAt: null,
      status: existing.status === 'auth_blocked' ? 'auth_blocked' : 'pending',
      lastErrorCode: existing.status === 'auth_blocked' ? existing.lastErrorCode : null,
      revision: existing.revision + 1,
    }
    envelope.entries[existingIndex] = entry
  } else {
    const id = createId(input.userId, input.nutritionDate)
    entry = {
      id,
      userId: input.userId,
      nutritionDate: input.nutritionDate,
      type: 'checkin_patch',
      method: 'PATCH',
      endpoint: '/api/checkin',
      payload: input.payload,
      createdAt: now,
      updatedAt: now,
      attemptCount: 0,
      nextRetryAt: null,
      status: 'pending',
      idempotencyKey: id,
      lastErrorCode: null,
      revision: 1,
    }
    envelope.entries.push(entry)
  }

  const durable = writeEnvelope(envelope, input.userId)
  return durable
    ? { ok: true, durable: true, entry }
    : { ok: false, durable: false, entry, error: 'storage_unavailable' }
}

function updateEntry(
  entryId: string,
  userId: string,
  updater: (entry: OfflineMutationEntry) => OfflineMutationEntry
): OfflineMutationEntry | null {
  const envelope = readEnvelope()
  const index = envelope.entries.findIndex(
    entry => entry.id === entryId && entry.userId === userId
  )
  if (index < 0) return null
  const updated = updater(envelope.entries[index]!)
  envelope.entries[index] = updated
  return writeEnvelope(envelope, userId) ? updated : null
}

export function claimOfflineMutation(
  entryId: string,
  userId: string,
  now = new Date()
): OfflineMutationEntry | null {
  return updateEntry(entryId, userId, entry => ({
    ...entry,
    status: 'syncing',
    attemptCount: entry.attemptCount + 1,
    nextRetryAt: null,
    updatedAt: now.toISOString(),
  }))
}

export function markOfflineMutationStatus(input: {
  entryId: string
  userId: string
  status: Exclude<OfflineMutationStatus, 'confirmed'>
  lastErrorCode: number | string | null
  nextRetryAt?: string | null
  now?: Date
}): OfflineMutationEntry | null {
  return updateEntry(input.entryId, input.userId, entry => ({
    ...entry,
    status: input.status,
    lastErrorCode: input.lastErrorCode,
    nextRetryAt: input.nextRetryAt ?? null,
    updatedAt: (input.now ?? new Date()).toISOString(),
  }))
}

export function confirmAndRemoveOfflineMutation(input: {
  entryId: string
  userId: string
  revision: number
  idempotencyKey: string
}): { removed: boolean; stale: boolean; entry: OfflineMutationEntry | null } {
  const envelope = readEnvelope()
  const index = envelope.entries.findIndex(
    entry => entry.id === input.entryId && entry.userId === input.userId
  )
  if (index < 0) return { removed: false, stale: false, entry: null }
  const current = envelope.entries[index]!
  if (
    current.revision !== input.revision ||
    current.idempotencyKey !== input.idempotencyKey
  ) {
    const pending = { ...current, status: 'pending' as const, nextRetryAt: null }
    envelope.entries[index] = pending
    writeEnvelope(envelope, input.userId)
    return { removed: false, stale: true, entry: pending }
  }
  envelope.entries.splice(index, 1)
  const removed = writeEnvelope(envelope, input.userId)
  return { removed, stale: false, entry: current }
}

export function resumeAuthBlockedMutations(userId: string, now = new Date()): void {
  const envelope = readEnvelope()
  let changed = false
  envelope.entries = envelope.entries.map(entry => {
    if (entry.userId !== userId || entry.status !== 'auth_blocked') return entry
    changed = true
    return {
      ...entry,
      status: 'pending',
      nextRetryAt: null,
      lastErrorCode: null,
      updatedAt: now.toISOString(),
    }
  })
  if (changed) writeEnvelope(envelope, userId)
}

export function makeRetryableMutationsDueNow(userId: string, now = new Date()): void {
  const envelope = readEnvelope()
  let changed = false
  envelope.entries = envelope.entries.map(entry => {
    if (entry.userId !== userId || entry.status !== 'failed_retryable') return entry
    changed = true
    return { ...entry, nextRetryAt: null, updatedAt: now.toISOString() }
  })
  if (changed) writeEnvelope(envelope, userId)
}

export function recoverStaleSyncingMutations(
  userId: string,
  now = new Date(),
  staleAfterMs = 60_000
): void {
  const envelope = readEnvelope()
  let changed = false
  envelope.entries = envelope.entries.map(entry => {
    if (
      entry.userId !== userId ||
      entry.status !== 'syncing' ||
      now.getTime() - Date.parse(entry.updatedAt) < staleAfterMs
    ) {
      return entry
    }
    changed = true
    return {
      ...entry,
      status: 'failed_retryable',
      nextRetryAt: now.toISOString(),
      lastErrorCode: 'interrupted',
      updatedAt: now.toISOString(),
    }
  })
  if (changed) writeEnvelope(envelope, userId)
}

export function dueOfflineMutationsForUser(
  userId: string,
  now = new Date()
): OfflineMutationEntry[] {
  const nowMs = now.getTime()
  return readOfflineMutationsForUser(userId).filter(entry => {
    if (entry.status !== 'pending' && entry.status !== 'failed_retryable') return false
    if (!entry.nextRetryAt) return true
    return Date.parse(entry.nextRetryAt) <= nowMs
  })
}

export function nextRetryAtForUser(userId: string): string | null {
  const retryTimes = readOfflineMutationsForUser(userId)
    .filter(entry => entry.status === 'failed_retryable' && entry.nextRetryAt)
    .map(entry => entry.nextRetryAt!)
    .sort()
  return retryTimes[0] ?? null
}

export function getOfflineMutationStatusForUser(
  userId: string | null | undefined
): OfflineMutationStatusSummary {
  if (!userId) return { status: null, count: 0 }
  if (inMemoryStorageFailures.has(userId)) return { status: 'storage_error', count: 1 }
  const entries = readOfflineMutationsForUser(userId)
  if (entries.length === 0) return { status: null, count: 0 }
  const priority: Array<OfflineMutationStatus> = [
    'needs_attention',
    'auth_blocked',
    'failed_retryable',
    'syncing',
    'pending',
    'confirmed',
  ]
  return {
    status: priority.find(status => entries.some(entry => entry.status === status)) ?? null,
    count: entries.length,
  }
}

export function requestOfflineMutationReplay(userId?: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(OFFLINE_MUTATION_REPLAY_EVENT, { detail: { userId } })
  )
}

/** Test/logout compatibility only. Never removes unconfirmed outbox entries. */
export function clearLegacyPendingSyncMarker(): void {
  const target = storage()
  if (!target) return
  try {
    target.removeItem('bb_pending_sync_v1')
  } catch {
    // Ignore legacy marker cleanup failures.
  }
}
