export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { format, startOfWeek, differenceInDays } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import WeeklyPlanView from '@/components/dashboard/WeeklyPlanView'
import WeeklyFeedbackForm from '@/components/dashboard/WeeklyFeedbackForm'
import type { WeeklyPlanData } from '@/types'

export default async function WeeklyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = new Date()
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const dayOfWeek = differenceInDays(today, new Date(weekStart))

  const [{ data: weeklyPlan }, { data: checkins }, { data: feedback }] = await Promise.all([
    supabase.from('weekly_plans').select('*').eq('user_id', user.id).eq('week_start', weekStart).single(),
    supabase.from('daily_checkins').select('checkin_date,diet_items,workout_items').eq('user_id', user.id).gte('checkin_date', weekStart),
    supabase.from('weekly_feedback').select('*').eq('user_id', user.id).eq('week_start', weekStart).single(),
  ])

  const planData = weeklyPlan?.plan_data as WeeklyPlanData | null

  // Calculate per-day completion rates
  const checkinMap = new Map(checkins?.map(c => [c.checkin_date, c]) ?? [])

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-4 pt-12 pb-6 text-white">
        <h1 className="text-2xl font-bold">本週計畫</h1>
        <p className="text-emerald-100 text-sm mt-1">
          第 {weeklyPlan?.week_number ?? 1} 週 · {format(new Date(weekStart), 'M/d', { locale: zhTW })} 起
        </p>
      </div>

      {planData ? (
        <WeeklyPlanView
          planData={planData}
          weekStart={weekStart}
          todayDayIndex={dayOfWeek}
          checkinMap={Object.fromEntries(checkinMap)}
          existingFeedback={feedback ?? null}
        />
      ) : (
        <div className="m-4 p-6 bg-white rounded-xl shadow-sm text-center">
          <p className="text-gray-500">尚未生成本週計畫</p>
        </div>
      )}
    </div>
  )
}
