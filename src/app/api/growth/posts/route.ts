export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { listGrowthPosts, getGrowthDashboardStats } from '@/growth/storage/posts'
import { createAndProcessPost } from '@/growth/services/post-pipeline'
import { getGrowthSupabase } from '@/growth/services/supabase'
import { growthApiError } from '@/growth/services/api-error'

export async function GET() {
  try {
    const supabase = getGrowthSupabase()
    const [posts, stats] = await Promise.all([
      listGrowthPosts(supabase),
      getGrowthDashboardStats(supabase),
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

    if (!platform || !content?.trim()) {
      return NextResponse.json({ error: 'platform 與 content 為必填' }, { status: 400 })
    }

    const supabase = getGrowthSupabase()
    const post = await createAndProcessPost(supabase, {
      platform,
      postUrl,
      author,
      content: content.trim(),
      keyword,
      postedAt: postedAt || new Date().toISOString(),
    })

    return NextResponse.json({ post })
  } catch (err) {
    return growthApiError(err, 'Failed to create post')
  }
}
