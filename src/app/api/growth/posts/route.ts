export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { applyCorsHeaders, handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { listGrowthPosts, getGrowthDashboardStats } from '@/growth/storage/posts'
import { importCollectedPosts } from '@/growth/collectors/import'
import { collectedToCreateInput } from '@/growth/collectors/types'
import { getGrowthSupabase } from '@/growth/services/supabase'
import { growthApiError } from '@/growth/services/api-error'

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response

  try {
    const supabase = getGrowthSupabase()
    const [posts, stats] = await Promise.all([
      listGrowthPosts(supabase, { realOnly: true }),
      getGrowthDashboardStats(supabase, true),
    ])
    return jsonWithCors({ posts, stats }, request)
  } catch (err) {
    return applyCorsHeaders(request, growthApiError(err, 'Failed to load posts'))
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const { platform, postUrl, author, content, keyword, postedAt } = body

    if (!platform || !content?.trim() || !postUrl?.trim()) {
      return jsonWithCors({ error: 'platform、url、content 為必填' }, request, { status: 400 })
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
    if (result.imported[0]) return jsonWithCors({ post: result.imported[0] }, request)
    if (result.skipped[0]) return jsonWithCors({ error: result.skipped[0].reason }, request, { status: 409 })
    return jsonWithCors({ error: result.errors[0]?.error ?? '建立失敗' }, request, { status: 500 })
  } catch (err) {
    return applyCorsHeaders(request, growthApiError(err, 'Failed to create post'))
  }
}
