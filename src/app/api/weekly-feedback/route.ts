import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format, startOfWeek, subWeeks } from 'date-fns'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const lastWeekStart = format(startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('weekly_feedback')
    .upsert({
      user_id: user.id,
      week_start: lastWeekStart,
      ...body,
    }, { onConflict: 'user_id,week_start' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Trigger next week plan generation
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/generate-plan`, { method: 'POST' }).catch(() => {})

  return NextResponse.json({ feedback: data })
}
