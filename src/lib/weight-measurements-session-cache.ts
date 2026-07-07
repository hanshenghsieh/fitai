import type { BodyMeasurement } from '@/types'
import { dedupeSameSaveWeightRows, type WeightMeasurementRow } from '@/lib/weight-history'

const CACHE_KEY = 'bb_weight_measurements_v1'

function readStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function writeStorage(key: string, value: string): void {
  try {
    readStorage()?.setItem(key, value)
  } catch {
    // private mode / quota — ignore
  }
}

function readStorageItem(key: string): string | null {
  try {
    return readStorage()?.getItem(key) ?? null
  } catch {
    return null
  }
}

function removeStorageItem(key: string): void {
  try {
    readStorage()?.removeItem(key)
  } catch {
    // ignore
  }
}

function rowKey(m: BodyMeasurement): string {
  return m.id || `${m.measured_at}|${m.created_at ?? ''}|${m.weight_kg}`
}

export function weightMeasurementsFingerprint(rows: BodyMeasurement[]): string {
  return rows
    .map(rowKey)
    .sort()
    .join('|')
}

export function readWeightMeasurementsSessionCache(): BodyMeasurement[] | null {
  if (!readStorage()) return null
  try {
    const raw = readStorageItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BodyMeasurement[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeWeightMeasurementsSessionCache(rows: BodyMeasurement[]): void {
  if (!readStorage()) return
  const cached = readWeightMeasurementsSessionCache()
  const merged = mergeWeightMeasurementsPreferComplete(rows, cached)
  if (cached?.length && merged.length < cached.length) return
  writeStorage(CACHE_KEY, JSON.stringify(merged))
}

export function appendWeightMeasurementLocal(
  rows: BodyMeasurement[],
  entry: { user_id: string; measured_at: string; weight_kg: number }
): BodyMeasurement[] {
  const createdAt = new Date().toISOString()
  const next: BodyMeasurement = {
    id: `local-${createdAt}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: entry.user_id,
    measured_at: entry.measured_at,
    weight_kg: entry.weight_kg,
    body_fat_pct: null,
    muscle_mass_kg: null,
    waist_cm: null,
    hip_cm: null,
    chest_cm: null,
    created_at: createdAt,
  }
  return sortMeasurements([...rows, next])
}

export function clearWeightMeasurementsSessionCache(): void {
  if (!readStorage()) return
  removeStorageItem(CACHE_KEY)
}

function sortMeasurements(rows: BodyMeasurement[]): BodyMeasurement[] {
  return [...rows].sort((a, b) => {
    const byDay = a.measured_at.localeCompare(b.measured_at)
    if (byDay !== 0) return byDay
    return (a.created_at ?? '').localeCompare(b.created_at ?? '')
  })
}

function toWeightRow(m: BodyMeasurement): WeightMeasurementRow {
  return {
    id: m.id,
    measured_at: m.measured_at,
    weight_kg: m.weight_kg as number,
    created_at: m.created_at,
  }
}

function dedupeBodyMeasurements(rows: BodyMeasurement[]): BodyMeasurement[] {
  const dedupedRows = dedupeSameSaveWeightRows(rows.filter(m => m.weight_kg != null).map(toWeightRow))
  return dedupedRows.map((row, idx) => {
    const existing =
      rows.find(
        m =>
          m.id && row.id && m.id === row.id
      ) ??
      rows.find(
        m =>
          m.measured_at.slice(0, 10) === row.measured_at.slice(0, 10) &&
          m.weight_kg != null &&
          Math.abs(m.weight_kg - row.weight_kg) < 0.05 &&
          (!row.created_at || m.created_at === row.created_at)
      )
    if (existing) return existing
    return {
      id: row.id ?? `deduped-weight-${row.measured_at}-${row.weight_kg}-${idx}`,
      user_id: rows[0]?.user_id ?? 'local',
      measured_at: row.measured_at,
      weight_kg: row.weight_kg,
      body_fat_pct: null,
      muscle_mass_kg: null,
      waist_cm: null,
      hip_cm: null,
      chest_cm: null,
      created_at: row.created_at ?? `${row.measured_at}T12:00:00.000Z`,
    }
  })
}

/** Union every source — never drop a distinct point from client cache or optimistic saves. */
export function mergeWeightMeasurementsPreferComplete(
  ...sources: (BodyMeasurement[] | null | undefined)[]
): BodyMeasurement[] {
  const byKey = new Map<string, BodyMeasurement>()
  for (const source of sources) {
    if (!source?.length) continue
    for (const m of source) {
      const key = rowKey(m)
      if (!byKey.has(key)) byKey.set(key, m)
    }
  }
  return dedupeBodyMeasurements(sortMeasurements([...byKey.values()]))
}

/** Never accept a shorter list when we already have more chart points locally. */
export function mergeWeightMeasurementsMonotonic(
  next: BodyMeasurement[],
  ...floors: (BodyMeasurement[] | null | undefined)[]
): BodyMeasurement[] {
  const merged = mergeWeightMeasurementsPreferComplete(next, ...floors)
  const floorCount = Math.max(0, ...floors.map(f => f?.length ?? 0))
  if (floorCount > 0 && merged.length < floorCount) {
    return mergeWeightMeasurementsPreferComplete(merged, ...floors)
  }
  return merged
}

/** Prefer session cache when it has more points than server (tab switch / reopen race). */
export function resolveWeightMeasurementsFromSession(server: BodyMeasurement[]): BodyMeasurement[] {
  const cached = readWeightMeasurementsSessionCache()
  if (!cached?.length) return server

  const merged = mergeWeightMeasurementsPreferComplete(server, cached)
  if (merged.length === server.length) {
    const serverFp = weightMeasurementsFingerprint(server)
    const mergedFp = weightMeasurementsFingerprint(merged)
    if (mergedFp === serverFp) return server
  }
  return merged.length >= server.length ? merged : server
}
