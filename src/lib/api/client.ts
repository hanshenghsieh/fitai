import { CapacitorHttp } from '@capacitor/core'
import { createClient } from '@/lib/supabase/client'
import { isCapacitorNative } from '@/lib/capacitor-native'

/**
 * Production currently 308-redirects apex → www AND does not emit CORS
 * Access-Control-Allow-Origin on /api/*. WKWebView fetch from capacitor://
 * therefore fails with TypeError. Prefer the canonical www host, and on
 * native use CapacitorHttp (URLSession) which bypasses CORS entirely.
 */
interface ApiBaseUrlOptions {
  configuredBase?: string
  browserOrigin?: string | null
  native?: boolean
}

export function resolveApiBaseUrl(options: ApiBaseUrlOptions = {}): string {
  const fromEnv =
    options.configuredBase?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://www.betterbit.app'
  const browserOrigin =
    options.browserOrigin === undefined
      ? typeof window !== 'undefined'
        ? window.location.origin
        : null
      : options.browserOrigin
  const native = options.native ?? isCapacitorNative()

  if (!native && browserOrigin) {
    try {
      const origin = new URL(browserOrigin)
      if (
        (origin.protocol === 'http:' || origin.protocol === 'https:') &&
        (origin.hostname === 'localhost' || origin.hostname === '127.0.0.1')
      ) {
        return origin.origin
      }
    } catch {
      // Fall through to the configured production base.
    }
  }

  return fromEnv
    .replace(/\/$/, '')
    .replace(/^https:\/\/betterbit\.app$/i, 'https://www.betterbit.app')
}

export function apiBaseUrl(): string {
  return resolveApiBaseUrl()
}

export function apiUrl(path: string): string {
  const base = resolveApiBaseUrl()
  if (!base) throw new Error('Missing NEXT_PUBLIC_API_BASE_URL')
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/**
 * Build 38 BUG 1 — a per-request correlation ID sent as a header (never in
 * the URL) so a client-side log line and a server-side log line for the
 * SAME attempt can be matched up. Without this, "the 500 in Vercel logs"
 * and "the 414 the user saw" could never be confirmed as the same request
 * or two different ones.
 */
export function generateClientRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `creq-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function buildApiHeaders(options: RequestInit, token: string | null): Headers {
  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (!headers.has('X-Client-Request-Id')) {
    headers.set('X-Client-Request-Id', generateClientRequestId())
  }
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (
    !isFormData &&
    options.body != null &&
    !headers.has('Content-Type') &&
    typeof options.body === 'string'
  ) {
    headers.set('Content-Type', 'application/json')
  }
  return headers
}

export type ApiRequestTransport = 'capacitor-http' | 'fetch'

export function resolveApiRequestTransport(
  native: boolean,
  body: BodyInit | null | undefined
): ApiRequestTransport {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  return native && !isFormData ? 'capacitor-http' : 'fetch'
}

function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {}
  headers.forEach((value, key) => {
    out[key] = value
  })
  return out
}

function parseJsonBody(body: BodyInit | null | undefined): unknown {
  if (body == null) return undefined
  if (typeof body === 'string') {
    try {
      return JSON.parse(body)
    } catch {
      return body
    }
  }
  return body
}

/**
 * Native (Capacitor) Http via URLSession — no CORS preflight.
 * Falls back to window.fetch on web / FormData uploads.
 */
async function nativeHttpFetch(url: string, options: RequestInit, headers: Headers): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase()
  const data = parseJsonBody(options.body ?? undefined)
  const headerRecord = headersToRecord(headers)
  const requestId = headerRecord['X-Client-Request-Id'] ?? headerRecord['x-client-request-id'] ?? null

  // Build 38 BUG 1 — diagnostic only, no secrets: two builds in a row could
  // not diagnose a real-device 414/500 because nobody could see the actual
  // outgoing request shape. This logs structure (lengths/counts, split into
  // pathname vs query string specifically since a 414 is about URI length),
  // never raw header values or body content — safe to ship, and every log
  // line carries request_id so a client log line and the matching Vercel
  // server log line for the SAME attempt can be confirmed as one request.
  let pathnameLength = 0
  let queryStringLength = 0
  try {
    const parsed = new URL(url)
    pathnameLength = parsed.pathname.length
    queryStringLength = parsed.search.length
  } catch {
    // Malformed URL — fall through, url_length below still reports the raw length.
  }
  const bodyLength = typeof options.body === 'string' ? options.body.length : 0
  console.log('[API_REQUEST]', {
    request_id: requestId,
    method,
    url_length: url.length,
    pathname_length: pathnameLength,
    query_string_length: queryStringLength,
    has_query_string: url.includes('?'),
    header_count: Object.keys(headerRecord).length,
    header_names: Object.keys(headerRecord),
    authorization_length: headerRecord['Authorization']?.length ?? headerRecord['authorization']?.length ?? 0,
    body_length: bodyLength,
  })

  const request = CapacitorHttp.request({
    url,
    method,
    headers: headerRecord,
    data,
    responseType: 'text',
  })
  const result = options.signal
    ? await new Promise<Awaited<typeof request>>((resolve, reject) => {
        const signal = options.signal!
        const onAbort = () => reject(new DOMException('The operation was aborted', 'AbortError'))
        if (signal.aborted) {
          onAbort()
          return
        }
        signal.addEventListener('abort', onAbort, { once: true })
        request.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort))
      })
    : await request

  const bodyText =
    typeof result.data === 'string'
      ? result.data
      : result.data == null
        ? ''
        : JSON.stringify(result.data)

  // CapacitorHttp/URLSession follows redirects internally and reports the
  // FINAL url it actually landed on — comparing it to what we requested is
  // the only way to detect a silent redirect from this layer (STEP 3).
  const finalUrl = typeof result.url === 'string' ? result.url : null
  const redirected = finalUrl != null && finalUrl !== url

  if (result.status >= 400 || redirected) {
    console.log('[API_RESPONSE_ERROR]', {
      request_id: requestId,
      method,
      url_length: url.length,
      status: result.status,
      redirected,
      final_url_length: finalUrl?.length ?? null,
      response_body_length: bodyText.length,
      response_body_preview: bodyText.slice(0, 200),
    })
  }

  return new Response(bodyText, {
    status: result.status,
    headers: result.headers as HeadersInit,
  })
}

/** Authenticated API fetch — Bearer JWT only (no cookie credentials). */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getSupabaseAccessToken()
  const headers = buildApiHeaders(options, token)
  const url = apiUrl(path)

  if (resolveApiRequestTransport(isCapacitorNative(), options.body) === 'capacitor-http') {
    return nativeHttpFetch(url, options, headers)
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

export async function apiFetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options)
  let body: unknown
  try {
    body = await res.json()
  } catch {
    body = undefined
  }
  if (!res.ok) {
    const message =
      (body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
        ? (body as { error: string }).error
        : null) || res.statusText || 'Request failed'
    throw new ApiError(message, res.status, body)
  }
  return body as T
}
