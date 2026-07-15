import { apiFetch } from '@/lib/api/client'
import {
  claimOfflineMutation,
  confirmAndRemoveOfflineMutation,
  dueOfflineMutationsForUser,
  markOfflineMutationStatus,
  OFFLINE_MUTATION_CONFIRMED_EVENT,
  recoverStaleSyncingMutations,
  type OfflineMutationEntry,
  type OfflineMutationStatus,
} from '@/lib/offline-mutation-queue'

const BASE_RETRY_MS = 2_500
const MAX_RETRY_MS = 5 * 60_000
const REQUEST_TIMEOUT_MS = 20_000

export type OfflineMutationFetcher = (
  path: string,
  options: RequestInit
) => Promise<Response>

export interface ErrorClassification {
  status: Extract<
    OfflineMutationStatus,
    'auth_blocked' | 'failed_retryable' | 'needs_attention'
  >
  code: number | string
  retryAfterMs?: number
}

export interface ReplayResult {
  attempted: number
  confirmed: number
  retained: number
}

let replayPromise: Promise<ReplayResult> | null = null

export function exponentialBackoffMs(attemptCount: number): number {
  const exponent = Math.max(0, Math.min(16, attemptCount - 1))
  return Math.min(MAX_RETRY_MS, BASE_RETRY_MS * 2 ** exponent)
}

export function retryAfterMs(
  value: string | null,
  now = new Date()
): number | undefined {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000)
  const at = Date.parse(value)
  if (Number.isNaN(at)) return undefined
  return Math.max(0, at - now.getTime())
}

export function classifyMutationFailure(input: {
  status?: number
  error?: unknown
  retryAfter?: string | null
  now?: Date
}): ErrorClassification {
  const status = input.status
  if (status === 401 || status === 403) {
    return { status: 'auth_blocked', code: status }
  }
  if (status === 400 || status === 404 || status === 409 || status === 422) {
    return { status: 'needs_attention', code: status }
  }
  if (status === 429) {
    return {
      status: 'failed_retryable',
      code: status,
      retryAfterMs: retryAfterMs(input.retryAfter ?? null, input.now),
    }
  }
  if (status === 408 || (status != null && status >= 500)) {
    return { status: 'failed_retryable', code: status }
  }
  if (status != null && status >= 400) {
    return { status: 'needs_attention', code: status }
  }
  const name =
    input.error instanceof Error
      ? input.error.name
      : typeof input.error === 'object' && input.error && 'name' in input.error
        ? String((input.error as { name: unknown }).name)
        : ''
  return {
    status: 'failed_retryable',
    code: name === 'AbortError' ? 'timeout' : 'network',
  }
}

function nextRetryIso(
  entry: OfflineMutationEntry,
  classification: ErrorClassification,
  now: Date
): string | null {
  if (classification.status !== 'failed_retryable') return null
  const delay =
    classification.retryAfterMs ?? exponentialBackoffMs(entry.attemptCount)
  return new Date(now.getTime() + Math.min(MAX_RETRY_MS, Math.max(0, delay))).toISOString()
}

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const body = (await response.json()) as unknown
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function confirmationMatches(
  entry: OfflineMutationEntry,
  body: Record<string, unknown> | null
): boolean {
  const confirmation =
    body?.confirmation && typeof body.confirmation === 'object'
      ? (body.confirmation as Record<string, unknown>)
      : null
  const checkin =
    body?.checkin && typeof body.checkin === 'object'
      ? (body.checkin as Record<string, unknown>)
      : null
  return (
    confirmation?.status === 'confirmed' &&
    confirmation.idempotency_key === entry.idempotencyKey &&
    confirmation.nutrition_date === entry.nutritionDate &&
    confirmation.entry_revision === entry.revision &&
    checkin?.checkin_date === entry.nutritionDate
  )
}

function dispatchConfirmed(
  entry: OfflineMutationEntry,
  body: Record<string, unknown> | null
): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(OFFLINE_MUTATION_CONFIRMED_EVENT, {
      detail: {
        entry,
        calorieBank: body?.calorie_bank ?? null,
      },
    })
  )
}

async function replayEntry(
  candidate: OfflineMutationEntry,
  fetcher: OfflineMutationFetcher,
  now: Date
): Promise<'confirmed' | 'retained' | 'skipped'> {
  const entry = claimOfflineMutation(candidate.id, candidate.userId, now)
  if (!entry) return 'skipped'

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetcher(entry.endpoint, {
      method: entry.method,
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': entry.idempotencyKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        ...entry.payload,
        nutrition_date: entry.nutritionDate,
        idempotency_key: entry.idempotencyKey,
        entry_revision: entry.revision,
      }),
    })

    if (!response.ok) {
      const classification = classifyMutationFailure({
        status: response.status,
        retryAfter: response.headers.get('Retry-After'),
        now,
      })
      markOfflineMutationStatus({
        entryId: entry.id,
        userId: entry.userId,
        status: classification.status,
        lastErrorCode: classification.code,
        nextRetryAt: nextRetryIso(entry, classification, now),
        now,
      })
      return 'retained'
    }

    const body = await readJson(response)
    if (!confirmationMatches(entry, body)) {
      markOfflineMutationStatus({
        entryId: entry.id,
        userId: entry.userId,
        status: 'needs_attention',
        lastErrorCode: 'invalid_confirmation',
        now,
      })
      return 'retained'
    }

    const result = confirmAndRemoveOfflineMutation({
      entryId: entry.id,
      userId: entry.userId,
      revision: entry.revision,
      idempotencyKey: entry.idempotencyKey,
    })
    if (!result.removed || result.stale) return 'retained'
    dispatchConfirmed(entry, body)
    return 'confirmed'
  } catch (error) {
    const classification = classifyMutationFailure({ error, now })
    markOfflineMutationStatus({
      entryId: entry.id,
      userId: entry.userId,
      status: classification.status,
      lastErrorCode: classification.code,
      nextRetryAt: nextRetryIso(entry, classification, now),
      now,
    })
    return 'retained'
  } finally {
    clearTimeout(timeout)
  }
}

async function runReplay(input: {
  userId: string
  fetcher?: OfflineMutationFetcher
  now?: Date
}): Promise<ReplayResult> {
  const now = input.now ?? new Date()
  const fetcher = input.fetcher ?? apiFetch
  recoverStaleSyncingMutations(input.userId, now)
  const candidates = dueOfflineMutationsForUser(input.userId, now)
  const result: ReplayResult = { attempted: 0, confirmed: 0, retained: 0 }

  for (const candidate of candidates) {
    result.attempted += 1
    const outcome = await replayEntry(candidate, fetcher, now)
    if (outcome === 'confirmed') result.confirmed += 1
    else if (outcome === 'retained') result.retained += 1
  }
  return result
}

export function replayPendingMutations(input: {
  userId: string
  fetcher?: OfflineMutationFetcher
  now?: Date
}): Promise<ReplayResult> {
  if (!input.userId) return Promise.resolve({ attempted: 0, confirmed: 0, retained: 0 })
  if (replayPromise) return replayPromise
  replayPromise = runReplay(input).finally(() => {
    replayPromise = null
  })
  return replayPromise
}
