export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import {
  flattenCollectorResults,
  runCollectorSearch,
} from '@/growth/collectors/registry'
import { growthApiError } from '@/growth/services/api-error'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const keywords = (body.keywords as string[] | undefined)?.filter(Boolean) ?? []
    const platforms = body.platforms as string[] | undefined

    if (!keywords.length) {
      return NextResponse.json({ error: '請提供至少一個關鍵字' }, { status: 400 })
    }

    const results = await runCollectorSearch({ keywords, platforms, limit: body.limit ?? 15 })
    const posts = flattenCollectorResults(results)

    return NextResponse.json({ results, posts })
  } catch (err) {
    return growthApiError(err, 'Collect search failed')
  }
}
