type Entry<T> = { userId: string; data: T; fetchedAt: number }

const store = new Map<string, Entry<unknown>>()

/** Read cached page data if fresh enough for the current user. */
export function readPageCache<T>(key: string, userId: string, maxAgeMs: number): T | null {
  const entry = store.get(key) as Entry<T> | undefined
  if (!entry || entry.userId !== userId) return null
  if (Date.now() - entry.fetchedAt > maxAgeMs) return null
  return entry.data
}

export function writePageCache<T>(key: string, userId: string, data: T): void {
  store.set(key, { userId, data, fetchedAt: Date.now() })
}

export function invalidatePageCache(key?: string): void {
  if (key) store.delete(key)
  else store.clear()
}

/** Stale-while-revalidate window for tab switches (SPA remounts page hooks). */
export const PAGE_CACHE_TTL_MS = 3 * 60 * 1000
