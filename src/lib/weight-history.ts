import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
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

/**
 * Build 38 BUG 1 — the settings/body 500 has no reproducible cause in the
 * schema, RLS, or merge logic (verified against real production data and a
 * ROLLBACK-wrapped transaction under the actual authenticated-role RLS
 * context — all clean). The remaining plausible explanation is a transient
 * Supabase/Postgres connection hiccup, which the original code had zero
 * resilience against (any Postgrest error, transient or not, failed the
 * whole request immediately). This carries the FULL Postgrest error
 * (code/details/hint) instead of collapsing it to a bare message — losing
 * `hint`/`code` is exactly why the last two builds couldn't diagnose this
 * from logs — and a narrow retry now covers connection-class failures
 * without masking real bugs (constraint/RLS errors are never retried).
 */
export interface SupabaseWriteError {
  message: string
  code?: string
  details?: string
  hint?: string
}

function toWriteError(error: PostgrestError): SupabaseWriteError {
  return { message: error.message, code: error.code, details: error.details, hint: error.hint }
}

const TRANSIENT_ERROR_CODES = new Set([
  '57014', // query_canceled (statement/lock timeout)
  '53300', // too_many_connections
  '08000', // connection_exception
  '08003', // connection_does_not_exist
  '08006', // connection_failure
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '08004', // sqlserver_rejected_establishment_of_sqlconnection
])

export function isTransientSupabaseError(error: SupabaseWriteError): boolean {
  if (error.code && TRANSIENT_ERROR_CODES.has(error.code)) return true
  const text = `${error.message} ${error.details ?? ''}`.toLowerCase()
  return /fetch failed|econnreset|etimedout|network|timeout|socket hang up/.test(text)
}

function sleepMs(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Retries only genuinely transient connection-class failures — constraint/RLS/validation errors fail fast on the first attempt. */
export async function withTransientRetry<T>(
  fn: () => Promise<{ error: SupabaseWriteError | null; data?: T }>,
  attempts = 3
): Promise<{ error: SupabaseWriteError | null; data?: T }> {
  let last: { error: SupabaseWriteError | null; data?: T } = { error: null }
  for (let i = 0; i < attempts; i++) {
    last = await fn()
    if (!last.error || !isTransientSupabaseError(last.error)) return last
    if (i < attempts - 1) await sleepMs(80 * (i + 1))
  }
  return last
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
  return dedupeSameSaveWeightRows(
    merged.sort((a, b) => {
      const at = a.created_at ?? a.measured_at
      const bt = b.created_at ?? b.measured_at
      return at.localeCompare(bt)
    })
  )
}

function rowTimestamp(row: WeightMeasurementRow): number {
  const raw = row.created_at ?? row.measured_at
  const parsed = Date.parse(raw.length <= 10 ? `${raw}T12:00:00.000Z` : raw)
  return Number.isFinite(parsed) ? parsed : 0
}

/** body_measurements + checkin history for one save often differ by seconds — keep one point. */
export function dedupeSameSaveWeightRows(rows: WeightMeasurementRow[]): WeightMeasurementRow[] {
  const out: WeightMeasurementRow[] = []
  for (const row of rows) {
    const duplicateIdx = out.findIndex(
      prev =>
        prev.measured_at.slice(0, 10) === row.measured_at.slice(0, 10) &&
        weightsNear(prev.weight_kg, row.weight_kg) &&
        Math.abs(rowTimestamp(prev) - rowTimestamp(row)) < 120_000
    )
    if (duplicateIdx < 0) {
      out.push(row)
      continue
    }
    const existing = out[duplicateIdx]!
    if ((row.id && !existing.id) || rowTimestamp(row) >= rowTimestamp(existing)) {
      out[duplicateIdx] = row.id ? row : existing
    }
  }
  return out
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
): Promise<{ error: SupabaseWriteError | null }> {
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

    if (readError) {
      const writeError = toWriteError(readError)
      if (isTransientSupabaseError(writeError) && attempt < maxAttempts - 1) {
        await sleep(40 * (attempt + 1))
        continue
      }
      return { error: writeError }
    }

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
    if (filteredEntries.length === 0) return { error: null }

    const nextHistory = mergeWeightHistoryEntries(currentMeta.weight_history, filteredEntries) ?? filteredEntries
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
      if (error) {
        const writeError = toWriteError(error)
        if (isTransientSupabaseError(writeError) && attempt < maxAttempts - 1) {
          await sleep(40 * (attempt + 1))
          continue
        }
        return { error: writeError }
      }
      if ((updated?.length ?? 0) > 0) return { error: null }
      await sleep(40 * (attempt + 1))
      continue
    }

    // Root cause of the production 500 on POST /api/settings/body: a plain
    // .insert() here raced against daily_checkins' UNIQUE(user_id,
    // checkin_date) constraint whenever two weight-saves overlapped (e.g.
    // "目前體重" and "新增" on the same settings screen, or a slow network
    // causing an overlapping retry) — the loser hit a duplicate-key error
    // and, if unlucky, could exhaust all retries and surface as a real 500.
    // .upsert(onConflict) makes this single write atomic instead of relying
    // on check-then-insert. diet_items/workout_items are deliberately left
    // out of the payload so a conflict (another request already created
    // today's row) only ever touches `notes` — it must never clobber real
    // diet/workout data with the insert-time empty-array defaults.
    const { error } = await supabase.from('daily_checkins').upsert(
      {
        user_id: userId,
        checkin_date: today,
        notes: mergedNotes,
      },
      { onConflict: 'user_id,checkin_date' }
    )
    if (!error) return { error: null }
    // Build 38: only genuinely transient (connection-class) errors keep
    // retrying — a real constraint/RLS/permission error now fails fast with
    // its full code/details/hint preserved, instead of silently retrying it
    // 8 times (adding latency) and then discarding the diagnostic detail.
    const writeError = toWriteError(error)
    if (isTransientSupabaseError(writeError) && attempt < maxAttempts - 1) {
      await sleep(40 * (attempt + 1))
      continue
    }
    return { error: writeError }
  }

  return { error: { message: 'Could not append weight history' } }
}

