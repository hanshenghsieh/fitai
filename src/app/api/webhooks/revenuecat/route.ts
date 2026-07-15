import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { upsertAppleIapSubscription } from '@/lib/apple-iap-store'
import { fetchVerifiedRevenueCatSubscription } from '@/lib/revenuecat-server'
import {
  isRevenueCatWebhookAuthorized,
  parseRevenueCatWebhookTrigger,
} from '@/lib/revenuecat-webhook'

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
    for (const userId of trigger.userIds) {
      const verified = await fetchVerifiedRevenueCatSubscription(userId)
      await upsertAppleIapSubscription(admin, verified)
    }
    return NextResponse.json({
      received: true,
      processed: true,
      event_type: trigger.eventType,
    })
  } catch {
    // Never log the authorization header, webhook body, receipt, or transaction data.
    console.error('[revenuecat-webhook] verified lifecycle sync failed', {
      eventType: trigger.eventType,
    })
    return NextResponse.json(
      { error: 'Lifecycle sync failed' },
      { status: 502 }
    )
  }
}
