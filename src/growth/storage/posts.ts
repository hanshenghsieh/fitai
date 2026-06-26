import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CreateGrowthPostInput,
  GrowthDashboardStats,
  GrowthPost,
  GrowthPostStatus,
} from '@/growth/types'
import { startOfDay, endOfDay } from 'date-fns'
import { sortGrowthPosts } from '@/growth/storage/sort'

const TABLE = 'growth_posts'

function mapRow(row: Record<string, unknown>): GrowthPost {
  return {
    id: row.id as string,
    platform: row.platform as string,
    post_url: (row.post_url as string | null) ?? null,
    author: (row.author as string | null) ?? null,
    content: row.content as string,
    keyword: (row.keyword as string | null) ?? null,
    created_at: row.created_at as string,
    posted_at: (row.posted_at as string | null) ?? null,
    is_demo: Boolean(row.is_demo),
    status: row.status as GrowthPost['status'],
    ai_score: (row.ai_score as number | null) ?? null,
    ai_reason: (row.ai_reason as string | null) ?? null,
    reply_type: (row.reply_type as GrowthPost['reply_type']) ?? null,
    generated_replies: (row.generated_replies as string[] | null) ?? null,
    reply_content: (row.reply_content as string | null) ?? null,
    replied_at: (row.replied_at as string | null) ?? null,
    updated_at: row.updated_at as string,
  }
}

export interface ListGrowthPostsOptions {
  realOnly?: boolean
}

export async function listGrowthPosts(
  supabase: SupabaseClient,
  options: ListGrowthPostsOptions = { realOnly: true }
): Promise<GrowthPost[]> {
  let query = supabase.from(TABLE).select('*')
  if (options.realOnly !== false) {
    query = query.eq('is_demo', false)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return sortGrowthPosts((data ?? []).map(mapRow))
}

export async function countNonRealPosts(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .or('is_demo.eq.true,post_url.ilike.%mock%,post_url.ilike.%example.com%')

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function getGrowthPost(supabase: SupabaseClient, id: string): Promise<GrowthPost | null> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapRow(data) : null
}

export async function createGrowthPost(
  supabase: SupabaseClient,
  input: CreateGrowthPostInput
): Promise<GrowthPost> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      platform: input.platform,
      post_url: input.postUrl ?? null,
      author: input.author ?? null,
      content: input.content,
      keyword: input.keyword ?? null,
      posted_at: input.postedAt ?? new Date().toISOString(),
      is_demo: input.isDemo ?? false,
      status: 'pending',
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapRow(data)
}

export async function updateGrowthPost(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<{
    status: GrowthPostStatus
    ai_score: number
    ai_reason: string
    reply_type: string
    generated_replies: string[]
    reply_content: string | null
    replied_at: string | null
  }>
): Promise<GrowthPost> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapRow(data)
}

export async function getGrowthDashboardStats(
  supabase: SupabaseClient,
  realOnly = true
): Promise<GrowthDashboardStats> {
  const todayStart = startOfDay(new Date()).toISOString()
  const todayEnd = endOfDay(new Date()).toISOString()

  let query = supabase.from(TABLE).select('status, created_at')
  if (realOnly) query = query.eq('is_demo', false)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = data ?? []
  const todayFound = rows.filter(r => r.created_at >= todayStart && r.created_at <= todayEnd).length

  return {
    todayFound,
    worthReply: rows.filter(r => r.status === 'worth_reply').length,
    replied: rows.filter(r => r.status === 'replied').length,
    skipped: rows.filter(r => r.status === 'skipped').length,
    pending: rows.filter(r => r.status === 'pending').length,
  }
}

export async function clearNonRealGrowthPosts(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .or('is_demo.eq.true,post_url.ilike.%mock%,post_url.ilike.%example.com%')
    .select('id')

  if (error) throw new Error(error.message)
  return data?.length ?? 0
}

export async function clearDemoGrowthPosts(supabase: SupabaseClient): Promise<number> {
  return clearNonRealGrowthPosts(supabase)
}
