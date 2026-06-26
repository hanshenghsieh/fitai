import { threadsCollector } from '@/growth/collectors/threads'
import { dcardCollector } from '@/growth/collectors/dcard'
import { pttCollector } from '@/growth/collectors/ptt'
import { redditCollector } from '@/growth/collectors/reddit'
import type {
  CollectedPost,
  CollectorFetchParams,
  CollectorRunResult,
  CollectorSearchParams,
  CollectorStatus,
  GrowthCollector,
} from '@/growth/collectors/types'
import { detectPlatformFromUrl } from '@/growth/types/platforms'

export const COLLECTORS: GrowthCollector[] = [
  redditCollector,
  pttCollector,
  threadsCollector,
  dcardCollector,
]

const byPlatform = new Map(COLLECTORS.map(c => [c.platform, c]))

export function getCollector(platform: string): GrowthCollector | undefined {
  return byPlatform.get(platform)
}

export function listCollectorStatuses(): CollectorStatus[] {
  return COLLECTORS.map(c => c.getStatus())
}

export async function runCollectorSearch(
  params: CollectorSearchParams & { platforms?: string[] }
): Promise<CollectorRunResult[]> {
  const targets = params.platforms?.length
    ? params.platforms.map(p => getCollector(p)).filter((c): c is GrowthCollector => !!c)
    : COLLECTORS

  return Promise.all(targets.map(c => c.search({ keywords: params.keywords, limit: params.limit })))
}

export async function runCollectorFetch(
  platform: string,
  params: CollectorFetchParams
): Promise<CollectorRunResult> {
  const collector = getCollector(platform)
  if (!collector) {
    return {
      platform,
      posts: [],
      meta: {
        capability: 'unavailable',
        dataSource: 'none',
        configured: false,
        message: `未知平台：${platform}`,
      },
    }
  }
  return collector.fetchByUrl(params)
}

export async function runCollectorFetchByUrl(
  url: string,
  keyword?: string | null
): Promise<CollectorRunResult> {
  const platform = detectPlatformFromUrl(url)
  if (!platform) {
    return {
      platform: 'unknown',
      posts: [],
      meta: {
        capability: 'unavailable',
        dataSource: 'none',
        configured: false,
        message: '無法辨識 URL 所屬平台',
      },
    }
  }
  return runCollectorFetch(platform, { url, keyword })
}

export function flattenCollectorResults(results: CollectorRunResult[]): CollectedPost[] {
  const seen = new Set<string>()
  const posts: CollectedPost[] = []
  for (const result of results) {
    for (const post of result.posts) {
      if (seen.has(post.url)) continue
      seen.add(post.url)
      posts.push(post)
    }
  }
  return posts
}
