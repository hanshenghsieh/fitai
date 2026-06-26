import type { CollectedPost, GrowthCollector } from '@/growth/collectors/types'
import {
  buildStatus,
  notConfiguredSearch,
  safeCollectorCall,
  successResult,
  unavailableResult,
} from '@/growth/collectors/base'

const PLATFORM = 'ptt'
const LABEL = 'PTT'

function parsePttArticle(html: string, url: string): CollectedPost | null {
  const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/)
  const authorMatch = html.match(/作者\s*[\(（]([^\)）]+)[\)）]/)
  const dateMatch = html.match(/時間\s*[\(（]([^\)）]+)[\)）]/)

  const pushes: string[] = []
  const pushRegex = /<div class="push">[\s\S]*?<span class="f3 hl push-tag">([^<]*)<\/span>[\s\S]*?<span class="f3 push-userid">([^<]*)<\/span>[\s\S]*?<span class="f3 push-content">:([^<]*)</gi
  let m: RegExpExecArray | null
  while ((m = pushRegex.exec(html)) !== null) {
    const tag = m[1].trim()
    const user = m[2].trim()
    const body = m[3].trim()
    if (tag === '→' || tag === '推' || tag === '噓' || !body) continue
    pushes.push(`${user}: ${body}`)
  }

  const mainMatch = html.match(/<div id="main-content"[^>]*>([\s\S]*?)<span class="f2">/i)
  let articleBody = ''
  if (mainMatch) {
    articleBody = mainMatch[1]
      .replace(/<[^>]+>/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  const contentParts = [titleMatch?.[1], articleBody, pushes.length ? `\n--- 推文 ---\n${pushes.join('\n')}` : '']
    .filter(Boolean)
    .join('\n\n')

  if (!contentParts.trim()) return null

  let createdAt = new Date().toISOString()
  if (dateMatch?.[1]) {
    const parsed = new Date(dateMatch[1].replace(/\//g, '-'))
    if (!Number.isNaN(parsed.getTime())) createdAt = parsed.toISOString()
  }

  return {
    platform: PLATFORM,
    url,
    author: authorMatch?.[1]?.trim() ?? null,
    content: contentParts.trim(),
    createdAt,
    keyword: null,
  }
}

export const pttCollector: GrowthCollector = {
  platform: PLATFORM,
  label: LABEL,
  capability: 'url_fetch',
  dataSource: 'public_json',

  getStatus() {
    return buildStatus(
      this,
      true,
      '支援以使用者提供的 PTT 文章 URL 擷取單篇公開內容；不支援關鍵字自動搜尋。',
      [
        '貼上 ptt.cc 文章網址，由 collector 擷取標題、內文與推文。',
        '僅限使用者主動提供的單篇 URL，非大量爬蟲。',
      ],
      [
        'PTT 無官方 API',
        '不支援關鍵字搜尋／版上巡覽',
        '擷取依賴公開 HTML 結構，版面改版可能需更新 parser',
        '需遵守 PTT 使用規範，僅供 Founder 人工審核流程',
      ]
    )
  },

  async search() {
    return notConfiguredSearch(this, [
      'PTT 無合法公開搜尋 API。',
      '請在 PTT 手動找文後，用「URL 擷取」貼上文章連結。',
    ])
  },

  async fetchByUrl({ url, keyword }) {
    return safeCollectorCall(this, 'fetch', async () => {
      if (!url.includes('ptt.cc')) {
        return unavailableResult(this, '不是有效的 PTT URL', 'invalid url')
      }

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'BetterBitGrowthCollector/1.0 (founder manual fetch; +https://betterbit.app)',
          'Accept-Language': 'zh-TW,zh;q=0.9',
        },
        next: { revalidate: 0 },
      })

      if (!res.ok) {
        return unavailableResult(this, `PTT 回應 ${res.status}`, `http ${res.status}`)
      }

      const html = await res.text()
      const post = parsePttArticle(html, url)
      if (!post) {
        return unavailableResult(this, '無法解析此 PTT 文章', 'parse failed')
      }

      if (keyword) post.keyword = keyword
      return successResult(this, [post], `已擷取 PTT 文章（${post.author ?? '未知作者'}）`)
    })
  },
}
