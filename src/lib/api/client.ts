import { createClient } from '@/lib/supabase/client'

function resolveApiBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://betterbit.app'
  return fromEnv.replace(/\/$/, '')
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

function mergeApiHeaders(options: RequestInit, token: string | null): Headers {
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

/** Authenticated API fetch — Bearer JWT only (no cookie credentials). */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getSupabaseAccessToken()
  return fetch(apiUrl(path), {
    ...options,
    headers: mergeApiHeaders(options, token),
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
