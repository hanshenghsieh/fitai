import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { upsertAppleIapSubscription } from '@/lib/apple-iap-store'
import {
  APPLE_IAP_PRODUCT_ID,
  isAppleIapEnabled,
} from '@/lib/apple-iap-config'
import { shouldBlockExternalPaymentsOnServer } from '@/lib/ios-payment-gate'
import {
  fetchVerifiedRevenueCatSubscription,
  parseAppleIapSyncTrigger,
  RevenueCatConfigurationError,
} from '@/lib/revenuecat-server'

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

  try {
    const auth = await requireApiUser(req)
    if (!auth.ok) return auth.response
    const { user } = auth

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
    const row = await upsertAppleIapSubscription(
      createAdminClient(),
      verified
    )

    console.info('[IAP_VERIFY_RESPONSE]', {
      source: 'server',
      status: 200,
      active: verified.active,
      productMatches: verified.productId === APPLE_IAP_PRODUCT_ID,
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
