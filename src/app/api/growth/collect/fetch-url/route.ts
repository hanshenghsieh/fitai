export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { runCollectorFetchByUrl } from '@/growth/collectors/registry'
import { growthApiError } from '@/growth/services/api-error'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const url = body.url?.trim()

    if (!url) {
      return NextResponse.json({ error: '請提供 URL' }, { status: 400 })
    }

    const result = await runCollectorFetchByUrl(url, body.keyword ?? null)
    return NextResponse.json(result)
  } catch (err) {
    return growthApiError(err, 'Collect fetch failed')
  }
}
