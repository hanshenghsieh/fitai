import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors, errorJsonWithCors } from '@/lib/api/cors'
import { estimateCaloriesForMet, isActivityType, isValidDurationMinutes } from '@/lib/exercise/activity-met'
import { resolveExerciseLogActivity } from '@/lib/exercise/resolve-activity'
import { loadExerciseLogsForDate } from '@/lib/exercise/exercise-log-load'

type RouteCtx = { params: Promise<{ id: string }> }

const RESOLVE_ERROR_MESSAGES: Record<string, string> = {
  label_required: 'activity_label is required for activity_type "other"',
  unmatched_activity_needs_intensity: 'intensity is required when the activity does not match the catalog',
  invalid_intensity: 'Invalid intensity',
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  const { data: existing, error: fetchError } = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) return errorJsonWithCors(request, 'Not found', 404)

  const body = await request.json()

  const activityType = body.activity_type != null ? body.activity_type : existing.activity_type
  if (!isActivityType(activityType)) {
    return errorJsonWithCors(request, 'Invalid activity_type', 400)
  }

  const durationMinutes = body.duration_minutes != null ? Number(body.duration_minutes) : existing.duration_minutes
  if (!isValidDurationMinutes(durationMinutes)) {
    return errorJsonWithCors(request, 'Invalid duration_minutes', 400)
  }

  const rawLabel = body.activity_label != null ? body.activity_label : existing.activity_label
  const rawIntensity = body.intensity != null ? body.intensity : existing.intensity

  const resolved = resolveExerciseLogActivity(activityType, rawLabel, rawIntensity)
  if (!resolved.ok) {
    return errorJsonWithCors(request, RESOLVE_ERROR_MESSAGES[resolved.error], 400)
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('weight_kg')
    .eq('id', user.id)
    .single()

  const estimatedCalories = estimateCaloriesForMet(resolved.value.met_value, durationMinutes, profile?.weight_kg)

  const { data, error } = await supabase
    .from('exercise_logs')
    .update({
      activity_type: activityType,
      activity_label: resolved.value.activity_label,
      activity_name: resolved.value.activity_name,
      met_value: resolved.value.met_value,
      intensity: resolved.value.intensity,
      duration_minutes: Math.round(durationMinutes),
      estimated_calories: estimatedCalories,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error) return errorJsonWithCors(request, error.message, 500)

  const logs = await loadExerciseLogsForDate(supabase, user.id, existing.logged_date)
  return jsonWithCors({ log: data, logs }, request)
}

export async function DELETE(request: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  const { data: existing } = await supabase
    .from('exercise_logs')
    .select('logged_date')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  const { error } = await supabase.from('exercise_logs').delete().eq('id', id).eq('user_id', user.id)
  if (error) return errorJsonWithCors(request, error.message, 500)

  const logs = existing ? await loadExerciseLogsForDate(supabase, user.id, existing.logged_date) : []
  return jsonWithCors({ logs }, request)
}
