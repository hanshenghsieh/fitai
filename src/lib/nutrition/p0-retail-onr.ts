import type { QaConfidenceGrade } from '../recommendation-qa/types'
import type { OfficialMenuItem } from '../official-reference/types'

export const P0_RETAIL_ONR_BRANDS = ['hilife', 'okmart', 'pxmart'] as const
export type P0RetailOnrBrandId = (typeof P0_RETAIL_ONR_BRANDS)[number]

export interface P0RetailOnrBrandConfig {
  brand_id: P0RetailOnrBrandId
  canonical_name: string
  store_aliases: string[]
  nutrition_source_url: string
}

export const P0_RETAIL_ONR_CONFIG: Record<P0RetailOnrBrandId, P0RetailOnrBrandConfig> = {
  hilife: {
    brand_id: 'hilife',
    canonical_name: '萊爾富',
    store_aliases: ['萊爾富', 'Hi-Life', 'hilife'],
    nutrition_source_url: 'https://www.hilife.com.tw/productInfo_food.aspx',
  },
  okmart: {
    brand_id: 'okmart',
    canonical_name: 'OK mart',
    store_aliases: ['OK mart', 'OK', 'OK超商', 'okmart'],
    nutrition_source_url: 'https://www.okmart.com.tw/hotProducts_purchase?ID=4',
  },
  pxmart: {
    brand_id: 'pxmart',
    canonical_name: '全聯',
    store_aliases: ['全聯', '全聯福利中心', 'pxmart', 'PX Mart'],
    nutrition_source_url: 'https://www.pxmart.com.tw/exclusive/%E7%BE%8E%E5%91%B3%E5%A0%82',
  },
}

export interface P0RetailOnrCuratedItem {
  name: string
  aliases?: string[]
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber?: number | null
  sugar?: number | null
  sodium?: number | null
  serving_size?: string | null
  source_url: string
  source_type: 'official_website' | 'official_mall' | 'official_pdf' | 'packaging_label'
  source_name: string
  verified_at: string
  verified_by: string
  verification_count: number
  confidence: QaConfidenceGrade
  last_reviewed: string
}

export interface P0RetailOnrBlockedItem {
  brand_id: P0RetailOnrBrandId
  name: string
  category: string
  status: 'blocked_by_missing_official_nutrition'
  reason: string
  attempted_sources: string[]
}

export interface P0RetailOnrCuratedFile {
  policy: 'zero_hallucination'
  sprint: 'p0-retail-onr-rescue'
  brands: Array<{
    brand_id: P0RetailOnrBrandId
    items: P0RetailOnrCuratedItem[]
  }>
  blocked: P0RetailOnrBlockedItem[]
}

export interface P0RetailOnrGateResult {
  ok: boolean
  reasons: string[]
}

const PLACEHOLDER = /估計營養|placeholder|待交叉驗證|模板資料|骰子變體|AI generated/i

export function validateP0RetailOnrItem(item: P0RetailOnrCuratedItem): P0RetailOnrGateResult {
  const reasons: string[] = []
  if (!item.source_url?.trim()) reasons.push('missing source_url')
  if (!Number.isFinite(item.calories)) reasons.push('missing calories')
  if (!Number.isFinite(item.protein)) reasons.push('missing protein')
  if (!Number.isFinite(item.fat)) reasons.push('missing fat')
  if (!Number.isFinite(item.carbs)) reasons.push('missing carbs')
  if (PLACEHOLDER.test(item.name) || PLACEHOLDER.test(item.source_name)) {
    reasons.push('placeholder/template')
  }
  if (item.confidence !== 'A' && item.confidence !== 'B') {
    reasons.push(`confidence ${item.confidence} not A/B`)
  }
  if (/ubereats|foodpanda|google\.com\/maps|myfitnesspal|dcard|ptt/i.test(item.source_url)) {
    reasons.push('forbidden source tier')
  }
  return { ok: reasons.length === 0, reasons }
}

export function curatedItemToOfficialMenuItem(item: P0RetailOnrCuratedItem): OfficialMenuItem {
  return {
    name: item.name,
    aliases: item.aliases,
    calories: item.calories,
    protein: item.protein,
    fat: item.fat,
    carbs: item.carbs,
    fiber: item.fiber ?? null,
    sugar: item.sugar ?? null,
    sodium: item.sodium ?? null,
    serving_size: item.serving_size ?? null,
    source_url: item.source_url,
    verified_at: item.verified_at,
    verified_by: item.verified_by,
    verification_count: item.verification_count,
    confidence: item.confidence,
  }
}
