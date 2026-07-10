export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { applyCorsHeaders, handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import type { CollectedPost } from '@/growth/collectors/types'
import { importCollectedPosts } from '@/growth/collectors/import'
import { getGrowthSupabase } from '@/growth/services/supabase'
import { growthApiError } from '@/growth/services/api-error'

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const posts = body.posts as CollectedPost[] | undefined
    const analyze = body.analyze !== false

    if (!posts?.length) {
      return jsonWithCors({ error: '沒有可匯入的貼文' }, request, { status: 400 })
    }

    const supabase = getGrowthSupabase()
    const result = await importCollectedPosts(supabase, posts, { analyze })

    return jsonWithCors(result, request)
  } catch (err) {
    return applyCorsHeaders(request, growthApiError(err, 'Import failed'))
  }
}

/** Manual single post via collector pipeline */
export async function PUT(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const { platform, url, content, author, keyword, postedAt } = body

    if (!platform || !url?.trim() || !content?.trim()) {
      return jsonWithCors({ error: 'platform、url、content 為必填' }, request, { status: 400 })
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
      return jsonWithCors({ post: result.imported[0], ...result }, request)
    }
    if (result.skipped[0]) {
      return jsonWithCors({ error: result.skipped[0].reason }, request, { status: 409 })
    }
    return jsonWithCors({ error: result.errors[0]?.error ?? '匯入失敗' }, request, { status: 500 })
  } catch (err) {
    return applyCorsHeaders(request, growthApiError(err, 'Manual import failed'))
  }
}
