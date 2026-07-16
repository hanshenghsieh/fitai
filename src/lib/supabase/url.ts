const SUPABASE_HOST_SUFFIX = '.supabase.co'
const SUPABASE_SERVICE_PATH =
  /^\/(?:auth|rest|storage|functions|realtime)\/v1(?:\/|$)/i

/**
 * Supabase clients must receive the project root, never a service URL.
 * Supplying `/rest/v1` makes the SDK derive broken URLs such as
 * `/rest/v1/auth/v1/token`.
 */
export function normalizeSupabaseProjectUrl(value: string | undefined): string {
  const raw = value?.trim()
  if (!raw) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be an absolute URL')
  }

  if (
    parsed.protocol !== 'https:' ||
    !parsed.hostname.toLowerCase().endsWith(SUPABASE_HOST_SUFFIX)
  ) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must use a Supabase HTTPS host')
  }

  const pathname = parsed.pathname.replace(/\/+$/, '') || '/'
  if (pathname !== '/' && !SUPABASE_SERVICE_PATH.test(`${pathname}/`)) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must use the Supabase project root')
  }

  return parsed.origin
}

export type SupabasePublicKeyType =
  | 'publishable'
  | 'legacy-anon'
  | 'invalid'

export function detectSupabasePublicKeyType(
  value: string | undefined
): SupabasePublicKeyType {
  const key = value?.trim()
  if (!key) return 'invalid'
  if (key.startsWith('sb_publishable_')) return 'publishable'

  const parts = key.split('.')
  if (parts.length !== 3 || !parts.every(Boolean)) return 'invalid'
  try {
    const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')
    const payload = JSON.parse(
      decodeURIComponent(
        Array.from(atob(padded), character =>
          `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`
        ).join('')
      )
    ) as { role?: unknown }
    return payload.role === 'anon' ? 'legacy-anon' : 'invalid'
  } catch {
    return 'invalid'
  }
}
