import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ORIGINS = new Set([
  'capacitor://localhost',
  'http://localhost',
  'http://localhost:3000',
  'https://localhost',
  'https://betterbit.app',
  'https://www.betterbit.app',
  'https://betterbit.tw',
  'https://www.betterbit.tw',
])

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
const ALLOWED_HEADERS = 'Authorization, Content-Type, X-Requested-With, x-betterbit-platform, X-Client-Request-Id'

function resolveAllowedOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('Origin')?.trim()
  if (!origin) return null
  if (ALLOWED_ORIGINS.has(origin)) return origin
  return null
}

export function applyCorsHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const origin = resolveAllowedOrigin(request)
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Vary', 'Origin')
  }
  response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS)
  response.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS)
  return response
}

export function handleCorsOptions(request: NextRequest): NextResponse {
  const origin = resolveAllowedOrigin(request)
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Max-Age': '86400',
  }
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin
    headers.Vary = 'Origin'
  }
  return new NextResponse(null, { status: 204, headers })
}

export function jsonWithCors(
  body: unknown,
  request: NextRequest,
  init?: ResponseInit
): NextResponse {
  const response = NextResponse.json(body, init)
  return applyCorsHeaders(request, response)
}

export function errorJsonWithCors(
  request: NextRequest,
  message: string,
  status: number
): NextResponse {
  return jsonWithCors({ error: message }, request, { status })
}
