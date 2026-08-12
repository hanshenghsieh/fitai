import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { errorJsonWithCors } from '@/lib/api/cors'

export function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('Authorization')?.trim()
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  return token || null
}

export function createSupabaseForAccessToken(accessToken: string): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}

export type ApiAuthSuccess = {
  ok: true
  user: User
  supabase: SupabaseClient
  accessToken: string
}

export type ApiAuthFailure = {
  ok: false
  response: NextResponse
}

export async function requireApiUser(request: NextRequest): Promise<ApiAuthSuccess | ApiAuthFailure> {
  const accessToken = extractBearerToken(request)
  if (!accessToken) {
    return {
      ok: false,
      response: errorJsonWithCors(request, 'Missing Authorization Bearer token', 401),
    }
  }

  const supabase = createSupabaseForAccessToken(accessToken)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken)

  if (error || !user) {
    return {
      ok: false,
      response: errorJsonWithCors(request, 'Unauthorized', 401),
    }
  }

  return { ok: true, user, supabase, accessToken }
}

let warnedAdminConfigMissing = false

export function resetAdminConfigWarningForTests(): void {
  warnedAdminConfigMissing = false
}

/**
 * Logs once per server instance (not once per request) so a misconfigured
 * production deploy is loud in the server logs without spamming them. Never
 * include the raw env value or any email — only the fact that the allowlist
 * is empty.
 */
function warnAdminConfigMissingOnce(): void {
  if (warnedAdminConfigMissing) return
  warnedAdminConfigMissing = true
  console.error(
    '[admin-config] ADMIN_EMAILS is not set (or empty) in this environment. ' +
      '/growth and all /api/growth/** routes will deny every user (fail-closed) until it is configured.'
  )
}

/**
 * Server-only admin allowlist for internal tools (e.g. /growth). Reads a
 * comma-separated ADMIN_EMAILS env var — never NEXT_PUBLIC_, never exposed to
 * the client. Fails closed: if the env var is unset or empty, no one is an
 * admin (including the operator) until it's explicitly configured.
 */
function getAdminEmailAllowlist(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? ''
  const emails = new Set(
    raw
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean)
  )
  if (emails.size === 0) warnAdminConfigMissingOnce()
  return emails
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return getAdminEmailAllowlist().has(email.trim().toLowerCase())
}

/**
 * Single source of truth for gating internal/founder-only tools (currently
 * /growth and its API routes). Layers on top of requireApiUser: a valid
 * session is still required first (401), and on top of that the session's
 * email must be in the server-side ADMIN_EMAILS allowlist (403 otherwise).
 */
export async function requireAdminUser(request: NextRequest): Promise<ApiAuthSuccess | ApiAuthFailure> {
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth

  if (!isAdminEmail(auth.user.email)) {
    return {
      ok: false,
      response: errorJsonWithCors(request, 'Forbidden', 403),
    }
  }

  return auth
}
