import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, createCustomerIfNotExists, createSubscription, SUBSCRIPTION_PLANS } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { priceId } = await req.json()

    if (!priceId) {
      return NextResponse.json({ error: 'Missing priceId' }, { status: 400 })
    }

    // 獲取用戶信息
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email:id')
      .eq('id', user.id)
      .single()

    // 建立或獲取 Stripe customer
    const customerId = await createCustomerIfNotExists(
      user.id,
      user.email || 'user@fitai.app',
      user.user_metadata?.name
    )

    // 建立訂閱
    const subscription = await createSubscription(customerId, priceId)

    // 保存訂閱信息到 Supabase
    const { error: dbError } = await supabase.from('subscriptions').insert({
      user_id: user.id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: false,
    })

    if (dbError) {
      console.error('Database error:', dbError)
    }

    // 返回 client secret 用於前端支付
    const latestInvoice = subscription.latest_invoice as any
    const clientSecret = latestInvoice?.payment_intent?.client_secret

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret: clientSecret,
    })
  } catch (err) {
    console.error('Error creating subscription:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
