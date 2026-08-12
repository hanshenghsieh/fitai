/**
 * Canonical product-analytics event schema (Phase 2 TASK 2).
 *
 * This is the single place event names and property shapes are defined —
 * components/routes must import from here, never write a raw event-name
 * string inline. Keeping schema and allowlist together means a new property
 * can't silently start flowing to the analytics store without an explicit,
 * reviewed change to this file.
 *
 * Design rules (see docs/founder-kpi-definitions.md for the product context):
 * - event names: snake_case, defined once in ANALYTICS_EVENT_NAMES
 * - properties: stable, typed per event, primitives only
 * - user identity: internal Supabase auth UUID only — never email
 * - never send raw health values (calories/weight/body_fat) as properties;
 *   categorical labels like nutrition_status are fine
 * - PROPERTY_ALLOWLIST is the runtime enforcement of the above — track()
 *   drops any key not listed here for a given event, even if the caller's
 *   TypeScript types were bypassed (e.g. via `as any`).
 */

export type Platform = 'ios' | 'web' | 'unknown'
export type MealLogSource = 'photo' | 'manual' | 'other'
export type BillingPeriod = 'monthly' | 'annual' | 'unknown'
export type ConfidenceBucket = 'high' | 'medium' | 'low' | 'unknown'

/**
 * Photo/manual pipeline outcome classification — shared with Sentry error
 * tags (src/lib/observability/photo-outcome.ts) so the same taxonomy is used
 * whether an incident shows up in the error tracker or the funnel. This is
 * the "至少分類" list from TASK 1's AI Recognition Monitoring requirement.
 */
export const PHOTO_PIPELINE_FAILURE_TYPES = [
  'network_error',
  'provider_error',
  'timeout',
  'parse_error',
  'schema_error',
  'no_food_detected',
  'database_match_failed',
  'unknown_error',
] as const

export type PhotoPipelineFailureType = (typeof PHOTO_PIPELINE_FAILURE_TYPES)[number]

export interface AnalyticsEventPropertiesMap {
  account_created: {
    auth_method: string
    platform: Platform
  }
  onboarding_started: Record<string, never>
  onboarding_completed: {
    duration_seconds: number
    platform: Platform
  }
  meal_log_started: {
    source: MealLogSource
  }
  meal_log_succeeded: {
    source: MealLogSource
    meal_type: string
    nutrition_status: string
    match_type: string
    confidence_bucket: ConfidenceBucket
    duration_ms: number
  }
  meal_log_failed: {
    source: MealLogSource
    failure_type: PhotoPipelineFailureType
    stage: string
  }
  first_meal_logged: Record<string, never>
  app_opened: Record<string, never>
  today_viewed: Record<string, never>
  record_viewed: Record<string, never>
  analysis_viewed: Record<string, never>
  calorie_bank_viewed: Record<string, never>
  paywall_viewed: Record<string, never>
  trial_started: Record<string, never>
  subscription_started: {
    product_id: string
    billing_period: BillingPeriod
    platform: Platform
    provider: string
  }
  subscription_restored: Record<string, never>
  subscription_expired: Record<string, never>
  subscription_cancelled: Record<string, never>
}

export const ANALYTICS_EVENT_NAMES = [
  'account_created',
  'onboarding_started',
  'onboarding_completed',
  'meal_log_started',
  'meal_log_succeeded',
  'meal_log_failed',
  'first_meal_logged',
  'app_opened',
  'today_viewed',
  'record_viewed',
  'analysis_viewed',
  'calorie_bank_viewed',
  'paywall_viewed',
  'trial_started',
  'subscription_started',
  'subscription_restored',
  'subscription_expired',
  'subscription_cancelled',
] as const satisfies readonly (keyof AnalyticsEventPropertiesMap)[]

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number]

/** Runtime allowlist of property keys per event — the enforcement layer behind the types above. */
export const ANALYTICS_PROPERTY_ALLOWLIST: Record<AnalyticsEventName, readonly string[]> = {
  account_created: ['auth_method', 'platform'],
  onboarding_started: [],
  onboarding_completed: ['duration_seconds', 'platform'],
  meal_log_started: ['source'],
  meal_log_succeeded: [
    'source',
    'meal_type',
    'nutrition_status',
    'match_type',
    'confidence_bucket',
    'duration_ms',
  ],
  meal_log_failed: ['source', 'failure_type', 'stage'],
  first_meal_logged: [],
  app_opened: [],
  today_viewed: [],
  record_viewed: [],
  analysis_viewed: [],
  calorie_bank_viewed: [],
  paywall_viewed: [],
  trial_started: [],
  subscription_started: ['product_id', 'billing_period', 'platform', 'provider'],
  subscription_restored: [],
  subscription_expired: [],
  subscription_cancelled: [],
}

/**
 * Keys that must never appear in a property bag, even if the allowlist above
 * is ever mis-edited to include them. Defense in depth, not the primary gate.
 */
export const ANALYTICS_BLOCKED_PROPERTY_KEY_PATTERN =
  /email|password|token|secret|photo|image|weight|body_fat|^calories$|address|phone/i

export type AnalyticsEventInput = {
  [K in AnalyticsEventName]: {
    name: K
    properties: AnalyticsEventPropertiesMap[K]
  }
}[AnalyticsEventName]

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === 'string' && (ANALYTICS_EVENT_NAMES as readonly string[]).includes(value)
}

/**
 * Strips any property key not on this event's allowlist (or matching the
 * blocked-key pattern) and drops non-primitive values. Used by both the
 * server-side and client-side track() entry points so every write path goes
 * through the same gate.
 */
export function sanitizeAnalyticsProperties(
  eventName: AnalyticsEventName,
  properties: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const allowlist = new Set(ANALYTICS_PROPERTY_ALLOWLIST[eventName])
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(properties ?? {})) {
    if (!allowlist.has(key)) continue
    if (ANALYTICS_BLOCKED_PROPERTY_KEY_PATTERN.test(key)) continue
    if (value === null || value === undefined) continue
    const type = typeof value
    if (type !== 'string' && type !== 'number' && type !== 'boolean') continue
    out[key] = value
  }
  return out
}
