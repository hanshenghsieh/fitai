import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { countQualifiedDaysInMonth } from '@/lib/checkin-utils'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    const year = lastMonth.getFullYear()
    const month = lastMonth.getMonth()

    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0)

    const { data: checkins } = await supabase
      .from('daily_checkins')
      .select('checkin_date, diet_items, workout_items')
      .eq('user_id', user.id)
      .gte('checkin_date', monthStart.toISOString().split('T')[0])
      .lte('checkin_date', monthEnd.toISOString().split('T')[0])

    const completedDays = countQualifiedDaysInMonth(checkins ?? [], year, month)
    const qualifiesForFreeUpgrade = completedDays >= 20

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!subscription) {
      return NextResponse.json({
        qualifies: false,
        message: '還沒有訂閱',
        completedDays,
      })
    }

    if (qualifiesForFreeUpgrade && subscription.stripe_subscription_id) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripe_subscription_id
        ) as { current_period_end: number }

        const nextBillingDate = new Date(stripeSubscription.current_period_end * 1000)
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          trial_end: Math.floor(nextBillingDate.getTime() / 1000),
        })

        await supabase.from('free_upgrades').insert({
          user_id: user.id,
          completed_days: completedDays,
          free_month_start: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          free_month_end: nextBillingDate.toISOString(),
        })

        return NextResponse.json({
          success: true,
          qualifies: true,
          completedDays,
          message: `🎉 恭喜！達標 ${completedDays} 天，下月免費升級！`,
        })
      } catch (stripeErr) {
        console.error('Stripe update error:', stripeErr)
        return NextResponse.json({
          qualifies: true,
          completedDays,
          message: `達標 ${completedDays} 天，符合免費升級資格，請聯繫客服處理`,
        })
      }
    }

    return NextResponse.json({
      qualifies: false,
      completedDays,
      requiredDays: 20,
      remainingDays: Math.max(0, 20 - completedDays),
      message: completedDays > 0
        ? `還差 ${20 - completedDays} 天達成免費升級 💪`
        : '加油！堅持達標 20 天即可免費升級',
    })
  } catch (err) {
    console.error('Error checking free upgrade:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
