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

export function buildApiHeaders(options: RequestInit, token: string | null): Headers {
  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
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

  const request = CapacitorHttp.request({
    url,
    method,
    headers: headersToRecord(headers),
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
