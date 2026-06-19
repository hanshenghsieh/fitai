export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { format, startOfWeek, differenceInDays, subDays } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { redirect } from 'next/navigation'
import type { WeeklyPlanData, DayPlan, UserProfile } from '@/types'
import { colors } from '@/lib/design-system'
import NotificationPrompt from '@/components/dashboard/NotificationPrompt'
import BetterBitHome from '@/components/dashboard/BetterBitHome'
import GeneratePlanButton from '@/components/dashboard/GeneratePlanButton'
import ZaiJianPanel from '@/components/character/ZaiJianPanel'
import { pickZaiJianLine } from '@/lib/copy/zaijian'
import ZaiJian from '@/components/character/ZaiJian'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd')

  const [{ data: weeklyPlan }, { data: checkin }, { data: profileRow }, { data: yesterdayCheckin }] = await Promise.all([
    supabase.from('weekly_plans').select('*').eq('user_id', user.id).eq('week_start', weekStart).single(),
    supabase.from('daily_checkins').select('*').eq('user_id', user.id).eq('checkin_date', todayStr).single(),
    supabase.from('user_profiles').select('*').eq('id', user.id).single(),
    supabase.from('daily_checkins').select('diet_items, workout_items').eq('user_id', user.id).eq('checkin_date', yesterdayStr).single(),
  ])

  const planData = weeklyPlan?.plan_data as WeeklyPlanData | null
  const goalSnapshot = planData?.goal_snapshot
  const dayOfWeek = differenceInDays(today, new Date(weekStart))
  const safeDayIndex = Math.min(Math.max(0, dayOfWeek), Math.max(0, (planData?.days?.length ?? 1) - 1))
  const todayPlan: DayPlan | null = planData?.days?.[safeDayIndex] ?? planData?.days?.[0] ?? null
  const profile = profileRow as UserProfile | null

  const yesterdayDiet = yesterdayCheckin?.diet_items ?? []
  const yesterdayWork = yesterdayCheckin?.workout_items ?? []
  const yesterdayTotal = yesterdayDiet.length + yesterdayWork.length
  const yesterdayDone =
    yesterdayDiet.filter((i: { completed: boolean }) => i.completed).length +
    yesterdayWork.filter((i: { completed: boolean }) => i.completed).length
  const cheatRecovery = yesterdayTotal > 0 && yesterdayDone / yesterdayTotal < 0.5
  const todayLabel = format(today, 'M月d日 EEEE', { locale: zhTW })

  return (
    <div className="max-w-lg mx-auto min-h-screen" style={{ backgroundColor: colors.bg.canvas }}>
      <NotificationPrompt />

      {weeklyPlan?.generation_status === 'generating' && (
        <ZaiJianPanel moment="loading" />
      )}

      {weeklyPlan?.generation_status === 'failed' && (
        <div className="m-4">
          <ZaiJian size="md" line={pickZaiJianLine('error')} layout="bubble" />
        </div>
      )}

      {!weeklyPlan || !planData?.days?.length ? (
        <ZaiJianPanel moment="empty">
          <GeneratePlanButton />
        </ZaiJianPanel>
      ) : todayPlan ? (
        <BetterBitHome
          todayPlan={todayPlan}
          checkin={checkin}
          weeklyPlanId={weeklyPlan?.id ?? null}
          goalSnapshot={goalSnapshot}
          coachNote={planData?.coach_note ?? weeklyPlan?.coach_note ?? null}
          dayIndex={safeDayIndex}
          profile={profile}
          weekNumber={weeklyPlan?.week_number ?? 1}
          cheatRecovery={cheatRecovery}
          todayLabel={todayLabel}
        />
      ) : (
        <ZaiJianPanel moment="empty">
          <GeneratePlanButton />
        </ZaiJianPanel>
      )}
    </div>
  )
}
