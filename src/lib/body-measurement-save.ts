import type { SupabaseClient } from '@supabase/supabase-js'
import { getNutritionDayKey } from '@/lib/timezone'
import { appendWeightHistoryToCheckin, type SupabaseWriteError } from '@/lib/weight-history'

export interface SaveBodyMeasurementInput {
  weight_kg: number
  body_fat_pct?: number | null
  measured_at?: string
}

export function validateBodyMetrics(weight_kg: number, body_fat_pct?: number | null): string | null {
  if (!Number.isFinite(weight_kg) || weight_kg < 30 || weight_kg > 250) {
    return '體重請填 30–250 kg'
  }
  if (body_fat_pct != null && (!Number.isFinite(body_fat_pct) || body_fat_pct < 3 || body_fat_pct > 70)) {
    return '體脂請填 3–70 %'
  }
  return null
}

export function weightsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.05
}

export async function saveProfileWeight(
  supabase: SupabaseClient,
  userId: string,
  body: Pick<SaveBodyMeasurementInput, 'weight_kg' | 'body_fat_pct'>
): Promise<{ error: SupabaseWriteError | null }> {
  const validation = validateBodyMetrics(body.weight_kg, body.body_fat_pct ?? null)
  if (validation) return { error: { message: validation } }

  const { error } = await supabase
    .from('user_profiles')
    .update({
      weight_kg: body.weight_kg,
      body_fat_pct: body.body_fat_pct ?? null,
    })
    .eq('id', userId)

  if (error) return { error: { message: error.message, code: error.code, details: error.details, hint: error.hint } }
  return { error: null }
}

/** Best-effort daily log — always append so each save becomes a chart point. */
export async function saveBodyMeasurementLog(
  supabase: SupabaseClient,
  userId: string,
  body: SaveBodyMeasurementInput
): Promise<{
  error: SupabaseWriteError | null
  row?: { id: string; measured_at: string; weight_kg: number; created_at: string }
}> {
  const measuredAt = body.measured_at ?? getNutritionDayKey()
  const payload = {
    user_id: userId,
    measured_at: measuredAt,
    weight_kg: body.weight_kg,
    body_fat_pct: body.body_fat_pct ?? null,
  }

  const { data, error } = await supabase
    .from('body_measurements')
    .insert(payload)
    .select('id, measured_at, weight_kg, created_at')
    .single()
  if (error) return { error: { message: error.message, code: error.code, details: error.details, hint: error.hint } }
  return {
    error: null,
    row: {
      id: data.id,
      measured_at: data.measured_at,
      weight_kg: Number(data.weight_kg),
      created_at: data.created_at,
    },
  }
}

/** Build 38 TASK 5 — temporary diagnostic staging trace, tagged with the client's correlation ID. */
function trace(step: string, requestId: string | null, extra?: Record<string, unknown>): void {
  console.log(`[WEIGHT_TRACE:${step}]`, { request_id: requestId, ...extra })
}

export async function saveBodyMeasurementForUser(
  supabase: SupabaseClient,
  userId: string,
  body: SaveBodyMeasurementInput,
  requestId: string | null = null
): Promise<{
  error: SupabaseWriteError | null
  profileSaved: boolean
  logSaved: boolean
  historySaved: boolean
  row?: { id: string; measured_at: string; weight_kg: number; created_at: string }
}> {
  const measuredAt = body.measured_at ?? getNutritionDayKey()

  trace('5_prev_profile_read_start', requestId)
  const { data: prevProfile } = await supabase
    .from('user_profiles')
    .select('weight_kg')
    .eq('id', userId)
    .single()
  trace('6_prev_profile_read_completed', requestId)
  const priorWeightKg =
    prevProfile?.weight_kg != null && Number.isFinite(Number(prevProfile.weight_kg))
      ? Number(prevProfile.weight_kg)
      : null

  trace('7_profile_update_start', requestId)
  const profileResult = await saveProfileWeight(supabase, userId, body)
  trace('8_profile_update_completed', requestId, { ok: !profileResult.error })
  if (profileResult.error) {
    return { error: profileResult.error, profileSaved: false, logSaved: false, historySaved: false }
  }

  trace('9_daily_checkin_start', requestId)
  const historyResult = await appendWeightHistoryToCheckin(supabase, userId, body.weight_kg, {
    priorWeightKg,
    requestId,
  })
  trace('10_daily_checkin_completed', requestId, { ok: !historyResult.error })
  if (historyResult.error) {
    return {
      error: historyResult.error,
      profileSaved: true,
      logSaved: false,
      historySaved: false,
    }
  }

  trace('11_measurement_insert_start', requestId)
  const logResult = await saveBodyMeasurementLog(supabase, userId, { ...body, measured_at: measuredAt })
  trace('12_measurement_insert_completed', requestId, { ok: !logResult.error })

  return {
    error: null,
    profileSaved: true,
    logSaved: !logResult.error,
    historySaved: true,
    row: logResult.row,
  }
}
