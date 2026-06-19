import { format, startOfWeek } from 'date-fns'
import { createServiceClient } from '@/lib/supabase/server'
import { triggerPlanRegeneration } from '@/lib/plan-regen'

// Called by Vercel Cron every Monday — regen plans for all onboarded users
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('onboarding_completed', true)

  if (!profiles?.length) {
    return NextResponse.json({ processed: 0, succeeded: 0 })
  }

  const results = await Promise.allSettled(
    profiles.map(p =>
      triggerPlanRegeneration(p.id, '每週自動更新計畫')
    )
  )

  const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.ok).length
  return NextResponse.json({
    processed: profiles.length,
    succeeded,
    week_start: weekStart,
  })
}
