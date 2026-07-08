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
  stripe_subscription_id?: string | null
  current_period_end?: string | null
}

/**
 * Columns used to gate premium access.
 * Keep this list compatible with production schema.
 * Prefer inferring source/plan from `stripe_subscription_id` when
 * `subscription_source` / `plan` columns are missing (see migration
 * `20250619120000_subscription_sources.sql`).
 */
export const SUBSCRIPTION_ACCESS_FIELDS =
  'status, stripe_subscription_id, current_period_end' as const

/** Optional extended fields — only query when schema has been migrated. */
export const SUBSCRIPTION_ACCESS_FIELDS_EXTENDED =
  'status, stripe_subscription_id, subscription_source, plan, current_period_end' as const
