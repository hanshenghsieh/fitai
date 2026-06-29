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

/** Server-side: block Stripe checkout / billing portal on iOS TestFlight shell. */
export function shouldBlockExternalPaymentsOnServer(headers: Headers): boolean {
  if (isAppStoreSafeMode()) return true
  if (headers.get('x-betterbit-platform') === IOS_PLATFORM_HEADER) return true
  if (hasIosPlatformCookie(headers.get('cookie'))) return true
  if (isCapacitorUserAgent(headers.get('user-agent'))) return true
  return false
}

/** Client-side: hide payment CTAs in Capacitor iOS or App Store safe mode builds. */
export function shouldHideExternalPaymentsClient(): boolean {
  if (isAppStoreSafeMode()) return true
  if (typeof window === 'undefined') return false
  if (isCapacitorNative()) return true
  return hasIosPlatformCookie(document.cookie)
}
