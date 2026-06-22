import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCustomerIfNotExists, createCheckoutSession } from '@/lib/stripe'
import { getStripePriceId } from '@/lib/stripe-config'
import { getAppUrl } from '@/lib/app-url'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { priceId: bodyPriceId } = await req.json().catch(() => ({}))
    const priceId = bodyPriceId || getStripePriceId()

    if (!priceId) {
      return NextResponse.json({ error: '訂閱尚未開放，請稍後再試' }, { status: 503 })
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
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      url: session.url,
    })
  } catch (err) {
    console.error('Error creating subscription:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
