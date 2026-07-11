import type { CacheNamespace } from './cache-types'

/**
 * Bump when any cached page-data shape changes. Envelopes written with an
 * older version are ignored on read (treated as a cache miss).
 */
export const CACHE_SCHEMA_VERSION = 1

const MIN = 60_000
const HOUR = 60 * MIN

interface NamespacePolicy {
  /** Past this age the cache is stale but still shown while we revalidate. */
  softTtlMs: number
  /** Past this age the cache is discarded entirely (hard expiry). */
  hardMaxAgeMs: number
}

/**
 * Conservative TTLs. Stale never means "hide" — it means "show, then refresh".
 * hardMaxAgeMs guarantees nothing (including subscription/Pro state) is trusted
 * from cache indefinitely; beyond it we force a fresh fetch.
 */
export const NAMESPACE_POLICY: Record<CacheNamespace, NamespacePolicy> = {
  today: { softTtlMs: 5 * MIN, hardMaxAgeMs: 24 * HOUR },
  record: { softTtlMs: 30 * MIN, hardMaxAgeMs: 24 * HOUR },
  analysis: { softTtlMs: 30 * MIN, hardMaxAgeMs: 24 * HOUR },
  settings: { softTtlMs: 10 * MIN, hardMaxAgeMs: 24 * HOUR },
  'settings-bundle': { softTtlMs: 10 * MIN, hardMaxAgeMs: 24 * HOUR },
  // Subscription must always be background-verified; never a permanent unlock.
  subscription: { softTtlMs: 5 * MIN, hardMaxAgeMs: 24 * HOUR },
}

export function policyFor(ns: CacheNamespace): NamespacePolicy {
  return NAMESPACE_POLICY[ns]
}
