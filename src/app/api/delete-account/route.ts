import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { createAdminClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { isAppleIapSubscriptionId } from '@/lib/apple-iap-store'

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiUser(request)
    if (!auth.ok) return auth.response
    const { user } = auth

    const admin = createAdminClient()
    const userId = user.id

    try {
      const { data: subs } = await admin
        .from('subscriptions')
        .select('stripe_subscription_id, status')
        .eq('user_id', userId)

      for (const sub of subs ?? []) {
        if (!sub.stripe_subscription_id) continue
        if (isAppleIapSubscriptionId(sub.stripe_subscription_id)) continue
        if (sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due') {
          await stripe.subscriptions.cancel(sub.stripe_subscription_id)
        }
      }
    } catch (err) {
      console.error('Stripe cancel on account delete:', err)
    }

    try {
      const { data: uploads } = await admin
        .from('inbody_uploads')
        .select('storage_path')
        .eq('user_id', userId)

      const paths = (uploads ?? []).map(u => u.storage_path).filter(Boolean)
      if (paths.length > 0) {
        await admin.storage.from('inbody-uploads').remove(paths)
      }
    } catch (err) {
      console.error('Storage cleanup on account delete:', err)
    }

    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) {
      return jsonWithCors({ error: error.message }, request, { status: 500 })
    }

    return jsonWithCors({ success: true }, request)
  } catch (err) {
    console.error('Delete account error:', err)
    return jsonWithCors(
      { error: err instanceof Error ? err.message : 'Failed to delete account' },
      request,
      { status: 500 }
    )
  }
}
