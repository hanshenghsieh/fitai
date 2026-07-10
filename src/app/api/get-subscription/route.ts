import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { countQualifiedDaysInMonth } from '@/lib/checkin-utils'

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiUser(request)
    if (!auth.ok) return auth.response
    const { user, supabase } = auth

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

    return jsonWithCors(
      {
        subscription: subscription || null,
        freeUpgrade: {
          completedDays,
          qualifies: completedDays >= 20,
        },
      },
      request
    )
  } catch (err) {
    console.error('Error getting subscription:', err)
    return jsonWithCors(
      { error: err instanceof Error ? err.message : 'Failed' },
      request,
      { status: 500 }
    )
  }
}
