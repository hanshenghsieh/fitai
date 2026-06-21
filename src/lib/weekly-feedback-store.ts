import type { SupabaseClient } from '@supabase/supabase-js'
import type { WeeklyFeedback, WorkoutIntensity } from '@/types'

export type WeeklyFeedbackInput = {
  hardest_part?: string | null
  diet_satisfaction?: number | null
  workout_intensity?: WorkoutIntensity | null
  had_sick_days?: boolean
  had_travel?: boolean
  additional_notes?: string | null
}

const PLAN_FEEDBACK_KEY = '_weekFeedback'

function isMissingTableError(message: string) {
  return /could not find the table|schema cache/i.test(message)
}

function feedbackFromPlanData(
  planData: unknown,
  userId: string,
  weekStart: string
): WeeklyFeedback | null {
  if (!planData || typeof planData !== 'object') return null
  const raw = (planData as Record<string, unknown>)[PLAN_FEEDBACK_KEY]
  if (!raw || typeof raw !== 'object') return null

  const row = raw as Record<string, unknown>
  return {
    id: String(row.id ?? 'embedded'),
    user_id: userId,
    week_start: weekStart,
    hardest_part: (row.hardest_part as string | null) ?? null,
    diet_satisfaction: (row.diet_satisfaction as number | null) ?? null,
    workout_intensity: (row.workout_intensity as WorkoutIntensity | null) ?? null,
    had_sick_days: Boolean(row.had_sick_days),
    had_travel: Boolean(row.had_travel),
    additional_notes: (row.additional_notes as string | null) ?? null,
  }
}

export async function getWeeklyFeedbackForWeek(
  supabase: SupabaseClient,
  userId: string,
  weekStart: string
): Promise<WeeklyFeedback | null> {
  const { data, error } = await supabase
    .from('weekly_feedback')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle()

  if (data) return data as WeeklyFeedback
  if (error && !isMissingTableError(error.message)) return null

  const { data: plan } = await supabase
    .from('weekly_plans')
    .select('plan_data')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle()

  return feedbackFromPlanData(plan?.plan_data, userId, weekStart)
}

export async function getLatestWeeklyFeedback(
  supabase: SupabaseClient,
  userId: string
): Promise<WeeklyFeedback | null> {
  const { data, error } = await supabase
    .from('weekly_feedback')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (data) return data as WeeklyFeedback

  if (error && !isMissingTableError(error.message)) return null

  const { data: plans } = await supabase
    .from('weekly_plans')
    .select('week_start, plan_data')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(6)

  let latest: WeeklyFeedback | null = null
  for (const plan of plans ?? []) {
    const feedback = feedbackFromPlanData(plan.plan_data, userId, plan.week_start)
    if (feedback && (!latest || feedback.week_start > latest.week_start)) {
      latest = feedback
    }
  }
  return latest
}

async function saveFeedbackInPlan(
  supabase: SupabaseClient,
  userId: string,
  weekStart: string,
  payload: WeeklyFeedbackInput
): Promise<{ data: WeeklyFeedback | null; error: string | null }> {
  const { data: plan, error: fetchError } = await supabase
    .from('weekly_plans')
    .select('id, plan_data')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle()

  if (fetchError) return { data: null, error: fetchError.message }
  if (!plan) return { data: null, error: '找不到本週計畫' }

  const feedback: WeeklyFeedback = {
    id: 'embedded',
    user_id: userId,
    week_start: weekStart,
    hardest_part: payload.hardest_part ?? null,
    diet_satisfaction: payload.diet_satisfaction ?? null,
    workout_intensity: payload.workout_intensity ?? null,
    had_sick_days: payload.had_sick_days ?? false,
    had_travel: payload.had_travel ?? false,
    additional_notes: payload.additional_notes ?? null,
  }

  const planData =
    plan.plan_data && typeof plan.plan_data === 'object'
      ? (plan.plan_data as Record<string, unknown>)
      : {}

  const { error: updateError } = await supabase
    .from('weekly_plans')
    .update({
      plan_data: {
        ...planData,
        [PLAN_FEEDBACK_KEY]: feedback,
      },
    })
    .eq('id', plan.id)

  if (updateError) return { data: null, error: updateError.message }
  return { data: feedback, error: null }
}

export async function saveWeeklyFeedback(
  supabase: SupabaseClient,
  userId: string,
  weekStart: string,
  payload: WeeklyFeedbackInput
): Promise<{ data: WeeklyFeedback | null; error: string | null }> {
  const row = {
    user_id: userId,
    week_start: weekStart,
    ...payload,
  }

  const { data, error } = await supabase
    .from('weekly_feedback')
    .upsert(row, { onConflict: 'user_id,week_start' })
    .select()
    .single()

  if (!error && data) return { data: data as WeeklyFeedback, error: null }
  if (error && !isMissingTableError(error.message)) {
    return { data: null, error: error.message }
  }

  return saveFeedbackInPlan(supabase, userId, weekStart, payload)
}

export function preserveEmbeddedWeeklyFeedback(
  existingPlanData: unknown,
  nextPlanData: Record<string, unknown>
) {
  if (!existingPlanData || typeof existingPlanData !== 'object') return nextPlanData
  const embedded = (existingPlanData as Record<string, unknown>)[PLAN_FEEDBACK_KEY]
  if (embedded) nextPlanData[PLAN_FEEDBACK_KEY] = embedded
  return nextPlanData
}
