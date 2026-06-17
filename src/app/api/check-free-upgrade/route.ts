import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { addMonths } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    const monthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1)
    const monthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0)

    // 計算上月達標天數
    const { data: checkIns } = await supabase
      .from('daily_check_ins')
      .select('check_in_date')
      .eq('user_id', user.id)
      .eq('is_completed', true)
      .gte('check_in_date', monthStart.toISOString().split('T')[0])
      .lte('check_in_date', monthEnd.toISOString().split('T')[0])

    const completedDays = new Set(checkIns?.map(c => c.check_in_date)).size || 0
    const qualifiesForFreeUpgrade = completedDays >= 20

    // 獲取當前訂閱信息
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

    // 如果符合免費升級資格，自動延長下月訂閱
    if (qualifiesForFreeUpgrade && subscription.stripe_subscription_id) {
      try {
        // 延長訂閱至下下月（下月免費）
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripe_subscription_id
        )

        const nextBillingDate = new Date(stripeSubscription.current_period_end * 1000)
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          trial_end: Math.floor(nextBillingDate.getTime() / 1000),
        })

        // 更新資料庫記錄
        await supabase.from('free_upgrades').insert({
          user_id: user.id,
          completed_days: completedDays,
          free_month_start: new Date(stripeSubscription.current_period_end * 1000),
          free_month_end: nextBillingDate,
        })

        console.log(`✅ Free upgrade applied to user ${user.id}`)

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
