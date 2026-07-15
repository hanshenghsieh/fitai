export interface StoredWaterIntake {
  userId: string
  nutritionDate: string
  waterMl: number
  updatedAt: string
  pending: boolean
}

export const WATER_FALLBACK_USER_ID = 'local-user'

export function waterIntakeStorageKey(userId: string, nutritionDate: string): string {
  return `betterbit:water:${userId}:${nutritionDate}`
}

function effectiveUserId(userId: string | null | undefined): string {
  return userId || WATER_FALLBACK_USER_ID
}

function persistRecord(record: StoredWaterIntake): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      waterIntakeStorageKey(record.userId, record.nutritionDate),
      JSON.stringify(record)
    )
  } catch {
    // Storage may be unavailable or full. Server persistence remains the fallback.
  }
}

export function readWaterIntake(
  userId: string | null | undefined,
  nutritionDate: string
): StoredWaterIntake | null {
  if (typeof window === 'undefined') return null
  const resolvedUserId = effectiveUserId(userId)
  try {
    const raw = window.localStorage.getItem(waterIntakeStorageKey(resolvedUserId, nutritionDate))
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredWaterIntake
    if (
      parsed.userId !== resolvedUserId ||
      parsed.nutritionDate !== nutritionDate ||
      !Number.isFinite(parsed.waterMl) ||
      parsed.waterMl < 0 ||
      Number.isNaN(Date.parse(parsed.updatedAt))
    ) {
      return null
    }
    return { ...parsed, pending: parsed.pending !== false }
  } catch {
    return null
  }
}

function readAndMigrateWaterIntake(
  userId: string | null | undefined,
  nutritionDate: string
): StoredWaterIntake | null {
  const resolvedUserId = effectiveUserId(userId)
  const direct = readWaterIntake(resolvedUserId, nutritionDate)
  if (resolvedUserId === WATER_FALLBACK_USER_ID) return direct

  const fallback = readWaterIntake(WATER_FALLBACK_USER_ID, nutritionDate)
  if (!fallback) return direct
  const fallbackIsNewer =
    !direct || Date.parse(fallback.updatedAt) > Date.parse(direct.updatedAt)
  if (!fallbackIsNewer) return direct

  const migrated = { ...fallback, userId: resolvedUserId }
  persistRecord(migrated)
  try {
    window.localStorage.removeItem(waterIntakeStorageKey(WATER_FALLBACK_USER_ID, nutritionDate))
  } catch {
    // Ignore cleanup failure; the user-scoped copy is already durable.
  }
  return migrated
}

export function writeWaterIntake(
  userId: string | null | undefined,
  nutritionDate: string,
  waterMl: number
): void {
  if (typeof window === 'undefined' || !Number.isFinite(waterMl) || waterMl < 0) return
  const resolvedUserId = effectiveUserId(userId)
  const record: StoredWaterIntake = {
    userId: resolvedUserId,
    nutritionDate,
    waterMl: Math.round(waterMl),
    updatedAt: new Date().toISOString(),
    pending: true,
  }
  persistRecord(record)
  console.log('[WATER] write value =', record.waterMl)
}

export function confirmWaterIntake(
  userId: string | null | undefined,
  nutritionDate: string,
  waterMl: number
): void {
  const resolvedUserId = effectiveUserId(userId)
  const local = readAndMigrateWaterIntake(resolvedUserId, nutritionDate)
  if (!local || local.waterMl !== Math.round(waterMl)) return
  persistRecord({ ...local, pending: false, updatedAt: new Date().toISOString() })
}

export function resolveWaterIntake(
  serverWaterMl: number,
  serverUpdatedAt: string | null | undefined,
  userId: string | null | undefined,
  nutritionDate: string
): number {
  const resolvedUserId = effectiveUserId(userId)
  const local = readAndMigrateWaterIntake(resolvedUserId, nutritionDate)
  const safeServerWaterMl = Math.max(0, serverWaterMl)
  let merged = safeServerWaterMl

  if (!local) {
    persistRecord({
      userId: resolvedUserId,
      nutritionDate,
      waterMl: safeServerWaterMl,
      updatedAt: serverUpdatedAt || new Date().toISOString(),
      pending: false,
    })
  } else if (local.pending) {
    merged = local.waterMl
    if (local.waterMl === safeServerWaterMl && serverUpdatedAt) {
      persistRecord({
        ...local,
        pending: false,
        updatedAt:
          Date.parse(serverUpdatedAt) > Date.parse(local.updatedAt)
            ? serverUpdatedAt
            : local.updatedAt,
      })
    }
  } else if (local) {
    const serverUpdatedMs = serverUpdatedAt ? Date.parse(serverUpdatedAt) : Number.NaN
    const localUpdatedMs = Date.parse(local.updatedAt)
    if (!Number.isNaN(serverUpdatedMs) && serverUpdatedMs > localUpdatedMs) {
      merged = safeServerWaterMl
      persistRecord({
        userId: resolvedUserId,
        nutritionDate,
        waterMl: merged,
        updatedAt: serverUpdatedAt!,
        pending: false,
      })
    } else {
      merged = local.waterMl
    }
  }

  console.log('[WATER] nutritionDate =', nutritionDate)
  console.log('[WATER] storage key =', waterIntakeStorageKey(resolvedUserId, nutritionDate))
  console.log('[WATER] local value =', local?.waterMl ?? null)
  console.log('[WATER] server value =', safeServerWaterMl)
  console.log('[WATER] merged value =', merged)
  return merged
}
