import type { SupabaseClient } from '@supabase/supabase-js'
import type { Session } from '@supabase/supabase-js'
import { hasPersistedNativeSession } from '@/lib/supabase/client'

interface LegacyWaitForSessionOptions {
  retries?: number
  delayMs?: number
}

export interface SessionStabilizationOptions {
  timeoutMs: number
  intervalMs?: number
  expectedUserId?: string
  requireAccessToken?: boolean
  verifyPersistedStorage?: boolean
  persistedSessionVerifier?: (session: Session) => boolean | Promise<boolean>
}

export type SessionStabilizationFailureReason =
  | 'missing_session'
  | 'user_mismatch'
  | 'missing_access_token'
  | 'storage_not_persisted'
  | 'get_session_error'

export type SessionStabilizationResult =
  | {
      ok: true
      session: Session
    }
  | {
      ok: false
      reason: SessionStabilizationFailureReason
      timedOut: boolean
      message?: string
    }

/**
 * Read the current session, retrying a few times.
 *
 * In the iOS local-hybrid WKWebView, `getSession()` can briefly return `null`
 * right after a fresh page load / sign-in while the auth token is still being
 * rehydrated from storage. Retrying with a short delay avoids the
 * "login → dashboard → login" bounce where an auth guard redirects before the
 * session is restored.
 */
export function waitForSession(
  supabase: SupabaseClient,
  options: SessionStabilizationOptions
): Promise<SessionStabilizationResult>
export function waitForSession(
  supabase: SupabaseClient,
  options?: LegacyWaitForSessionOptions
): Promise<Session | null>
export async function waitForSession(
  supabase: SupabaseClient,
  options: LegacyWaitForSessionOptions | SessionStabilizationOptions = {}
): Promise<Session | null | SessionStabilizationResult> {
  if ('timeoutMs' in options) {
    return stabilizeSession(supabase, options)
  }

  const { retries = 5, delayMs = 300 } = options
  for (let attempt = 0; attempt <= retries; attempt++) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session?.user) return session
    if (attempt < retries) {
      await new Promise(r => setTimeout(r, delayMs))
    }
  }
  return null
}

async function stabilizeSession(
  supabase: SupabaseClient,
  {
    timeoutMs,
    intervalMs = 150,
    expectedUserId,
    requireAccessToken = false,
    verifyPersistedStorage = false,
    persistedSessionVerifier,
  }: SessionStabilizationOptions
): Promise<SessionStabilizationResult> {
  const startedAt = Date.now()
  const safeTimeoutMs = Math.max(1, timeoutMs)
  const safeIntervalMs = Math.max(1, intervalMs)
  let lastReason: SessionStabilizationFailureReason = 'missing_session'

  while (true) {
    let response: Awaited<ReturnType<SupabaseClient['auth']['getSession']>>
    try {
      response = await supabase.auth.getSession()
    } catch (error) {
      return {
        ok: false,
        reason: 'get_session_error',
        timedOut: false,
        message: error instanceof Error ? error.message : String(error),
      }
    }
    const { data, error } = response
    if (error) {
      return {
        ok: false,
        reason: 'get_session_error',
        timedOut: false,
        message: error.message,
      }
    }

    const session = data.session
    if (!session?.user) {
      lastReason = 'missing_session'
    } else if (expectedUserId && session.user.id !== expectedUserId) {
      return { ok: false, reason: 'user_mismatch', timedOut: false }
    } else if (requireAccessToken && !session.access_token) {
      return { ok: false, reason: 'missing_access_token', timedOut: false }
    } else {
      let storageMatches = true
      if (verifyPersistedStorage) {
        storageMatches = persistedSessionVerifier
          ? await persistedSessionVerifier(session)
          : hasPersistedNativeSession(session.user.id, session.access_token)
      }

      if (storageMatches) {
        return { ok: true, session }
      }
      lastReason = 'storage_not_persisted'
    }

    const elapsedMs = Date.now() - startedAt
    if (elapsedMs >= safeTimeoutMs) {
      return { ok: false, reason: lastReason, timedOut: true }
    }
    await new Promise(resolve =>
      setTimeout(resolve, Math.min(safeIntervalMs, safeTimeoutMs - elapsedMs))
    )
  }
}
