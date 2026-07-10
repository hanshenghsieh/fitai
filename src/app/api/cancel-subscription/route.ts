import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { cancelSubscription } from '@/lib/stripe'

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiUser(request)
    if (!auth.ok) return auth.response
    const { user, supabase } = auth

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!sub?.stripe_subscription_id) {
      return jsonWithCors({ error: 'No active subscription' }, request, { status: 404 })
    }

    await cancelSubscription(sub.stripe_subscription_id)

    await supabase
      .from('subscriptions')
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq('stripe_subscription_id', sub.stripe_subscription_id)

    return jsonWithCors({ success: true, message: '已設定於本期結束後取消，期間內仍可使用。' }, request)
  } catch (err) {
    console.error('Cancel subscription error:', err)
    return jsonWithCors(
      { error: err instanceof Error ? err.message : 'Failed to cancel' },
      request,
      { status: 500 }
    )
  }
}
