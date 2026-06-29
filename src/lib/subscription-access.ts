import { differenceInDays } from 'date-fns'
import {
  APPLE_REVIEW_DEMO_EMAIL,
  type SubscriptionRecord,
  type SubscriptionSource,
} from '@/lib/subscription-types'

export const TRIAL_DAYS = 14

export interface AccessStatus {
  hasFullAccess: boolean
  isTrial: boolean
  isSubscribed: boolean
  trialDaysLeft: number
  trialExpired: boolean
  subscriptionSource?: SubscriptionSource | string | null
  plan?: string | null
  isPremium?: boolean
}

const ACTIVE_STATUSES = new Set(['active', 'trialing'])
const GRANTED_SOURCES = new Set<SubscriptionSource | string>([
  'stripe',
  'apple_iap',
  'apple_review_demo',
  'manual_grant',
])

export function isGrantedPremiumSource(source?: string | null): boolean {
  if (!source) return true
  return GRANTED_SOURCES.has(source)
}

export function isAppleReviewDemoEmail(email?: string | null): boolean {
  return email?.toLowerCase() === APPLE_REVIEW_DEMO_EMAIL
}

export function isPremiumSubscription(subscription: SubscriptionRecord | null | undefined): boolean {
  if (!subscription) return false

  const status = subscription.subscription_status ?? subscription.status
  const source = subscription.subscription_source ?? 'stripe'

  if (subscription.is_premium === true) return true
  if (!isGrantedPremiumSource(source)) return false
  if (!ACTIVE_STATUSES.has(status)) return false

  return true
}

export function getAccessStatus(
  profileCreatedAt: string,
  subscription: SubscriptionRecord | null,
  options?: { userEmail?: string | null }
): AccessStatus {
  if (isAppleReviewDemoEmail(options?.userEmail)) {
    return {
      hasFullAccess: true,
      isTrial: false,
      isSubscribed: true,
      trialDaysLeft: 0,
      trialExpired: false,
      subscriptionSource: 'apple_review_demo',
      plan: 'review_demo',
      isPremium: true,
    }
  }

  const daysSince = differenceInDays(new Date(), new Date(profileCreatedAt))
  const isSubscribed = isPremiumSubscription(subscription)
  const trialDaysLeft = Math.max(0, TRIAL_DAYS - daysSince)
  const isTrial = !isSubscribed && daysSince < TRIAL_DAYS
  const trialExpired = !isSubscribed && daysSince >= TRIAL_DAYS
  const hasFullAccess = isSubscribed || isTrial

  return {
    hasFullAccess,
    isTrial,
    isSubscribed,
    trialDaysLeft,
    trialExpired,
    subscriptionSource: subscription?.subscription_source ?? null,
    plan: subscription?.plan ?? null,
    isPremium: isSubscribed,
  }
}
