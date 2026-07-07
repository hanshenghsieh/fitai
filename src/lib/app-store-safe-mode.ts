import { isAppleIapEnabled } from '@/lib/apple-iap-config'
import type { AccessStatus } from '@/lib/subscription-access'
import { TRIAL_DAYS } from '@/lib/subscription-access'
import { isCapacitorNative } from '@/lib/capacitor-native'

/**
 * App Store / TestFlight safe mode — hide Stripe, Apple Health placeholders, and payment CTAs.
 * Set NEXT_PUBLIC_APP_STORE_SAFE_MODE=true on iOS review builds (Vercel Production env).
 * Web builds leave this unset or false.
 */
export function isAppStoreSafeMode(): boolean {
  return process.env.NEXT_PUBLIC_APP_STORE_SAFE_MODE === 'true'
}

/** Alias for iOS App Store review builds. */
export const isIOSAppStoreBuild = isAppStoreSafeMode

export interface ReviewAccessOptions {
  /** Server-side: Capacitor iOS / review request headers detected. */
  iosNativeReview?: boolean
}

function shouldGrantReviewFullAccess(options?: ReviewAccessOptions): boolean {
  if (isAppleIapEnabled()) return false
  if (isAppStoreSafeMode()) return true
  if (options?.iosNativeReview) return true
  if (typeof window !== 'undefined' && isCapacitorNative()) return true
  return false
}

/** Full app access during iOS review / pre-IAP — no paywall that leads to Stripe. */
export function withSafeModeAccess(access: AccessStatus, options?: ReviewAccessOptions): AccessStatus {
  if (!shouldGrantReviewFullAccess(options)) return access
  return {
    ...access,
    hasFullAccess: true,
    isTrial: true,
    trialExpired: false,
    trialDaysLeft: Math.max(access.trialDaysLeft, TRIAL_DAYS),
  }
}
