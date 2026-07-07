import { SUBSCRIPTION_PRICE_LABEL } from '@/lib/stripe-config'

/** RevenueCat entitlement id configured in dashboard (default: premium). */
export const APPLE_IAP_ENTITLEMENT_ID =
  process.env.NEXT_PUBLIC_APPLE_IAP_ENTITLEMENT_ID || 'premium'

/** App Store subscription product id (informational; RevenueCat offerings drive purchase UI). */
export const APPLE_IAP_PRODUCT_ID =
  process.env.NEXT_PUBLIC_APPLE_IAP_PRODUCT_ID || 'betterbit_pro_monthly'

export function isAppleIapEnabled(): boolean {
  return process.env.NEXT_PUBLIC_APPLE_IAP_ENABLED === 'true'
}

export function getRevenueCatIosApiKey(): string {
  return process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY || ''
}

export function isRevenueCatConfigured(): boolean {
  return isAppleIapEnabled() && !!getRevenueCatIosApiKey()
}

export const APPLE_IAP_PRICE_LABEL = SUBSCRIPTION_PRICE_LABEL

export const APPLE_IAP_LEGAL_DISCLOSURE =
  '訂閱將透過 Apple ID 扣款，並依 App Store 條款自動續訂，除非於到期前至少 24 小時取消。可在 iPhone「設定 → Apple ID → 訂閱項目」管理或取消。'
