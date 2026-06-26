export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { format, startOfWeek, differenceInDays, parse } from 'date-fns'
import { redirect } from 'next/navigation'
import { BB_V2 } from '@/lib/betterbit-v2'
import { getNutritionDayKey } from '@/lib/timezone'
import WeeklyPlanView from '@/components/dashboard/WeeklyPlanView'
import GeneratePlanButton from '@/components/dashboard/GeneratePlanButton'
import ZaiJianPanel from '@/components/character/ZaiJianPanel'
import WeekPlanSkeleton from '@/components/dashboard/week/WeekPlanSkeleton'
import type { WeeklyFeedback, WeeklyPlanData } from '@/types'
import { getAppUser } from '@/lib/supabase/app-session'

async function WeekContent() {
  const { supabase, user } = await getAppUser()
  if (!user) redirect('/login')

  const now = new Date()
  const todayStr = getNutritionDayKey(now)
  const nutritionDate = parse(todayStr, 'yyyy-MM-dd', now)
  const weekStart = format(startOfWeek(nutritionDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const dayOfWeek = differenceInDays(nutritionDate, parse(weekStart, 'yyyy-MM-dd', now))

  const [{ data: weeklyPlan }, { data: checkins }, { data: feedback }] = await Promise.all([
    supabase
      .from('weekly_plans')
      .select('plan_data, week_start, generation_status')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .maybeSingle(),
    supabase
      .from('daily_checkins')
      .select('checkin_date, diet_items, workout_items')
      .eq('user_id', user.id)
      .gte('checkin_date', weekStart),
    supabase
      .from('weekly_feedback')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .maybeSingle(),
  ])

  const planData = weeklyPlan?.plan_data as WeeklyPlanData | null
  const checkinMap = Object.fromEntries((checkins ?? []).map(c => [c.checkin_date, c]))
  const safeDayIndex = Math.min(Math.max(0, dayOfWeek), Math.max(0, (planData?.days?.length ?? 1) - 1))

  if (weeklyPlan?.generation_status === 'generating') {
    return <ZaiJianPanel moment="loading" />
  }

  if (!weeklyPlan || !planData?.days?.length || weeklyPlan.generation_status === 'failed') {
    return (
      <div className="px-5 pt-12 pb-8 space-y-4">
        <header>
          <h1 className="text-[34px] leading-tight" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
            本週
          </h1>
          <p className="text-[15px] mt-2 leading-relaxed" style={{ color: BB_V2.text.secondary }}>
            這週照計畫走。想吃什麼，去今日記就好。
          </p>
        </header>
        <ZaiJianPanel moment="empty">
          <GeneratePlanButton />
        </ZaiJianPanel>
      </div>
    )
  }

  return (
    <div className="pb-4">
      <div className="px-5 pt-4 pb-1">
        <p className="text-[14px] leading-relaxed" style={{ color: BB_V2.text.secondary }}>
          這週照計畫走。想吃什麼，去今日記就好。
        </p>
      </div>
      <WeeklyPlanView
        planData={planData}
        weekStart={weekStart}
        todayDayIndex={safeDayIndex}
        checkinMap={checkinMap}
        existingFeedback={(feedback as WeeklyFeedback | null) ?? null}
      />
    </div>
  )
}

export default function WeeklyPage() {
  return (
    <div className="max-w-lg mx-auto min-h-screen" style={{ backgroundColor: BB_V2.bg.canvas }}>
      <Suspense fallback={<WeekPlanSkeleton />}>
        <WeekContent />
      </Suspense>
    </div>
  )
}
