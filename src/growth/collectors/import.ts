import type { SupabaseClient } from '@supabase/supabase-js'
import type { CollectedPost } from '@/growth/collectors/types'
import { collectedToCreateInput } from '@/growth/collectors/types'
import { createAndProcessPost } from '@/growth/services/post-pipeline'
import type { GrowthPost } from '@/growth/types'

export async function findExistingUrls(
  supabase: SupabaseClient,
  urls: string[]
): Promise<Set<string>> {
  if (!urls.length) return new Set()
  const { data, error } = await supabase
    .from('growth_posts')
    .select('post_url')
    .in('post_url', urls)

  if (error) throw new Error(error.message)
  return new Set((data ?? []).map(r => r.post_url as string))
}

export interface ImportCollectedResult {
  imported: GrowthPost[]
  skipped: { url: string; reason: string }[]
  errors: { url: string; error: string }[]
}

export async function importCollectedPosts(
  supabase: SupabaseClient,
  posts: CollectedPost[],
  options: { analyze?: boolean } = { analyze: true }
): Promise<ImportCollectedResult> {
  const existing = await findExistingUrls(
    supabase,
    posts.map(p => p.url)
  )

  const imported: GrowthPost[] = []
  const skipped: ImportCollectedResult['skipped'] = []
  const errors: ImportCollectedResult['errors'] = []

  for (const post of posts) {
    if (existing.has(post.url)) {
      skipped.push({ url: post.url, reason: '已存在' })
      continue
    }
    if (!post.content?.trim()) {
      skipped.push({ url: post.url, reason: '內容為空' })
      continue
    }

    try {
      const input = collectedToCreateInput(post)
      const saved = options.analyze
        ? await createAndProcessPost(supabase, input)
        : await import('@/growth/storage/posts').then(m => m.createGrowthPost(supabase, input))
      imported.push(saved)
      existing.add(post.url)
    } catch (err) {
      errors.push({
        url: post.url,
        error: err instanceof Error ? err.message : 'import failed',
      })
    }
  }

  return { imported, skipped, errors }
}
