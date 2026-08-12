import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { upsertAppleIapSubscription } from '@/lib/apple-iap-store'
import { fetchVerifiedRevenueCatSubscription } from '@/lib/revenuecat-server'
import {
  isRevenueCatWebhookAuthorized,
  parseRevenueCatWebhookTrigger,
} from '@/lib/revenuecat-webhook'
import { captureError } from '@/lib/observability/capture-error'
import { trackServer } from '@/lib/analytics/track-server'
import { billingPeriodFromAppleIapProductId } from '@/lib/subscription-product'
import type { AnalyticsEventName } from '@/lib/analytics/events'

const LIFECYCLE_EVENT_TO_ANALYTICS: Partial<Record<string, AnalyticsEventName>> = {
  INITIAL_PURCHASE: 'subscription_started',
  CANCELLATION: 'subscription_cancelled',
  EXPIRATION: 'subscription_expired',
}

export async function POST(request: NextRequest) {
  if (!process.env.REVENUECAT_WEBHOOK_AUTHORIZATION?.trim()) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }
  if (
    !isRevenueCatWebhookAuthorized(request.headers.get('authorization'))
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const trigger = parseRevenueCatWebhookTrigger(
    await request.json().catch(() => null)
  )
  if (!trigger) {
    return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 })
  }
  if (!trigger.supported) {
    return NextResponse.json({ received: true, processed: false })
  }
  if (trigger.userIds.length === 0) {
    return NextResponse.json(
      { error: 'No verified app user id' },
      { status: 400 }
    )
  }

  try {
    const admin = createAdminClient()
    const analyticsEvent = LIFECYCLE_EVENT_TO_ANALYTICS[trigger.eventType]
    for (const userId of trigger.userIds) {
      const verified = await fetchVerifiedRevenueCatSubscription(userId)
      await upsertAppleIapSubscription(admin, verified)
      if (analyticsEvent === 'subscription_started') {
        await trackServer(
          {
            name: 'subscription_started',
            properties: {
              product_id: verified.productId,
              billing_period: billingPeriodFromAppleIapProductId(verified.productId),
              platform: 'ios',
              provider: 'apple_iap',
            },
          },
          { supabase: admin, userId }
        )
      } else if (analyticsEvent === 'subscription_cancelled' || analyticsEvent === 'subscription_expired') {
        await trackServer({ name: analyticsEvent, properties: {} }, { supabase: admin, userId })
      }
    }
    return NextResponse.json({
      received: true,
      processed: true,
      event_type: trigger.eventType,
    })
  } catch (err) {
    // Never log the authorization header, webhook body, receipt, or transaction data.
    console.error('[revenuecat-webhook] verified lifecycle sync failed', {
      eventType: trigger.eventType,
    })
    captureError(err, {
      feature: 'revenuecat-webhook',
      operation: 'lifecycle-sync',
      extra: { event_type: trigger.eventType },
    })
    return NextResponse.json(
      { error: 'Lifecycle sync failed' },
      { status: 502 }
    )
  }
}
