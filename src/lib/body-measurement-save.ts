import type { SupabaseClient } from '@supabase/supabase-js'
import { getNutritionDayKey } from '@/lib/timezone'

export interface SaveBodyMeasurementInput {
  weight_kg: number
  body_fat_pct?: number | null
  measured_at?: string
}

export function validateBodyMetrics(weight_kg: number, body_fat_pct?: number | null): string | null {
  if (!Number.isFinite(weight_kg) || weight_kg < 20 || weight_kg > 300) {
    return '體重請填 20–300 kg'
  }
  if (body_fat_pct != null && (!Number.isFinite(body_fat_pct) || body_fat_pct < 1 || body_fat_pct > 70)) {
    return '體脂請填 1–70 %'
  }
  return null
}

export async function saveProfileWeight(
  supabase: SupabaseClient,
  userId: string,
  body: Pick<SaveBodyMeasurementInput, 'weight_kg' | 'body_fat_pct'>
): Promise<{ error: Error | null }> {
  const validation = validateBodyMetrics(body.weight_kg, body.body_fat_pct ?? null)
  if (validation) return { error: new Error(validation) }

  const { error } = await supabase
    .from('user_profiles')
    .update({
      weight_kg: body.weight_kg,
      body_fat_pct: body.body_fat_pct ?? null,
    })
    .eq('id', userId)

  if (error) return { error: new Error(error.message) }
  return { error: null }
}

/** Best-effort daily log — failures must not block profile weight save. */
export async function saveBodyMeasurementLog(
  supabase: SupabaseClient,
  userId: string,
  body: SaveBodyMeasurementInput
): Promise<{ error: Error | null }> {
  const measuredAt = body.measured_at ?? getNutritionDayKey()
  const payload = {
    weight_kg: body.weight_kg,
    body_fat_pct: body.body_fat_pct ?? null,
  }

  const { data: existingRows, error: selectError } = await supabase
    .from('body_measurements')
    .select('id')
    .eq('user_id', userId)
    .eq('measured_at', measuredAt)
    .order('created_at', { ascending: false })
    .limit(1)

  if (selectError) return { error: new Error(selectError.message) }

  const existingId = existingRows?.[0]?.id
  if (existingId) {
    const { error } = await supabase.from('body_measurements').update(payload).eq('id', existingId)
    if (error) return { error: new Error(error.message) }
    return { error: null }
  }

  const { error } = await supabase
    .from('body_measurements')
    .insert({ user_id: userId, measured_at: measuredAt, ...payload })
  if (error) return { error: new Error(error.message) }
  return { error: null }
}

export async function saveBodyMeasurementForUser(
  supabase: SupabaseClient,
  userId: string,
  body: SaveBodyMeasurementInput
): Promise<{ error: Error | null; profileSaved: boolean; logSaved: boolean }> {
  const profileResult = await saveProfileWeight(supabase, userId, body)
  if (profileResult.error) {
    return { error: profileResult.error, profileSaved: false, logSaved: false }
  }

  const logResult = await saveBodyMeasurementLog(supabase, userId, body)
  return {
    error: null,
    profileSaved: true,
    logSaved: !logResult.error,
  }
}
