import { SUBSCRIPTION_PRICE_LABEL } from '@/lib/stripe-config'

/** RevenueCat identifier. "BetterBit Pro" is display copy only. */
export const APPLE_IAP_ENTITLEMENT_ID = 'premium'

export const APPLE_IAP_OFFERING_ID = 'default'
export const APPLE_IAP_MONTHLY_PACKAGE_ID = '$rc_monthly'
export const APPLE_IAP_ANNUAL_PACKAGE_ID = '$rc_annual'
export const APPLE_IAP_MONTHLY_PRODUCT_ID = 'betterbit_pro_monthly'
export const APPLE_IAP_ANNUAL_PRODUCT_ID = 'Betterbit_pro_annual'
/** Backward-compatible public env check remains tied to the existing monthly product setting. */
export const APPLE_IAP_PRODUCT_ID = APPLE_IAP_MONTHLY_PRODUCT_ID
export const APPLE_IAP_PRODUCT_IDS = [
  APPLE_IAP_MONTHLY_PRODUCT_ID,
  APPLE_IAP_ANNUAL_PRODUCT_ID,
] as const
export type AppleIapProductId = (typeof APPLE_IAP_PRODUCT_IDS)[number]

export function isSupportedAppleIapProductId(
  productId: unknown
): productId is AppleIapProductId {
  return (
    typeof productId === 'string' &&
    (APPLE_IAP_PRODUCT_IDS as readonly string[]).includes(productId)
  )
}

export function isAppleIapEnabled(): boolean {
  return process.env.NEXT_PUBLIC_APPLE_IAP_ENABLED === 'true'
}

export function getRevenueCatIosApiKey(): string {
  return process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY || ''
}

export function hasConsistentAppleIapPublicConfig(): boolean {
  return (
    process.env.NEXT_PUBLIC_APPLE_IAP_PRODUCT_ID === APPLE_IAP_PRODUCT_ID &&
    process.env.NEXT_PUBLIC_APPLE_IAP_ENTITLEMENT_ID === APPLE_IAP_ENTITLEMENT_ID
  )
}

export function isRevenueCatConfigured(): boolean {
  return (
    isAppleIapEnabled() &&
    getRevenueCatIosApiKey().startsWith('appl_') &&
    hasConsistentAppleIapPublicConfig()
  )
}

export const APPLE_IAP_PRICE_LABEL = SUBSCRIPTION_PRICE_LABEL

export const APPLE_IAP_LEGAL_DISCLOSURE =
  '訂閱將透過 Apple ID 扣款，並依 App Store 條款自動續訂，除非於到期前至少 24 小時取消。可在 iPhone「設定 → Apple ID → 訂閱項目」管理或取消。'
