export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { saveWeeklyFeedback } from '@/lib/weekly-feedback-store'
import { format, startOfWeek } from 'date-fns'
import { getAppUrl } from '@/lib/app-url'

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response
  const { user, supabase, accessToken } = auth

  const body = await request.json()
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const { data, error } = await saveWeeklyFeedback(supabase, user.id, weekStart, body)

  if (error) return jsonWithCors({ error }, request, { status: 500 })

  const appUrl = getAppUrl()
  fetch(`${appUrl}/api/generate-plan`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  }).catch(err => console.error('Plan regen after feedback failed:', err))

  return jsonWithCors({ feedback: data, message: '回饋已收到，下週計畫將依此調整' }, request)
}
