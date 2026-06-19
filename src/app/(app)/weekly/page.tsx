export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { format, startOfWeek, differenceInDays } from 'date-fns'
import { colors } from '@/lib/design-system'
import WeeklyPlanView from '@/components/dashboard/WeeklyPlanView'
import type { WeeklyPlanData } from '@/types'

export default async function WeeklyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = new Date()
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const dayOfWeek = differenceInDays(today, new Date(weekStart))

  const [{ data: weeklyPlan }, { data: checkins }, { data: feedback }, { data: profile }] = await Promise.all([
    supabase.from('weekly_plans').select('*').eq('user_id', user.id).eq('week_start', weekStart).single(),
    supabase.from('daily_checkins').select('checkin_date,diet_items,workout_items').eq('user_id', user.id).gte('checkin_date', weekStart),
    supabase.from('weekly_feedback').select('*').eq('user_id', user.id).eq('week_start', weekStart).single(),
    supabase.from('user_profiles').select('*').eq('id', user.id).single(),
  ])

  const planData = weeklyPlan?.plan_data as WeeklyPlanData | null
  const checkinMap = new Map(checkins?.map(c => [c.checkin_date, c]) ?? [])

  return (
    <div className="max-w-lg mx-auto min-h-screen" style={{ backgroundColor: colors.bg.canvas }}>
      <div className="pt-12 px-4 pb-2">
        <h1 className="text-[22px] font-semibold" style={{ color: colors.text.primary }}>本週</h1>
        <p className="text-[13px] mt-1" style={{ color: colors.text.secondary }}>
          這週照你能做到的走。想吃什麼，去 Today 記就好。
        </p>
      </div>

      {planData ? (
        <WeeklyPlanView
          planData={planData}
          weekStart={weekStart}
          todayDayIndex={dayOfWeek}
          profile={profile}
          checkinMap={Object.fromEntries(checkinMap)}
          existingFeedback={feedback ?? null}
          weekNumber={weeklyPlan?.week_number ?? 1}
        />
      ) : (
        <div
          className="m-4 p-8 rounded-3xl text-center space-y-4"
          style={{ backgroundColor: colors.bg.elevated, border: `1px solid ${colors.border.subtle}` }}
        >
          <p className="text-[15px]" style={{ color: colors.text.secondary }}>
            還沒有本週計畫。完成 onboarding 或到設定重排本週。
          </p>
        </div>
      )}
    </div>
  )
}
