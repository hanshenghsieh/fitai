import {
  SUBSCRIPTION_PRICE_MONTHLY,
  SUBSCRIPTION_PRICE_YEARLY,
  SUBSCRIPTION_PRICE_YEARLY_PER_MONTH,
  SUBSCRIPTION_YEARLY_SAVINGS,
} from '@/lib/subscription-pricing'

export type ProPlanId = 'monthly' | 'yearly'

export const PRO_PLAN_LABELS: Record<ProPlanId, string> = {
  monthly: '月繳方案',
  yearly: '年繳方案',
}

export const PRO_PLAN_FULL_LABELS: Record<ProPlanId, string> = {
  monthly: 'BetterBit Pro 月繳方案',
  yearly: 'BetterBit Pro 年繳方案',
}

export const PRO_PLAN_PRICES: Record<ProPlanId, string> = {
  monthly: SUBSCRIPTION_PRICE_MONTHLY,
  yearly: SUBSCRIPTION_PRICE_YEARLY,
}

export function inferProPlanId(productId?: string | null): ProPlanId {
  if (!productId) return 'yearly'
  if (/year|annual|yearly/i.test(productId)) return 'yearly'
  return 'monthly'
}

export function formatProRenewalDate(iso?: string | null): string {
  if (!iso) return '可於 App Store 訂閱項目查看'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '可於 App Store 訂閱項目查看'
  return `${d.getFullYear()} 年 ${String(d.getMonth() + 1).padStart(2, '0')} 月 ${String(d.getDate()).padStart(2, '0')} 日`
}

export function yearlyPlanSubtextLines() {
  return [SUBSCRIPTION_PRICE_YEARLY_PER_MONTH, SUBSCRIPTION_YEARLY_SAVINGS] as const
}

export const PRO_AUTO_RENEW_DISCLOSURE = '訂閱將自動續訂，可隨時在 App 內取消。'

export const PRO_APP_STORE_MANAGE_HINT =
  '訂閱內容可在「App Store > 你的 Apple ID > 訂閱項目」中管理'

export const PRO_ACTIVE_FOOTNOTE =
  '訂閱將會自動續訂，你可以隨時在 App 內或在 App Store 管理訂閱。'
