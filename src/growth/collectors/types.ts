/** Unified post shape returned by every Growth collector */
export interface CollectedPost {
  platform: string
  url: string
  author: string | null
  content: string
  createdAt: string
  keyword: string | null
}

export type CollectorCapability =
  | 'automated_search'
  | 'url_fetch'
  | 'manual_only'
  | 'unavailable'

export type CollectorDataSource = 'official_api' | 'public_json' | 'user_provided' | 'none'

export interface CollectorSearchParams {
  keywords: string[]
  limit?: number
}

export interface CollectorFetchParams {
  url: string
  keyword?: string | null
}

export interface CollectorRunMeta {
  capability: CollectorCapability
  dataSource: CollectorDataSource
  configured: boolean
  message: string
  error?: string
}

export interface CollectorRunResult {
  platform: string
  posts: CollectedPost[]
  meta: CollectorRunMeta
}

export interface CollectorStatus {
  platform: string
  label: string
  capability: CollectorCapability
  dataSource: CollectorDataSource
  configured: boolean
  summary: string
  requirements: string[]
  limitations: string[]
}

export interface GrowthCollector {
  readonly platform: string
  readonly label: string
  readonly capability: CollectorCapability
  readonly dataSource: CollectorDataSource
  getStatus(): CollectorStatus
  search(params: CollectorSearchParams): Promise<CollectorRunResult>
  fetchByUrl(params: CollectorFetchParams): Promise<CollectorRunResult>
}

export function collectedToCreateInput(post: CollectedPost): {
  platform: string
  postUrl: string
  author?: string
  content: string
  keyword?: string
  postedAt: string
  isDemo: false
} {
  return {
    platform: post.platform,
    postUrl: post.url,
    author: post.author ?? undefined,
    content: post.content,
    keyword: post.keyword ?? undefined,
    postedAt: post.createdAt,
    isDemo: false,
  }
}
