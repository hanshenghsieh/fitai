import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const NATIVE_AUTH_STORAGE_KEY = 'betterbit-auth'

interface PersistedAuthSession {
  access_token?: unknown
  user?: {
    id?: unknown
  } | null
}

/**
 * True when running inside the Capacitor native shell (iOS local hybrid).
 * There the origin is `capacitor://localhost`, where the cookie-based storage
 * used by `@supabase/ssr` does NOT persist — so a session written by
 * `signInWithPassword` is lost immediately and every `getSession()` returns
 * null. We must use localStorage-backed persistence instead.
 */
export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
  if (w.Capacitor?.isNativePlatform?.()) return true
  return typeof window.location !== 'undefined' && window.location.protocol === 'capacitor:'
}

/** For logging/diagnostics only. */
export function clientType(): 'native-localStorage' | 'web-ssr-cookie' {
  return isCapacitorNative() ? 'native-localStorage' : 'web-ssr-cookie'
}

let nativeClient: SupabaseClient | null = null

/**
 * Confirm that Supabase has written the exact signed-in session to native
 * localStorage. A matching in-memory getSession() is not enough before a hard
 * navigation because the next WKWebView page must rehydrate from this record.
 */
export function hasPersistedNativeSession(
  expectedUserId: string,
  expectedAccessToken: string
): boolean {
  if (!isCapacitorNative() || typeof window === 'undefined') return false
  try {
    const raw = window.localStorage.getItem(NATIVE_AUTH_STORAGE_KEY)
    if (!raw) return false
    const persisted = JSON.parse(raw) as PersistedAuthSession
    return (
      persisted?.user?.id === expectedUserId &&
      persisted.access_token === expectedAccessToken
    )
  } catch {
    return false
  }
}

export function createClient() {
  if (isCapacitorNative()) {
    // Single shared instance so the session persists across every createClient()
    // call and survives full page reloads (login → hard redirect → dashboard).
    if (!nativeClient) {
      nativeClient = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storage: window.localStorage,
          storageKey: NATIVE_AUTH_STORAGE_KEY,
        },
      })
    }
    return nativeClient
  }

  // Web (Vercel / betterbit.app): keep cookie-based SSR client unchanged.
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
