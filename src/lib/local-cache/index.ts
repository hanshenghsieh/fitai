import type { CacheEnvelope, CacheNamespace, CacheReadResult } from './cache-types'
import { CACHE_SCHEMA_VERSION, policyFor } from './cache-meta'
import { allCachePrefix, cacheKey, namespaceUserPrefix } from './keys'
import {
  clearLastActiveUserId,
  rawGet,
  rawRemove,
  rawSet,
  removeByPrefix,
  setLastActiveUserId,
} from './storage'

export type { CacheNamespace, CacheReadResult } from './cache-types'
export { CACHE_SCHEMA_VERSION } from './cache-meta'
export { getLastActiveUserId } from './storage'

/**
 * Read a cached value.
 * Returns null (cache miss) when: absent, unparsable, wrong schema version,
 * wrong user, or past the namespace hard expiry.
 */
export function readCache<T>(
  ns: CacheNamespace,
  userId: string,
  parts: string[] = []
): CacheReadResult<T> | null {
  if (!userId) return null
  const raw = rawGet(cacheKey(ns, userId, ...parts))
  if (!raw) return null

  let envelope: CacheEnvelope<T>
  try {
    envelope = JSON.parse(raw) as CacheEnvelope<T>
  } catch {
    return null
  }

  if (!envelope || envelope.schemaVersion !== CACHE_SCHEMA_VERSION) return null
  if (envelope.userId !== userId) return null
  if (envelope.data == null) return null

  const cachedAtMs = Date.parse(envelope.cachedAt)
  if (Number.isNaN(cachedAtMs)) return null

  const ageMs = Date.now() - cachedAtMs
  const policy = policyFor(ns)

  // Hard expiry — never trust cache (incl. subscription/Pro) past this window.
  if (ageMs > policy.hardMaxAgeMs) {
    rawRemove(cacheKey(ns, userId, ...parts))
    return null
  }

  return {
    data: envelope.data,
    cachedAt: envelope.cachedAt,
    isStale: ageMs > policy.softTtlMs,
    ageMs,
  }
}

/** Write a value and remember this user as the last active one. */
export function writeCache<T>(
  ns: CacheNamespace,
  userId: string,
  parts: string[],
  data: T
): void {
  if (!userId || data == null) return
  const envelope: CacheEnvelope<T> = {
    schemaVersion: CACHE_SCHEMA_VERSION,
    cachedAt: new Date().toISOString(),
    userId,
    data,
  }
  try {
    rawSet(cacheKey(ns, userId, ...parts), JSON.stringify(envelope))
    setLastActiveUserId(userId)
  } catch {
    // ignore serialization / quota errors
  }
}

export function removeCache(ns: CacheNamespace, userId: string, parts: string[] = []): void {
  rawRemove(cacheKey(ns, userId, ...parts))
}

/** Remove all cached entries of a namespace for one user. */
export function clearNamespace(ns: CacheNamespace, userId: string): void {
  if (!userId) return
  removeByPrefix(namespaceUserPrefix(ns, userId))
}

/** Remove every local-cache entry (all users, all namespaces) + last-user marker. */
export function clearAllLocalCache(): void {
  removeByPrefix(allCachePrefix())
  clearLastActiveUserId()
}
