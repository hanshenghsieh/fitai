import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { createCustomerIfNotExists, createCheckoutSession } from '@/lib/stripe'
import { getStripePriceId } from '@/lib/stripe-config'
import { getAppUrl } from '@/lib/app-url'
import { shouldBlockExternalPaymentsOnServer } from '@/lib/ios-payment-gate'

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function POST(req: NextRequest) {
  if (shouldBlockExternalPaymentsOnServer(req.headers)) {
    return jsonWithCors(
      { error: 'iOS App 請使用 App Store 訂閱', code: 'USE_APPLE_IAP' },
      req,
      { status: 403 }
    )
  }

  try {
    const auth = await requireApiUser(req)
    if (!auth.ok) return auth.response
    const { user } = auth

    const { priceId: bodyPriceId } = await req.json().catch(() => ({}))
    const priceId = bodyPriceId || getStripePriceId()

    if (!priceId) {
      return jsonWithCors({ error: '訂閱尚未開放，請稍後再試' }, req, { status: 503 })
    }

    const appUrl = getAppUrl()

    const customerId = await createCustomerIfNotExists(
      user.id,
      user.email || 'user@zaijian.app',
      user.user_metadata?.name
    )

    const session = await createCheckoutSession(
      customerId,
      priceId,
      user.id,
      `${appUrl}/settings/premium?subscribed=1`,
      `${appUrl}/settings/premium?canceled=1`
    )

    if (!session.url) {
      return jsonWithCors({ error: 'Failed to create checkout session' }, req, { status: 500 })
    }

    return jsonWithCors({
      success: true,
      url: session.url,
    }, req)
  } catch (err) {
    console.error('Error creating subscription:', err)
    return jsonWithCors(
      { error: err instanceof Error ? err.message : 'Failed to create subscription' },
      req,
      { status: 500 }
    )
  }
}
