import type { GrowthPost, GrowthPostStatus } from '@/growth/types'

const STATUS_ORDER: Record<GrowthPostStatus, number> = {
  worth_reply: 0,
  pending: 1,
  replied: 2,
  skipped: 3,
}

function postTime(post: GrowthPost): number {
  const raw = post.posted_at ?? post.created_at
  return new Date(raw).getTime()
}

export function sortGrowthPosts(posts: GrowthPost[]): GrowthPost[] {
  return [...posts].sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (statusDiff !== 0) return statusDiff

    const scoreDiff = (b.ai_score ?? -1) - (a.ai_score ?? -1)
    if (scoreDiff !== 0) return scoreDiff

    return postTime(b) - postTime(a)
  })
}
