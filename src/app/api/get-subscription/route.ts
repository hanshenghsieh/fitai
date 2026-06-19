import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { countQualifiedDaysInMonth } from '@/lib/checkin-utils'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

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
