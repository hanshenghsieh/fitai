export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { format, startOfWeek, parse } from 'date-fns'
import RecordV2Screen from '@/components/record/RecordV2Screen'
import RecordV2Skeleton from '@/components/record/RecordV2Skeleton'
import type { WeeklyPlanData } from '@/types'
import {
  buildDayPlansByDate,
  loadAnalyticsBundle,
  WEEK_ANALYTICS_LOOKBACK_DAYS,
} from '@/lib/app/analytics-data'
import { getAppUser } from '@/lib/supabase/app-session'
import { isCalorieBankEnabled } from '@/lib/settings/calorie-bank-user-prefs'
import type { UserSettingsPreferences } from '@/lib/settings/user-settings-types'

async function RecordContent() {
  const { supabase, user } = await getAppUser()
  if (!user) redirect('/login')

  const bundle = await loadAnalyticsBundle(supabase, user.id, WEEK_ANALYTICS_LOOKBACK_DAYS)
  const dayPlansByDate = buildDayPlansByDate(bundle.weeklyPlans)

  let fallbackTargets = { calories: 1800, protein_g: 120 }
  const weekStart = format(startOfWeek(parse(bundle.todayStr, 'yyyy-MM-dd', new Date()), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const currentWeekPlan = bundle.weeklyPlans.find(p => p.week_start === weekStart)
  const currentPlanData = currentWeekPlan?.plan_data as WeeklyPlanData | null
  const todayPlan = currentPlanData?.days?.find(d => d.date === bundle.todayStr) ?? currentPlanData?.days?.[0]
  if (todayPlan?.daily_targets) {
    fallbackTargets = {
      calories: todayPlan.daily_targets.calories,
      protein_g: todayPlan.daily_targets.protein_g,
    }
  } else if (currentPlanData?.weekly_targets) {
    fallbackTargets = {
      calories: currentPlanData.weekly_targets.avg_daily_calories,
      protein_g: currentPlanData.weekly_targets.avg_daily_protein_g,
    }
  }

  const [{ data: weeklyPlanRow }, { data: profileRow }] = await Promise.all([
    supabase
      .from('weekly_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .maybeSingle(),
    supabase.from('user_profiles').select('settings_preferences').eq('id', user.id).maybeSingle(),
  ])

  const prefs = (profileRow?.settings_preferences ?? null) as UserSettingsPreferences | null
  const calorieBankEnabled = isCalorieBankEnabled(prefs)

  return (
    <RecordV2Screen
      todayStr={bundle.todayStr}
      checkins={bundle.checkins}
      dayPlansByDate={dayPlansByDate}
      fallbackTargets={fallbackTargets}
      calorieBankEnabled={calorieBankEnabled}
      weeklyPlanId={weeklyPlanRow?.id ?? null}
    />
  )
}

export default function WeeklyPage() {
  return (
    <Suspense fallback={<RecordV2Skeleton />}>
      <RecordContent />
    </Suspense>
  )
}
