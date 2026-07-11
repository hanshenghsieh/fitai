import type { CacheNamespace } from './cache-types'

export const CACHE_PREFIX = 'betterbit'

/** Tracks the last user we successfully loaded, so we can read cache before session resolves. */
export const LAST_USER_KEY = `${CACHE_PREFIX}:last-user`

/**
 * Build a cache key. Every key is scoped by userId so two accounts on one
 * device never read each other's data.
 *
 * e.g. cacheKey('today', 'u1', '2026-07-11') -> "betterbit:today:u1:2026-07-11"
 */
export function cacheKey(ns: CacheNamespace, userId: string, ...parts: string[]): string {
  return [CACHE_PREFIX, ns, userId, ...parts].filter(Boolean).join(':')
}

/**
 * Prefix matching every key of a namespace for one user (for bulk invalidation).
 * No trailing ':' so it also matches the base key of namespaces that take no
 * extra parts (e.g. settings). User ids are Supabase UUIDs (fixed length), so
 * one id is never a prefix of another — no cross-user collision.
 */
export function namespaceUserPrefix(ns: CacheNamespace, userId: string): string {
  return `${CACHE_PREFIX}:${ns}:${userId}`
}

/** Prefix that matches every local-cache key (for logout / account switch cleanup). */
export function allCachePrefix(): string {
  return `${CACHE_PREFIX}:`
}
