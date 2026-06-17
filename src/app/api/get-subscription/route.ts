import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 獲取當前訂閱
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // 獲取最近的免費升級記錄
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    const monthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1)

    const { data: checkIns } = await supabase
      .from('daily_check_ins')
      .select('check_in_date')
      .eq('user_id', user.id)
      .eq('is_completed', true)
      .gte('check_in_date', monthStart.toISOString().split('T')[0])

    const completedDays = new Set(checkIns?.map(c => c.check_in_date)).size || 0

    return NextResponse.json({
      subscription: subscription || null,
      freeUpgrade: {
        completedDays,
        qualifies: completedDays >= 20,
      },
    })
  } catch (err) {
    console.error('Error getting subscription:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
