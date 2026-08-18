import { NextRequest } from 'next/server'
import { requireAdminUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors, errorJsonWithCors } from '@/lib/api/cors'
import { createAdminClient } from '@/lib/supabase/server'

const VALID_PLATFORMS = new Set(['ios', 'android'])

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

/**
 * Public read — no auth required. The update check must work before login
 * (a user stuck on a too-old version to even reach the login screen's real
 * functionality still needs to see the prompt), so this intentionally has no
 * requireApiUser/requireAdminUser gate. Nothing sensitive is stored here
 * (see the migration's RLS policy — public SELECT by design).
 */
export async function GET(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get('platform')?.trim().toLowerCase()
  if (!platform || !VALID_PLATFORMS.has(platform)) {
    return errorJsonWithCors(request, 'Invalid or missing platform', 400)
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('app_release_config')
    .select('platform, latest_version, minimum_version, title, message, update_url, force_update, enabled')
    .eq('platform', platform)
    .maybeSingle()

  if (error) {
    console.error('[app-release-config] GET failed', { message: error.message })
    // Fail open at the API layer too — an unreachable/broken config table
    // must never surface as an error the client could misinterpret; it
    // returns the same shape as "no config configured yet".
    return jsonWithCors({ config: null }, request)
  }

  return jsonWithCors({ config: data ?? null }, request)
}

/**
 * Admin-only write — same requireAdminUser gate already used by
 * /growth and /founder-dashboard (src/lib/api/auth.ts). No new auth
 * mechanism, no secret ever reaches the client.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdminUser(request)
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return errorJsonWithCors(request, 'Invalid request body', 400)
  }

  const platform = typeof body.platform === 'string' ? body.platform.trim().toLowerCase() : ''
  if (!VALID_PLATFORMS.has(platform)) {
    return errorJsonWithCors(request, 'Invalid or missing platform', 400)
  }

  const update: Record<string, unknown> = { platform, updated_at: new Date().toISOString() }
  if (typeof body.latest_version === 'string') update.latest_version = body.latest_version.trim()
  if (typeof body.minimum_version === 'string') update.minimum_version = body.minimum_version.trim()
  if (typeof body.title === 'string') update.title = body.title
  if (typeof body.message === 'string') update.message = body.message
  if (typeof body.update_url === 'string') update.update_url = body.update_url.trim()
  if (typeof body.force_update === 'boolean') update.force_update = body.force_update
  if (typeof body.enabled === 'boolean') update.enabled = body.enabled

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('app_release_config')
    .upsert(update, { onConflict: 'platform' })
    .select('platform, latest_version, minimum_version, title, message, update_url, force_update, enabled')
    .maybeSingle()

  if (error) {
    console.error('[app-release-config] PATCH failed', { message: error.message })
    return errorJsonWithCors(request, 'Failed to update release config', 500)
  }

  return jsonWithCors({ config: data }, request)
}
