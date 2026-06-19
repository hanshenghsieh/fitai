import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cancelSubscription } from '@/lib/stripe'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!sub?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 404 })
    }

    await cancelSubscription(sub.stripe_subscription_id)

    await supabase
      .from('subscriptions')
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq('stripe_subscription_id', sub.stripe_subscription_id)

    return NextResponse.json({ success: true, message: '已設定於本期結束後取消，期間內仍可使用。' })
  } catch (err) {
    console.error('Cancel subscription error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to cancel' },
      { status: 500 }
    )
  }
}
