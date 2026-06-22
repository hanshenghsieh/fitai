import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const userId = user.id

    try {
      const { data: subs } = await admin
        .from('subscriptions')
        .select('stripe_subscription_id, status')
        .eq('user_id', userId)

      for (const sub of subs ?? []) {
        if (!sub.stripe_subscription_id) continue
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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete account error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete account' },
      { status: 500 }
    )
  }
}
