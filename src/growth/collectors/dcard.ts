import type { GrowthCollector } from '@/growth/collectors/types'
import { buildStatus, notConfiguredFetch, notConfiguredSearch } from '@/growth/collectors/base'

const PLATFORM = 'dcard'
const LABEL = 'Dcard'

export const dcardCollector: GrowthCollector = {
  platform: PLATFORM,
  label: LABEL,
  capability: 'manual_only',
  dataSource: 'user_provided',

  getStatus() {
    return buildStatus(
      this,
      true,
      '僅支援手動貼文。Dcard 無公開第三方搜尋 API。',
      [
        '在 Dcard 找到貼文後，複製文章 URL 與完整內文。',
        '可透過「新增貼文」匯入，流程與 collector 輸出格式一致。',
      ],
      [
        '無官方公開 API 可供搜尋',
        '文章多為前端渲染，伺服器端無法穩定擷取全文',
        '不支援自動爬蟲大量收集',
      ]
    )
  },

  async search() {
    return notConfiguredSearch(this, [
      '請在 Dcard 手動找文後貼上。',
      '若未來有官方合作 API，可替換此 collector。',
    ])
  },

  async fetchByUrl({ url }) {
    return notConfiguredFetch(this, [
      'Dcard 頁面需瀏覽器登入與 JS 渲染，目前不實作自動擷取。',
      `請手動複製內文。URL：${url}`,
    ])
  },
}
