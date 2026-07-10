export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { applyCorsHeaders, handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { markPostReplied, markPostSkipped, processPostAnalysis } from '@/growth/services/post-pipeline'
import { getGrowthSupabase } from '@/growth/services/supabase'
import { growthApiError } from '@/growth/services/api-error'

type RouteContext = { params: Promise<{ id: string }> }

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response

  try {
    const { id } = await context.params
    const body = await request.json()
    const supabase = getGrowthSupabase()

    if (body.action === 'reanalyze') {
      const post = await processPostAnalysis(supabase, id)
      return jsonWithCors({ post }, request)
    }

    if (body.action === 'replied') {
      const post = await markPostReplied(supabase, id, body.replyContent)
      return jsonWithCors({ post }, request)
    }

    if (body.action === 'skipped') {
      const post = await markPostSkipped(supabase, id)
      return jsonWithCors({ post }, request)
    }

    return jsonWithCors({ error: 'Unknown action' }, request, { status: 400 })
  } catch (err) {
    return applyCorsHeaders(request, growthApiError(err, 'Failed to update post'))
  }
}
