import { getNutritionDayKey } from '@/lib/timezone'
import {
  clearLegacyPendingSyncMarker,
  readOfflineMutationEntries,
} from '@/lib/offline-mutation-queue'

const STORAGE_KEY = 'bb_pending_sync_v1'

interface PendingSyncRecord {
  date: string
  updated_at: string
}

function readStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export function markPendingSync(date = getNutritionDayKey()): void {
  const storage = readStorage()
  if (!storage) return
  try {
    const record: PendingSyncRecord = { date, updated_at: new Date().toISOString() }
    storage.setItem(STORAGE_KEY, JSON.stringify(record))
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('bb-pending-sync'))
  } catch {
    // quota / private mode
  }
}

export function clearPendingSync(): void {
  const storage = readStorage()
  if (!storage) return
  try {
    // Compatibility marker only. Never delete durable, unconfirmed outbox data.
    clearLegacyPendingSyncMarker()
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('bb-pending-sync'))
  } catch {
    // ignore
  }
}

export function hasPendingSync(
  date = getNutritionDayKey(),
  userId?: string
): boolean {
  if (
    readOfflineMutationEntries().some(
      entry =>
        entry.nutritionDate === date &&
        entry.status !== 'confirmed' &&
        (!userId || entry.userId === userId)
    )
  ) {
    return true
  }
  const storage = readStorage()
  if (!storage) return false
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as PendingSyncRecord
    return parsed?.date === date
  } catch {
    return false
  }
}

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}
