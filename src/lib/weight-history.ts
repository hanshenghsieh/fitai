import type { SupabaseClient } from '@supabase/supabase-js'
import { getNutritionDayKey } from '@/lib/timezone'
import {
  mergePersistedCheckinNotes,
  parseCheckinMeta,
  mergeWeightHistoryEntries,
  type CheckinMeta,
} from '@/lib/checkin-utils'

export type WeightMeasurementRow = {
  id?: string
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
  if (checkinRows.length === 0) return dbRows

  const keyOf = (r: WeightMeasurementRow) =>
    `${r.measured_at}|${r.weight_kg}|${r.created_at ?? ''}`

  const primary = checkinRows.length >= dbRows.length ? checkinRows : dbRows
  const secondary = primary === checkinRows ? dbRows : checkinRows

  const seen = new Set(primary.map(keyOf))
  const merged = [...primary]
  for (const row of secondary) {
    const key = keyOf(row)
    if (!seen.has(key)) merged.push(row)
  }
  return merged.sort((a, b) => {
    const at = a.created_at ?? a.measured_at
    const bt = b.created_at ?? b.measured_at
    return at.localeCompare(bt)
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function weightsNear(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.05
}

/** Persist weight readings in today's checkin meta — append-only with optimistic retry. */
export async function appendWeightHistoryToCheckin(
  supabase: SupabaseClient,
  userId: string,
  weightKg: number,
  options?: { priorWeightKg?: number | null },
  maxAttempts = 8
): Promise<{ error: Error | null }> {
  const today = getNutritionDayKey()
  const loggedAt = new Date().toISOString()
  const newEntries: { logged_at: string; weight_kg: number }[] = []
  const priorKg = options?.priorWeightKg
  if (priorKg != null && Number.isFinite(priorKg) && !weightsNear(priorKg, weightKg)) {
    newEntries.push({
      logged_at: new Date(new Date(loggedAt).getTime() - 60_000).toISOString(),
      weight_kg: priorKg,
    })
  }
  newEntries.push({ logged_at: loggedAt, weight_kg: weightKg })

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: existing, error: readError } = await supabase
      .from('daily_checkins')
      .select('id, notes')
      .eq('user_id', userId)
      .eq('checkin_date', today)
      .maybeSingle()

    if (readError) return { error: new Error(readError.message) }

    const existingNotes = existing?.notes ?? null
    const currentMeta: CheckinMeta = existingNotes
      ? parseCheckinMeta({ notes: existingNotes } as never)
      : {}
    const filteredEntries = newEntries.filter(entry => {
      if (!Number.isFinite(entry.weight_kg)) return false
      return !currentMeta.weight_history?.some(
        existing =>
          weightsNear(existing.weight_kg, entry.weight_kg) &&
          existing.logged_at.slice(0, 10) === entry.logged_at.slice(0, 10)
      )
    })
    const toAppend = filteredEntries.length ? filteredEntries : [newEntries[newEntries.length - 1]!]
    const nextHistory = mergeWeightHistoryEntries(currentMeta.weight_history, toAppend) ?? toAppend
    const incomingNotes = JSON.stringify({ ...currentMeta, weight_history: nextHistory })
    const mergedNotes = mergePersistedCheckinNotes(
      incomingNotes,
      existing ? { notes: existingNotes } : null
    )

    if (existing?.id) {
      let updateQuery = supabase
        .from('daily_checkins')
        .update({ notes: mergedNotes })
        .eq('id', existing.id)
      if (existing.notes == null) {
        updateQuery = updateQuery.is('notes', null)
      } else {
        updateQuery = updateQuery.eq('notes', existing.notes)
      }
      const { data: updated, error } = await updateQuery.select('id')
      if (error) return { error: new Error(error.message) }
      if ((updated?.length ?? 0) > 0) return { error: null }
      await sleep(40 * (attempt + 1))
      continue
    }

    const { error } = await supabase.from('daily_checkins').insert({
      user_id: userId,
      checkin_date: today,
      notes: mergedNotes,
      diet_items: [],
      workout_items: [],
    })
    if (!error) return { error: null }
    if (attempt < maxAttempts - 1) {
      await sleep(40 * (attempt + 1))
      continue
    }
    return { error: new Error(error.message) }
  }

  return { error: new Error('Could not append weight history') }
}

