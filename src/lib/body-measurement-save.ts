import type { SupabaseClient } from '@supabase/supabase-js'
import { getNutritionDayKey } from '@/lib/timezone'

export interface SaveBodyMeasurementInput {
  weight_kg: number
  body_fat_pct?: number | null
  measured_at?: string
}

export async function saveBodyMeasurementForUser(
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
  } else {
    const { error } = await supabase
      .from('body_measurements')
      .insert({ user_id: userId, measured_at: measuredAt, ...payload })
    if (error) return { error: new Error(error.message) }
  }

  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({
      weight_kg: body.weight_kg,
      body_fat_pct: body.body_fat_pct ?? null,
    })
    .eq('id', userId)

  if (profileError) return { error: new Error(profileError.message) }
  return { error: null }
}
