import type { AccessStatus } from '@/lib/subscription-access'
import { TRIAL_DAYS } from '@/lib/subscription-access'

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

/** Full app access during review — no paywall surfaces that lead to Stripe. */
export function withSafeModeAccess(access: AccessStatus): AccessStatus {
  if (!isAppStoreSafeMode()) return access
  return {
    ...access,
    hasFullAccess: true,
    isTrial: true,
    trialExpired: false,
    trialDaysLeft: Math.max(access.trialDaysLeft, TRIAL_DAYS),
  }
}
