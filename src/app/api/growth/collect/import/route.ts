export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import type { CollectedPost } from '@/growth/collectors/types'
import { importCollectedPosts } from '@/growth/collectors/import'
import { getGrowthSupabase } from '@/growth/services/supabase'
import { growthApiError } from '@/growth/services/api-error'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const posts = body.posts as CollectedPost[] | undefined
    const analyze = body.analyze !== false

    if (!posts?.length) {
      return NextResponse.json({ error: '沒有可匯入的貼文' }, { status: 400 })
    }

    const supabase = getGrowthSupabase()
    const result = await importCollectedPosts(supabase, posts, { analyze })

    return NextResponse.json(result)
  } catch (err) {
    return growthApiError(err, 'Import failed')
  }
}

/** Manual single post via collector pipeline */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { platform, url, content, author, keyword, postedAt } = body

    if (!platform || !url?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'platform、url、content 為必填' }, { status: 400 })
    }

    const post: CollectedPost = {
      platform,
      url: url.trim(),
      author: author ?? null,
      content: content.trim(),
      createdAt: postedAt ?? new Date().toISOString(),
      keyword: keyword ?? null,
    }

    const supabase = getGrowthSupabase()
    const result = await importCollectedPosts(supabase, [post], { analyze: true })

    if (result.imported[0]) {
      return NextResponse.json({ post: result.imported[0], ...result })
    }
    if (result.skipped[0]) {
      return NextResponse.json({ error: result.skipped[0].reason }, { status: 409 })
    }
    return NextResponse.json({ error: result.errors[0]?.error ?? '匯入失敗' }, { status: 500 })
  } catch (err) {
    return growthApiError(err, 'Manual import failed')
  }
}
