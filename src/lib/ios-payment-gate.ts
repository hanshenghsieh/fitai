import { isAppleIapEnabled } from '@/lib/apple-iap-config'
import { isAppStoreSafeMode } from '@/lib/app-store-safe-mode'
import { isCapacitorNative } from '@/lib/capacitor-native'

const IOS_PLATFORM_COOKIE = 'bb_native_ios=1'
const IOS_PLATFORM_HEADER = 'ios'

/** Capacitor / WKWebView user agents seen in iOS shell loads. */
export function isCapacitorUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false
  return /\bCapacitor\b/i.test(userAgent) || /betterbit-ios/i.test(userAgent)
}

export function hasIosPlatformCookie(cookieHeader: string | null | undefined): boolean {
  return !!cookieHeader?.includes(IOS_PLATFORM_COOKIE)
}

export type HeaderLike = { get(name: string): string | null | undefined }

/** Server-side: block Stripe checkout / billing portal on iOS App shell. */
export function shouldBlockExternalPaymentsOnServer(headers: HeaderLike): boolean {
  if (isAppStoreSafeMode()) return true
  if (headers.get('x-betterbit-platform') === IOS_PLATFORM_HEADER) return true
  if (hasIosPlatformCookie(headers.get('cookie'))) return true
  if (isCapacitorUserAgent(headers.get('user-agent'))) return true
  return false
}

/**
 * Server-side: unlock full features on iOS until Apple IAP ships.
 * When IAP is enabled, paywall + entitlement rules apply normally.
 */
export function shouldGrantFullAccessPreIap(headers: HeaderLike): boolean {
  if (isAppleIapEnabled()) return false
  return shouldBlockExternalPaymentsOnServer(headers)
}

/** Client-side: show Apple IAP subscribe / restore UI on native iOS. */
export function shouldShowAppleIapClient(): boolean {
  if (!isAppleIapEnabled()) return false
  if (typeof window === 'undefined') return false
  if (isCapacitorNative()) return true
  return hasIosPlatformCookie(document.cookie)
}

/**
 * Client-side: hide Stripe / external payment CTAs.
 * Native iOS never shows Stripe. Web may still show Stripe.
 * Does NOT hide Apple IAP UI.
 */
export function shouldHideExternalPaymentsClient(): boolean {
  if (isAppStoreSafeMode()) return true
  if (typeof window === 'undefined') return false
  if (isCapacitorNative()) return true
  return hasIosPlatformCookie(document.cookie)
}

export type PremiumPaymentSurface = 'apple_iap' | 'informational' | 'stripe'

export function resolvePremiumPaymentSurface(input: {
  showAppleIap: boolean
  hideExternalPayments: boolean
}): PremiumPaymentSurface {
  if (input.showAppleIap) return 'apple_iap'
  if (input.hideExternalPayments) return 'informational'
  return 'stripe'
}

/**
 * Pre-IAP TestFlight: hide paywalls and grant free access.
 * Once Apple IAP is enabled, paywalls must show (route to Apple IAP).
 */
export function shouldBypassSubscriptionPaywallClient(): boolean {
  if (shouldShowAppleIapClient()) return false
  return shouldHideExternalPaymentsClient()
}
