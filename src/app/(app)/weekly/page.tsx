export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getWeeklyFeedbackForWeek } from '@/lib/weekly-feedback-store'
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

  const [{ data: weeklyPlan }, { data: checkins }, feedback] = await Promise.all([
    supabase.from('weekly_plans').select('*').eq('user_id', user.id).eq('week_start', weekStart).single(),
    supabase.from('daily_checkins').select('checkin_date,diet_items,workout_items').eq('user_id', user.id).gte('checkin_date', weekStart),
    getWeeklyFeedbackForWeek(supabase, user.id, weekStart),
  ])

  const planData = weeklyPlan?.plan_data as WeeklyPlanData | null
  const checkinMap = new Map(checkins?.map(c => [c.checkin_date, c]) ?? [])

  return (
    <div className="max-w-lg mx-auto min-h-screen pb-8" style={{ backgroundColor: colors.bg.canvas }}>
      {planData ? (
        <WeeklyPlanView
          planData={planData}
          weekStart={weekStart}
          todayDayIndex={dayOfWeek}
          checkinMap={Object.fromEntries(checkinMap)}
          existingFeedback={feedback ?? null}
        />
      ) : (
        <div className="px-5 pt-12">
          <h1 className="text-[22px] font-medium tracking-tight" style={{ color: colors.text.primary }}>
            本週
          </h1>
          <p className="text-[15px] mt-4 leading-relaxed" style={{ color: colors.text.secondary }}>
            還沒有本週計畫。完成 onboarding 後會自動生成。
          </p>
        </div>
      )}
    </div>
  )
}
