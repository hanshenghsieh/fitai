export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { listGrowthPosts, getGrowthDashboardStats } from '@/growth/storage/posts'
import { importCollectedPosts } from '@/growth/collectors/import'
import { collectedToCreateInput } from '@/growth/collectors/types'
import { getGrowthSupabase } from '@/growth/services/supabase'
import { growthApiError } from '@/growth/services/api-error'

export async function GET() {
  try {
    const supabase = getGrowthSupabase()
    const [posts, stats] = await Promise.all([
      listGrowthPosts(supabase, { realOnly: true }),
      getGrowthDashboardStats(supabase, true),
    ])
    return NextResponse.json({ posts, stats })
  } catch (err) {
    return growthApiError(err, 'Failed to load posts')
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { platform, postUrl, author, content, keyword, postedAt } = body

    if (!platform || !content?.trim() || !postUrl?.trim()) {
      return NextResponse.json({ error: 'platform、url、content 為必填' }, { status: 400 })
    }

    const supabase = getGrowthSupabase()
    const post = collectedToCreateInput({
      platform,
      url: postUrl.trim(),
      author: author ?? null,
      content: content.trim(),
      keyword: keyword ?? null,
      createdAt: postedAt ?? new Date().toISOString(),
    })

    const result = await importCollectedPosts(supabase, [post], { analyze: true })
    if (result.imported[0]) return NextResponse.json({ post: result.imported[0] })
    if (result.skipped[0]) return NextResponse.json({ error: result.skipped[0].reason }, { status: 409 })
    return NextResponse.json({ error: result.errors[0]?.error ?? '建立失敗' }, { status: 500 })
  } catch (err) {
    return growthApiError(err, 'Failed to create post')
  }
}
