import { format, parse, startOfWeek } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { WeeklyPlanData } from '@/types'
import {
  buildDayPlansByDate,
  loadAnalyticsBundle,
  WEEK_ANALYTICS_LOOKBACK_DAYS,
} from '@/lib/app/analytics-data'
import { isCalorieBankEnabled } from '@/lib/settings/calorie-bank-user-prefs'
import type { UserSettingsPreferences } from '@/lib/settings/user-settings-types'
import type { AnalysisDayPlanHint } from '@/lib/analytics/analysis-summary'
import type { RecordCheckinRow, RecordDayTargets } from '@/lib/record/record-page-data'

export interface RecordPageData {
  todayStr: string
  checkins: RecordCheckinRow[]
  dayPlansByDate: Record<string, AnalysisDayPlanHint>
  fallbackTargets: RecordDayTargets
  calorieBankEnabled: boolean
  weeklyPlanId: string | null
}

export async function loadRecordPageData(
  supabase: SupabaseClient,
  userId: string
): Promise<RecordPageData> {
  const bundle = await loadAnalyticsBundle(supabase, userId, WEEK_ANALYTICS_LOOKBACK_DAYS)
  const dayPlansByDate = buildDayPlansByDate(bundle.weeklyPlans)

  let fallbackTargets: RecordDayTargets = { calories: 1800, protein_g: 120 }
  const weekStart = format(
    startOfWeek(parse(bundle.todayStr, 'yyyy-MM-dd', new Date()), { weekStartsOn: 1 }),
    'yyyy-MM-dd'
  )
  const currentWeekPlan = bundle.weeklyPlans.find(p => p.week_start === weekStart)
  const currentPlanData = currentWeekPlan?.plan_data as WeeklyPlanData | null
  const todayPlan =
    currentPlanData?.days?.find(d => d.date === bundle.todayStr) ?? currentPlanData?.days?.[0]

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
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .maybeSingle(),
    supabase.from('user_profiles').select('settings_preferences').eq('id', userId).maybeSingle(),
  ])

  const prefs = (profileRow?.settings_preferences ?? null) as UserSettingsPreferences | null

  return {
    todayStr: bundle.todayStr,
    checkins: bundle.checkins.map(c => ({
      checkin_date: c.checkin_date,
      notes: c.notes,
    })),
    dayPlansByDate,
    fallbackTargets,
    calorieBankEnabled: isCalorieBankEnabled(prefs),
    weeklyPlanId: weeklyPlanRow?.id ?? null,
  }
}
