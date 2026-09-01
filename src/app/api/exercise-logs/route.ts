import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors, errorJsonWithCors } from '@/lib/api/cors'
import { estimateCaloriesForMet, isActivityType, isValidDurationMinutes } from '@/lib/exercise/activity-met'
import { resolveExerciseLogActivity } from '@/lib/exercise/resolve-activity'
import { loadExerciseLogsForDate } from '@/lib/exercise/exercise-log-load'
import { getNutritionDayKey, isLocalDateKey } from '@/lib/timezone'

const RESOLVE_ERROR_MESSAGES: Record<string, string> = {
  label_required: 'activity_label is required for activity_type "other"',
  unmatched_activity_needs_intensity: 'intensity is required when the activity does not match the catalog',
  invalid_intensity: 'Invalid intensity',
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  const dateParam = request.nextUrl.searchParams.get('date')
  const loggedDate = isLocalDateKey(dateParam) ? dateParam : getNutritionDayKey()

  const logs = await loadExerciseLogsForDate(supabase, user.id, loggedDate)
  return jsonWithCors({ logs }, request)
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  const body = await request.json()

  if (!isActivityType(body.activity_type)) {
    return errorJsonWithCors(request, 'Invalid activity_type', 400)
  }
  const activityType = body.activity_type

  const durationMinutes = Number(body.duration_minutes)
  if (!isValidDurationMinutes(durationMinutes)) {
    return errorJsonWithCors(request, 'Invalid duration_minutes', 400)
  }

  const loggedDate = isLocalDateKey(body.logged_date) ? body.logged_date : getNutritionDayKey()

  const resolved = resolveExerciseLogActivity(activityType, body.activity_label, body.intensity)
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
    .insert({
      user_id: user.id,
      activity_type: activityType,
      activity_label: resolved.value.activity_label,
      activity_name: resolved.value.activity_name,
      met_value: resolved.value.met_value,
      intensity: resolved.value.intensity,
      duration_minutes: Math.round(durationMinutes),
      estimated_calories: estimatedCalories,
      logged_date: loggedDate,
    })
    .select('*')
    .single()

  if (error) return errorJsonWithCors(request, error.message, 500)

  const logs = await loadExerciseLogsForDate(supabase, user.id, loggedDate)
  return jsonWithCors({ log: data, logs }, request)
}
