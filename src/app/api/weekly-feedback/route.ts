export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { saveWeeklyFeedback } from '@/lib/weekly-feedback-store'
import { format, startOfWeek } from 'date-fns'
import { getAppUrl } from '@/lib/app-url'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const { data, error } = await saveWeeklyFeedback(supabase, user.id, weekStart, body)

  if (error) return NextResponse.json({ error }, { status: 500 })

  const appUrl = getAppUrl()
  const cookie = request.headers.get('cookie') || ''
  fetch(`${appUrl}/api/generate-plan`, {
    method: 'POST',
    headers: { cookie },
  }).catch(err => console.error('Plan regen after feedback failed:', err))

  return NextResponse.json({ feedback: data, message: '回饋已收到，下週計畫將依此調整' })
}
