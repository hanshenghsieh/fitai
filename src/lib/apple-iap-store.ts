import type { SupabaseClient } from '@supabase/supabase-js'

export interface AppleIapSyncInput {
  userId: string
  originalTransactionId: string
  productId?: string | null
  expiresAt?: string | null
}

export interface AppleIapSubscriptionRow {
  user_id: string
  stripe_subscription_id: string
  stripe_customer_id: string
  status: string
  subscription_source: 'apple_iap'
  plan: 'premium'
  current_period_start: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  updated_at: string
}

const APPLE_IAP_PREFIX = 'apple_iap_'

export function buildAppleIapSubscriptionId(originalTransactionId: string): string {
  const trimmed = originalTransactionId.trim()
  if (!trimmed) throw new Error('originalTransactionId required')
  if (trimmed.startsWith(APPLE_IAP_PREFIX)) return trimmed
  return `${APPLE_IAP_PREFIX}${trimmed}`
}

export function isAppleIapSubscriptionId(id?: string | null): boolean {
  return !!id?.startsWith(APPLE_IAP_PREFIX)
}

export function buildAppleIapSubscriptionRow(input: AppleIapSyncInput): AppleIapSubscriptionRow {
  const now = new Date()
  const syntheticId = buildAppleIapSubscriptionId(input.originalTransactionId)
  const periodEnd = input.expiresAt ? new Date(input.expiresAt) : null
  const isActive = !periodEnd || periodEnd.getTime() > now.getTime()

  return {
    user_id: input.userId,
    stripe_subscription_id: syntheticId,
    stripe_customer_id: syntheticId,
    status: isActive ? 'active' : 'canceled',
    subscription_source: 'apple_iap',
    plan: 'premium',
    current_period_start: now.toISOString(),
    current_period_end: periodEnd?.toISOString() ?? null,
    cancel_at_period_end: false,
    updated_at: now.toISOString(),
  }
}

export async function upsertAppleIapSubscription(
  supabase: SupabaseClient,
  input: AppleIapSyncInput
) {
  const row = buildAppleIapSubscriptionRow(input)
  const { error } = await supabase.from('subscriptions').upsert(row, {
    onConflict: 'stripe_subscription_id',
  })
  if (error) throw new Error(error.message)
  return row
}
