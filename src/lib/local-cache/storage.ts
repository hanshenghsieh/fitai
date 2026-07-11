import { LAST_USER_KEY } from './keys'

/**
 * Low-level storage adapter. Uses localStorage: it is available in both the
 * web build and the Capacitor WKWebView, and its synchronous reads let the
 * page paint cached data on first render without an async flicker.
 *
 * SQLite / IndexedDB are intentionally NOT used here — they are reserved for
 * a later full offline-first phase.
 */
function store(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function rawGet(key: string): string | null {
  const s = store()
  if (!s) return null
  try {
    return s.getItem(key)
  } catch {
    return null
  }
}

export function rawSet(key: string, value: string): void {
  const s = store()
  if (!s) return
  try {
    s.setItem(key, value)
  } catch {
    // quota exceeded / private mode — cache is best-effort
  }
}

export function rawRemove(key: string): void {
  const s = store()
  if (!s) return
  try {
    s.removeItem(key)
  } catch {
    // ignore
  }
}

/** Remove every key that starts with `prefix`. Safe against live index shifts. */
export function removeByPrefix(prefix: string): void {
  const s = store()
  if (!s) return
  try {
    const keys: string[] = []
    for (let i = 0; i < s.length; i++) {
      const key = s.key(i)
      if (key && key.startsWith(prefix)) keys.push(key)
    }
    for (const key of keys) s.removeItem(key)
  } catch {
    // ignore
  }
}

export function getLastActiveUserId(): string | null {
  return rawGet(LAST_USER_KEY)
}

export function setLastActiveUserId(userId: string): void {
  if (!userId) return
  rawSet(LAST_USER_KEY, userId)
}

export function clearLastActiveUserId(): void {
  rawRemove(LAST_USER_KEY)
}
