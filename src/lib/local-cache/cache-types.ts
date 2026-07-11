/**
 * Local read-through cache (Build 16 · 1F).
 *
 * Scope: READ data only. This layer does NOT implement offline write,
 * a sync queue, or conflict resolution. It lets the four main pages paint
 * last-known data instantly, then revalidate in the background.
 */

export type CacheNamespace =
  | 'today'
  | 'record'
  | 'analysis'
  | 'settings'
  | 'settings-bundle'
  | 'subscription'

export interface CacheEnvelope<T> {
  schemaVersion: number
  cachedAt: string
  userId: string
  data: T
}

export interface CacheReadResult<T> {
  data: T
  cachedAt: string
  /** true once past the namespace soft TTL — still displayable (stale-while-revalidate). */
  isStale: boolean
  ageMs: number
}
