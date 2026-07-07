import type { SupabaseClient } from '@supabase/supabase-js'
import { format, parseISO, subDays } from 'date-fns'
import { getNutritionDayKey } from '@/lib/timezone'
import { appendWeightHistoryToCheckin } from '@/lib/weight-history'

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

export function weightsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.05
}

/** Keep prior profile weight in history when user updates — otherwise trend stays at one point. */
async function backfillPreviousWeightIfMissing(
  supabase: SupabaseClient,
  userId: string,
  previousWeightKg: number,
  beforeMeasuredAt: string,
  bodyFatPct?: number | null
): Promise<void> {
  const { data: rows, error } = await supabase
    .from('body_measurements')
    .select('weight_kg')
    .eq('user_id', userId)

  if (error) return
  if (rows?.some(r => r.weight_kg != null && weightsMatch(r.weight_kg, previousWeightKg))) return

  const anchorDay = beforeMeasuredAt.slice(0, 10)
  const backfillDay = format(subDays(parseISO(anchorDay), 1), 'yyyy-MM-dd')

  await supabase.from('body_measurements').insert({
    user_id: userId,
    measured_at: backfillDay,
    weight_kg: previousWeightKg,
    body_fat_pct: bodyFatPct ?? null,
  })
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
    .select('id, weight_kg')
    .eq('user_id', userId)
    .eq('measured_at', measuredAt)
    .order('created_at', { ascending: false })
    .limit(1)

  if (selectError) return { error: new Error(selectError.message) }

  const latest = existingRows?.[0]
  if (latest) {
    if (latest.weight_kg === body.weight_kg) {
      const { error } = await supabase.from('body_measurements').update(payload).eq('id', latest.id)
      if (error) return { error: new Error(error.message) }
      return { error: null }
    }
    // Different weight same day — append so progress can draw a trend line.
    const { error } = await supabase
      .from('body_measurements')
      .insert({ user_id: userId, measured_at: measuredAt, ...payload })
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
  const measuredAt = body.measured_at ?? getNutritionDayKey()

  const { data: prevProfile } = await supabase
    .from('user_profiles')
    .select('weight_kg, body_fat_pct')
    .eq('id', userId)
    .single()

  if (
    prevProfile?.weight_kg != null &&
    !weightsMatch(prevProfile.weight_kg, body.weight_kg)
  ) {
    await backfillPreviousWeightIfMissing(
      supabase,
      userId,
      prevProfile.weight_kg,
      measuredAt,
      prevProfile.body_fat_pct
    )
  }

  const profileResult = await saveProfileWeight(supabase, userId, body)
  if (profileResult.error) {
    return { error: profileResult.error, profileSaved: false, logSaved: false }
  }

  const logResult = await saveBodyMeasurementLog(supabase, userId, { ...body, measured_at: measuredAt })
  const historyResult = await appendWeightHistoryToCheckin(supabase, userId, body.weight_kg)
  return {
    error: null,
    profileSaved: true,
    logSaved: !logResult.error || !historyResult.error,
  }
}
