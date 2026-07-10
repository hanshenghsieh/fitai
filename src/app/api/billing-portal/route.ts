import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { stripe } from '@/lib/stripe'
import { getAppUrl } from '@/lib/app-url'
import { shouldBlockExternalPaymentsOnServer } from '@/lib/ios-payment-gate'

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function POST(req: NextRequest) {
  if (shouldBlockExternalPaymentsOnServer(req.headers)) {
    return jsonWithCors(
      { error: 'iOS App 請在 App Store 管理訂閱', code: 'USE_APPLE_IAP' },
      req,
      { status: 403 }
    )
  }

  try {
    const auth = await requireApiUser(req)
    if (!auth.ok) return auth.response
    const { user, supabase } = auth

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!sub?.stripe_customer_id) {
      return jsonWithCors({ error: 'No billing account' }, req, { status: 404 })
    }

    const appUrl = getAppUrl()
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${appUrl}/settings/premium`,
    })

    return jsonWithCors({ url: session.url }, req)
  } catch (err) {
    console.error('Billing portal error:', err)
    return jsonWithCors(
      { error: err instanceof Error ? err.message : 'Failed to open portal' },
      req,
      { status: 500 }
    )
  }
}
