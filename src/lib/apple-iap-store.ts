import type { SupabaseClient } from '@supabase/supabase-js'

export interface AppleIapSyncInput {
  userId: string
  active: boolean
  productId: string
  purchasedAt: string
  expiresAt: string
  willRenew: boolean
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
  const syntheticId = buildAppleIapSubscriptionId(input.userId)

  return {
    user_id: input.userId,
    stripe_subscription_id: syntheticId,
    stripe_customer_id: syntheticId,
    status: input.active ? 'active' : 'canceled',
    subscription_source: 'apple_iap',
    plan: 'premium',
    current_period_start: new Date(input.purchasedAt).toISOString(),
    current_period_end: new Date(input.expiresAt).toISOString(),
    cancel_at_period_end: input.active && !input.willRenew,
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
  if (!error) return row

  // Production may not have subscription_source / plan columns yet.
  const legacyRow = {
    user_id: row.user_id,
    stripe_subscription_id: row.stripe_subscription_id,
    stripe_customer_id: row.stripe_customer_id,
    status: row.status,
    current_period_start: row.current_period_start,
    current_period_end: row.current_period_end,
    cancel_at_period_end: row.cancel_at_period_end,
    updated_at: row.updated_at,
  }
  const { error: legacyError } = await supabase.from('subscriptions').upsert(legacyRow, {
    onConflict: 'stripe_subscription_id',
  })
  if (legacyError) throw new Error(legacyError.message)
  return row
}
