import type { CollectedPost, GrowthCollector } from '@/growth/collectors/types'
import {
  buildStatus,
  notConfiguredFetch,
  notConfiguredSearch,
  safeCollectorCall,
  unavailableResult,
} from '@/growth/collectors/base'

const PLATFORM = 'threads'
const LABEL = 'Threads'

export const threadsCollector: GrowthCollector = {
  platform: PLATFORM,
  label: LABEL,
  capability: 'manual_only',
  dataSource: 'user_provided',

  getStatus() {
    return buildStatus(
      this,
      true,
      '僅支援 Founder 手動貼上 URL 與內文；Meta 未提供公開搜尋 API。',
      [
        '在 Threads 找到貼文後，複製 URL + 全文到「新增貼文」或「URL 擷取」。',
        '未來若取得 Meta Threads API 權限，可替換此 collector 實作。',
      ],
      [
        '無第三方公開搜尋 API',
        '不支援自動大量爬蟲（違反平台規範）',
        '無法僅憑 URL 穩定擷取（需登入／動態載入）',
      ]
    )
  },

  async search() {
    return notConfiguredSearch(this, [
      '請手動複製貼文到 Dashboard。',
      '自動搜尋需 Meta 官方 API 授權，目前未串接。',
    ])
  },

  async fetchByUrl({ url }) {
    return safeCollectorCall(this, 'fetch', async () => {
      if (!url.includes('threads.net') && !url.includes('threads.com')) {
        return unavailableResult(this, '不是有效的 Threads URL', 'invalid url')
      }
      return unavailableResult(
        this,
        'Threads 貼文需手動複製內文。此 URL 已記錄，請在表單貼上原文。',
        'url_fetch_not_supported'
      )
    })
  },
}

export function manualCollectedFromThreads(input: {
  url: string
  content: string
  author?: string
  keyword?: string
  createdAt?: string
}): CollectedPost {
  return {
    platform: PLATFORM,
    url: input.url,
    author: input.author ?? null,
    content: input.content,
    createdAt: input.createdAt ?? new Date().toISOString(),
    keyword: input.keyword ?? null,
  }
}
