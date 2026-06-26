import type { CollectedPost, GrowthCollector } from '@/growth/collectors/types'
import {
  buildStatus,
  notConfiguredSearch,
  safeCollectorCall,
  successResult,
  unavailableResult,
} from '@/growth/collectors/base'

const PLATFORM = 'reddit'
const LABEL = 'Reddit'

const USER_AGENT = process.env.REDDIT_USER_AGENT ?? 'BetterBitGrowthCollector/1.0'

function redditConfigured(): boolean {
  return Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET)
}

async function getRedditToken(): Promise<string> {
  const id = process.env.REDDIT_CLIENT_ID!
  const secret = process.env.REDDIT_CLIENT_SECRET!
  const auth = Buffer.from(`${id}:${secret}`).toString('base64')

  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) throw new Error(`Reddit auth failed: ${res.status}`)
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) throw new Error('Reddit auth: no token')
  return data.access_token
}

function mapRedditChild(child: RedditListingChild, keyword: string | null): CollectedPost | null {
  const d = child.data
  if (!d?.title) return null
  const content = [d.title, d.selftext?.trim()].filter(Boolean).join('\n\n')
  if (!content) return null

  return {
    platform: PLATFORM,
    url: d.permalink ? `https://www.reddit.com${d.permalink}` : `https://reddit.com${d.url ?? ''}`,
    author: d.author ?? null,
    content,
    createdAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : new Date().toISOString(),
    keyword,
  }
}

interface RedditListingChild {
  data?: {
    title?: string
    selftext?: string
    author?: string
    permalink?: string
    url?: string
    created_utc?: number
  }
}

export const redditCollector: GrowthCollector = {
  platform: PLATFORM,
  label: LABEL,
  capability: 'automated_search',
  dataSource: 'official_api',

  getStatus() {
    const configured = redditConfigured()
    return buildStatus(
      this,
      configured,
      configured
        ? '已設定 Reddit API，可依關鍵字搜尋公開貼文（如 r/taiwan、全站）。'
        : '需設定 REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET 才能自動搜尋。',
      [
        '至 reddit.com/prefs/apps 建立 script 類型 App',
        '在 .env.local 設定 REDDIT_CLIENT_ID、REDDIT_CLIENT_SECRET',
        '可選：REDDIT_USER_AGENT',
      ],
      [
        '僅能取得 Reddit 公開資料',
        '有 API rate limit',
        '繁體中文討論量低於 Threads/Dcard，建議關鍵字含 taiwan、fitness、diet',
      ]
    )
  },

  async search({ keywords, limit = 15 }) {
    return safeCollectorCall(this, 'search', async () => {
      if (!redditConfigured()) {
        return notConfiguredSearch(this, [
          '請在 .env.local 設定 Reddit API 憑證。',
          '或改用手動貼上 Reddit 貼文 URL。',
        ])
      }

      const token = await getRedditToken()
      const q = keywords.join(' ')
      const params = new URLSearchParams({
        q,
        sort: 'new',
        limit: String(Math.min(limit, 25)),
        restrict_sr: 'false',
        type: 'link',
      })

      const res = await fetch(`https://oauth.reddit.com/search?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': USER_AGENT,
        },
      })

      if (!res.ok) throw new Error(`Reddit search ${res.status}`)
      const json = (await res.json()) as { data?: { children?: RedditListingChild[] } }
      const keyword = keywords[0] ?? null
      const posts = (json.data?.children ?? [])
        .map(c => mapRedditChild(c, keyword))
        .filter((p): p is CollectedPost => p != null)

      return successResult(
        this,
        posts,
        posts.length ? `Reddit 找到 ${posts.length} 篇` : 'Reddit 搜尋完成，無符合結果',
        true
      )
    })
  },

  async fetchByUrl({ url, keyword }) {
    return safeCollectorCall(this, 'fetch', async () => {
      const jsonUrl = url.replace(/\/?$/, '.json')
      const res = await fetch(jsonUrl, {
        headers: { 'User-Agent': USER_AGENT },
        next: { revalidate: 0 },
      })

      if (!res.ok) {
        return unavailableResult(this, `Reddit 回應 ${res.status}`, `http ${res.status}`)
      }

      const json = (await res.json()) as RedditListingChild[]
      const postData = json[0]?.data?.children?.[0]?.data
      if (!postData?.title) {
        return unavailableResult(this, '無法解析 Reddit 貼文', 'parse failed')
      }

      const post = mapRedditChild({ data: postData }, keyword ?? null)
      if (!post) return unavailableResult(this, '貼文內容為空', 'empty')

      return successResult(this, [post], '已擷取 Reddit 貼文')
    })
  },
}
