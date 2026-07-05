import type { SupabaseClient } from '@supabase/supabase-js'
import { getNutritionDayKey } from '@/lib/timezone'
import { parseCheckinMeta, type CheckinMeta } from '@/lib/checkin-utils'

export type WeightMeasurementRow = {
  measured_at: string
  weight_kg: number
  created_at?: string
}

export function extractWeightHistoryFromCheckins(
  checkins: { checkin_date: string; notes?: string | null }[]
): WeightMeasurementRow[] {
  const rows: WeightMeasurementRow[] = []
  for (const checkin of checkins) {
    const meta = parseCheckinMeta(checkin as { notes: string | null })
    for (const entry of meta.weight_history ?? []) {
      if (!Number.isFinite(entry.weight_kg)) continue
      rows.push({
        measured_at: entry.logged_at.slice(0, 10),
        weight_kg: entry.weight_kg,
        created_at: entry.logged_at,
      })
    }
  }
  return rows.sort((a, b) => {
    const at = a.created_at ?? a.measured_at
    const bt = b.created_at ?? b.measured_at
    return at.localeCompare(bt)
  })
}

export function mergeWeightMeasurementSources(
  dbRows: WeightMeasurementRow[],
  checkinRows: WeightMeasurementRow[]
): WeightMeasurementRow[] {
  if (dbRows.length === 0) return checkinRows
  const seen = new Set(dbRows.map(r => `${r.measured_at}|${r.weight_kg}|${r.created_at ?? ''}`))
  const merged = [...dbRows]
  for (const row of checkinRows) {
    const key = `${row.measured_at}|${row.weight_kg}|${row.created_at ?? ''}`
    if (!seen.has(key)) merged.push(row)
  }
  return merged.sort((a, b) => {
    const at = a.created_at ?? a.measured_at
    const bt = b.created_at ?? b.measured_at
    return at.localeCompare(bt)
  })
}

/** Persist weight readings in today's checkin meta when body_measurements table is unavailable. */
export async function appendWeightHistoryToCheckin(
  supabase: SupabaseClient,
  userId: string,
  weightKg: number
): Promise<{ error: Error | null }> {
  const today = getNutritionDayKey()
  const loggedAt = new Date().toISOString()

  const { data: existing, error: readError } = await supabase
    .from('daily_checkins')
    .select('id, notes, diet_items, workout_items')
    .eq('user_id', userId)
    .eq('checkin_date', today)
    .maybeSingle()

  if (readError) return { error: new Error(readError.message) }

  const meta: CheckinMeta = existing?.notes ? parseCheckinMeta({ notes: existing.notes } as never) : {}
  const history = [...(meta.weight_history ?? [])]
  const last = history.at(-1)
  if (last && last.weight_kg === weightKg && last.logged_at.slice(0, 10) === today) {
    return { error: null }
  }
  history.push({ logged_at: loggedAt, weight_kg: weightKg })
  const nextMeta: CheckinMeta = { ...meta, weight_history: history }

  const payload = {
    user_id: userId,
    checkin_date: today,
    notes: JSON.stringify(nextMeta),
    diet_items: existing?.diet_items ?? [],
    workout_items: existing?.workout_items ?? [],
  }

  if (existing?.id) {
    const { error } = await supabase.from('daily_checkins').update(payload).eq('id', existing.id)
    if (error) return { error: new Error(error.message) }
    return { error: null }
  }

  const { error } = await supabase.from('daily_checkins').insert(payload)
  if (error) return { error: new Error(error.message) }
  return { error: null }
}
