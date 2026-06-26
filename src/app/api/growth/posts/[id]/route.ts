export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { markPostReplied, markPostSkipped, processPostAnalysis } from '@/growth/services/post-pipeline'
import { getGrowthSupabase } from '@/growth/services/supabase'
import { growthApiError } from '@/growth/services/api-error'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const supabase = getGrowthSupabase()

    if (body.action === 'reanalyze') {
      const post = await processPostAnalysis(supabase, id)
      return NextResponse.json({ post })
    }

    if (body.action === 'replied') {
      const post = await markPostReplied(supabase, id, body.replyContent)
      return NextResponse.json({ post })
    }

    if (body.action === 'skipped') {
      const post = await markPostSkipped(supabase, id)
      return NextResponse.json({ post })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    return growthApiError(err, 'Failed to update post')
  }
}
