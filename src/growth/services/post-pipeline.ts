import type { SupabaseClient } from '@supabase/supabase-js'
import { analyzePost, generateReplies, statusFromScore } from '@/growth/analyzer'
import { createGrowthPost, getGrowthPost, updateGrowthPost } from '@/growth/storage/posts'
import type { CreateGrowthPostInput, GrowthPost } from '@/growth/types'

export async function createAndProcessPost(
  supabase: SupabaseClient,
  input: CreateGrowthPostInput
): Promise<GrowthPost> {
  const post = await createGrowthPost(supabase, input)
  return processPostAnalysis(supabase, post.id)
}

export async function processPostAnalysis(
  supabase: SupabaseClient,
  postId: string
): Promise<GrowthPost> {
  const post = await getGrowthPost(supabase, postId)
  if (!post) throw new Error('Post not found')

  const analysis = await analyzePost({
    content: post.content,
    keyword: post.keyword,
    platform: post.platform,
  })

  const status =
    analysis.worthReply && analysis.score >= 45
      ? 'worth_reply'
      : statusFromScore(analysis.score)

  let generatedReplies: string[] | undefined
  if (status === 'worth_reply' || analysis.score >= 45) {
    const replies = await generateReplies({
      content: post.content,
      platform: post.platform,
      replyType: analysis.replyType,
      aiReason: analysis.reason,
    })
    generatedReplies = replies.replies
  }

  return updateGrowthPost(supabase, postId, {
    ai_score: analysis.score,
    ai_reason: analysis.reason,
    reply_type: analysis.replyType,
    status,
    ...(generatedReplies ? { generated_replies: generatedReplies } : {}),
  })
}

export async function markPostReplied(
  supabase: SupabaseClient,
  postId: string,
  replyContent?: string
): Promise<GrowthPost> {
  return updateGrowthPost(supabase, postId, {
    status: 'replied',
    reply_content: replyContent ?? null,
    replied_at: new Date().toISOString(),
  })
}

export async function markPostSkipped(
  supabase: SupabaseClient,
  postId: string
): Promise<GrowthPost> {
  return updateGrowthPost(supabase, postId, { status: 'skipped' })
}
