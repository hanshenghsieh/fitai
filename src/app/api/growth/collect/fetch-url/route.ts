export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { requireAdminUser } from '@/lib/api/auth'
import { applyCorsHeaders, handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { runCollectorFetchByUrl } from '@/growth/collectors/registry'
import { growthApiError } from '@/growth/services/api-error'

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminUser(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const url = body.url?.trim()

    if (!url) {
      return jsonWithCors({ error: '請提供 URL' }, request, { status: 400 })
    }

    const result = await runCollectorFetchByUrl(url, body.keyword ?? null)
    return jsonWithCors(result, request)
  } catch (err) {
    return applyCorsHeaders(request, growthApiError(err, 'Collect fetch failed'))
  }
}
