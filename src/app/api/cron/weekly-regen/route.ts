import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { format, startOfWeek } from 'date-fns'

// Called by Vercel Cron every Monday at 00:01 Taiwan time (UTC+8 = Sunday 16:01 UTC)
// vercel.json: { "crons": [{ "path": "/api/cron/weekly-regen", "schedule": "1 16 * * 0" }] }
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  // Find all users who completed onboarding but don't have a plan for this week
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('onboarding_completed', true)

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  const { data: existingPlans } = await supabase
    .from('weekly_plans')
    .select('user_id')
    .eq('week_start', weekStart)
    .in('user_id', profiles.map(p => p.id))

  const existingUserIds = new Set(existingPlans?.map(p => p.user_id) ?? [])
  const usersNeedingPlan = profiles.filter(p => !existingUserIds.has(p.id))

  // Trigger plan generation for each user (fire and forget, max 10 concurrent)
  const results = await Promise.allSettled(
    usersNeedingPlan.slice(0, 10).map(p =>
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/generate-plan`, {
        method: 'POST',
        headers: { 'x-user-id': p.id },
      })
    )
  )

  const succeeded = results.filter(r => r.status === 'fulfilled').length
  return NextResponse.json({ processed: usersNeedingPlan.length, succeeded })
}
