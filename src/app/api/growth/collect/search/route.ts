export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { requireAdminUser } from '@/lib/api/auth'
import { applyCorsHeaders, handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import {
  flattenCollectorResults,
  runCollectorSearch,
} from '@/growth/collectors/registry'
import { growthApiError } from '@/growth/services/api-error'

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminUser(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const keywords = (body.keywords as string[] | undefined)?.filter(Boolean) ?? []
    const platforms = body.platforms as string[] | undefined

    if (!keywords.length) {
      return jsonWithCors({ error: '請提供至少一個關鍵字' }, request, { status: 400 })
    }

    const results = await runCollectorSearch({ keywords, platforms, limit: body.limit ?? 15 })
    const posts = flattenCollectorResults(results)

    return jsonWithCors({ results, posts }, request)
  } catch (err) {
    return applyCorsHeaders(request, growthApiError(err, 'Collect search failed'))
  }
}
