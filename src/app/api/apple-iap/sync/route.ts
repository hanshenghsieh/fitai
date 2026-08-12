import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { upsertAppleIapSubscription } from '@/lib/apple-iap-store'
import {
  isSupportedAppleIapProductId,
  isAppleIapEnabled,
} from '@/lib/apple-iap-config'
import { shouldBlockExternalPaymentsOnServer } from '@/lib/ios-payment-gate'
import {
  fetchVerifiedRevenueCatSubscription,
  parseAppleIapSyncTrigger,
  RevenueCatConfigurationError,
} from '@/lib/revenuecat-server'
import { captureError } from '@/lib/observability/capture-error'
import { trackServer } from '@/lib/analytics/track-server'
import { billingPeriodFromAppleIapProductId } from '@/lib/subscription-product'

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function POST(req: NextRequest) {
  if (!isAppleIapEnabled()) {
    return jsonWithCors({ error: 'Apple IAP not enabled' }, req, { status: 503 })
  }

  if (!shouldBlockExternalPaymentsOnServer(req.headers)) {
    return jsonWithCors({ error: 'Apple IAP sync only available on iOS' }, req, { status: 403 })
  }

  let userId: string | null = null
  try {
    const auth = await requireApiUser(req)
    if (!auth.ok) return auth.response
    const { user } = auth
    userId = user.id

    const parsed = parseAppleIapSyncTrigger(
      await req.json().catch(() => null)
    )
    if (!parsed) {
      return jsonWithCors({ error: 'Invalid payload' }, req, { status: 400 })
    }

    console.info('[IAP_VERIFY_REQUEST]', {
      source: 'server',
      authenticated: true,
      isRestore: parsed.isRestore,
    })
    const verified = await fetchVerifiedRevenueCatSubscription(user.id)
    const admin = createAdminClient()
    const row = await upsertAppleIapSubscription(admin, verified)

    if (verified.active) {
      if (parsed.isRestore) {
        await trackServer(
          { name: 'subscription_restored', properties: {} },
          { supabase: admin, userId: user.id }
        )
      } else {
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
          { supabase: admin, userId: user.id }
        )
      }
    }

    console.info('[IAP_VERIFY_RESPONSE]', {
      source: 'server',
      status: 200,
      active: verified.active,
      productMatches: isSupportedAppleIapProductId(verified.productId),
      persisted: true,
    })
    return jsonWithCors(
      {
        success: true,
        verified: true,
        active: verified.active,
        product_id: verified.productId,
        subscription: {
          status: row.status,
          subscription_source: row.subscription_source,
          current_period_end: row.current_period_end,
        },
        restored: parsed.isRestore,
      },
      req
    )
  } catch (err) {
    const configurationError = err instanceof RevenueCatConfigurationError
    console.error('[IAP_VERIFY_RESPONSE]', {
      source: 'server',
      status: configurationError ? 503 : 502,
      ok: false,
      reason: configurationError ? 'not_configured' : 'verification_failed',
    })
    if (!configurationError) {
      captureError(err, { feature: 'subscription-verification', operation: 'verify-apple-iap', userId })
    }
    return jsonWithCors(
      {
        error: configurationError
          ? 'Apple IAP verification is not configured'
          : 'Unable to verify Apple subscription',
      },
      req,
      { status: configurationError ? 503 : 502 }
    )
  }
}
