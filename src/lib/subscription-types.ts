export const APPLE_REVIEW_DEMO_EMAIL = 'apple-review@betterbit.tw'

export const SUBSCRIPTION_SOURCES = [
  'stripe',
  'apple_iap',
  'apple_review_demo',
  'manual_grant',
] as const

export type SubscriptionSource = (typeof SUBSCRIPTION_SOURCES)[number]

export const PREMIUM_PLANS = ['review_demo', 'premium', 'trial_grant'] as const

export type PremiumPlan = (typeof PREMIUM_PLANS)[number]

export interface SubscriptionRecord {
  status: string
  subscription_source?: string | null
  plan?: string | null
  is_premium?: boolean | null
  subscription_status?: string | null
}

export const SUBSCRIPTION_ACCESS_FIELDS = 'status, subscription_source, plan' as const
