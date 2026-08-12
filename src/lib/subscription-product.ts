import {
  APPLE_IAP_MONTHLY_PRODUCT_ID,
  APPLE_IAP_ANNUAL_PRODUCT_ID,
} from '@/lib/apple-iap-config'
import type { BillingPeriod } from '@/lib/analytics/events'

export type SubscriptionEnvironment = 'production' | 'sandbox' | 'unknown'

/**
 * Phase 2 TASK 5 — canonical billing-period classification. Never guesses:
 * anything that doesn't exactly match a known product/interval is 'unknown',
 * per the explicit "不要猜" requirement for historic/ambiguous data.
 */
export function billingPeriodFromAppleIapProductId(productId: string | null | undefined): BillingPeriod {
  if (productId === APPLE_IAP_MONTHLY_PRODUCT_ID) return 'monthly'
  if (productId === APPLE_IAP_ANNUAL_PRODUCT_ID) return 'annual'
  return 'unknown'
}

/** Stripe's own recurring.interval on the subscription's price — authoritative, not a guess from the price id string. */
export function billingPeriodFromStripeInterval(interval: string | null | undefined): BillingPeriod {
  if (interval === 'month') return 'monthly'
  if (interval === 'year') return 'annual'
  return 'unknown'
}

export function environmentFromStripeLivemode(livemode: boolean | null | undefined): SubscriptionEnvironment {
  if (livemode === true) return 'production'
  if (livemode === false) return 'sandbox'
  return 'unknown'
}

export function environmentFromAppleIapSandboxFlag(isSandbox: boolean | null | undefined): SubscriptionEnvironment {
  if (isSandbox === true) return 'sandbox'
  if (isSandbox === false) return 'production'
  return 'unknown'
}
