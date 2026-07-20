import { registerPlugin } from '@capacitor/core'

export const LEGACY_HEALTH_STORAGE_KEYS = [
  'betterbit_health_sync',
  'betterbit_health_cache',
  'betterbit_health_snapshot',
] as const

export interface HealthKitAvailability {
  available: boolean
  reason?: string
}

export type HealthAuthorizationRequestStatus =
  | 'should_request'
  | 'unnecessary'
  | 'unknown'
  | 'unavailable'

export interface HealthAuthorizationSummary {
  available: boolean
  requestStatus: HealthAuthorizationRequestStatus
  /**
   * HealthKit deliberately does not disclose read-denial status. An empty
   * query can mean either no samples or that the user declined that type.
   */
  readAuthorizationIsPrivate: true
}

export interface HealthAuthorizationRequestResult {
  requestCompleted: boolean
  readAuthorizationIsPrivate: true
}

export interface HealthQuantitySample {
  value: number
  date: string
  uuid: string
  source?: string
  sourceBundleIdentifier?: string
}

export interface HealthBodyMetrics {
  hasData: boolean
  weightKg?: HealthQuantitySample
  bodyFatPercent?: HealthQuantitySample
  heightCm?: HealthQuantitySample
}

export interface HealthDailyActivityDay {
  date: string
  steps: number
  activeEnergyKcal: number
}

export interface HealthDailyActivity {
  timezone: string
  days: HealthDailyActivityDay[]
}

export interface HealthWorkout {
  uuid: string
  activityType: number
  startDate: string
  endDate: string
  durationSeconds: number
  activeEnergyKcal?: number
  source?: string
  sourceBundleIdentifier?: string
}

export interface HealthWorkoutsResult {
  timezone: string
  workouts: HealthWorkout[]
}

export interface HealthDateRange {
  startDate: string
  endDate: string
  timeZone: string
}

export interface HealthKitPlugin {
  isAvailable(): Promise<HealthKitAvailability>
  requestAuthorization(): Promise<HealthAuthorizationRequestResult>
  getAuthorizationSummary(): Promise<HealthAuthorizationSummary>
  getLatestBodyMetrics(): Promise<HealthBodyMetrics>
  getDailyActivity(options: HealthDateRange): Promise<HealthDailyActivity>
  getWorkouts(options: HealthDateRange): Promise<HealthWorkoutsResult>
}

export const HealthKit = registerPlugin<HealthKitPlugin>('HealthKit')

export type HealthKitErrorKind =
  | 'denied'
  | 'unavailable'
  | 'invalidDateRange'
  | 'nativeFailure'
  | 'unknown'

const ERROR_MESSAGES: Record<HealthKitErrorKind, string> = {
  denied: 'Apple Health 沒有授權讀取這些資料。你可以到「設定 > 健康 > 資料存取權限與裝置」調整權限。',
  unavailable: '此裝置無法使用 Apple Health。請在 iPhone App 中開啟此頁面。',
  invalidDateRange: '健康資料的日期範圍無效，請稍後再試。',
  nativeFailure: 'Apple Health 暫時無法讀取資料，請稍後再試。',
  unknown: '讀取健康資料時發生問題，請稍後再試。',
}

export function healthKitErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null) return ''
  const candidate = error as { code?: unknown; errorCode?: unknown }
  const code = candidate.code ?? candidate.errorCode
  return typeof code === 'string' ? code.toUpperCase() : ''
}

export function classifyHealthKitError(error: unknown): HealthKitErrorKind {
  const code = healthKitErrorCode(error)
  if (
    [
      'AUTHORIZATION_DENIED',
      'HEALTHKIT_AUTHORIZATION_DENIED',
      'HEALTHKIT_AUTHORIZATION_FAILED',
      'PERMISSION_DENIED',
    ].includes(code)
  ) {
    return 'denied'
  }
  if (
    ['HEALTHKIT_UNAVAILABLE', 'HEALTHKIT_TYPE_UNAVAILABLE', 'UNAVAILABLE', 'UNIMPLEMENTED'].includes(code)
  ) {
    return 'unavailable'
  }
  if (
    [
      'HEALTHKIT_INVALID_DATE',
      'HEALTHKIT_INVALID_START_DATE',
      'HEALTHKIT_INVALID_END_DATE',
      'HEALTHKIT_START_AFTER_END',
      'HEALTHKIT_RANGE_TOO_LARGE',
      'INVALID_DATE_RANGE',
      'INVALID_ARGUMENT',
    ].includes(code)
  ) {
    return 'invalidDateRange'
  }
  if (['QUERY_FAILED', 'HEALTHKIT_QUERY_FAILED', 'NATIVE_FAILURE'].includes(code)) return 'nativeFailure'
  return 'unknown'
}

export function healthKitErrorMessage(error: unknown): string {
  return ERROR_MESSAGES[classifyHealthKitError(error)]
}

export function canQueryHealthData(summary: HealthAuthorizationSummary | null): boolean {
  return summary?.available === true && summary.requestStatus === 'unnecessary'
}

export type HealthKitQueryType = 'bodyMeasurements' | 'todayActivity' | 'workouts'

function validTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
    return true
  } catch {
    return false
  }
}

export function resolveHealthTimeZone(requested?: string | null): string {
  const candidate =
    requested?.trim() ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    'Asia/Taipei'
  return validTimeZone(candidate) ? candidate : 'Asia/Taipei'
}

function dateTimeParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find(part => part.type === type)?.value)
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  }
}

function offsetAt(date: Date, timeZone: string): number {
  const parts = dateTimeParts(date, timeZone)
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  )
  return representedAsUtc - Math.floor(date.getTime() / 1000) * 1000
}

export function startOfDayInTimeZone(now: Date, requestedTimeZone?: string | null): Date {
  const timeZone = resolveHealthTimeZone(requestedTimeZone)
  const { year, month, day } = dateTimeParts(now, timeZone)
  const localMidnightAsUtc = Date.UTC(year, month - 1, day)
  let start = new Date(localMidnightAsUtc - offsetAt(new Date(localMidnightAsUtc), timeZone))
  start = new Date(localMidnightAsUtc - offsetAt(start, timeZone))
  return start
}

export function localDayRange(
  now = new Date(),
  requestedTimeZone?: string | null
): HealthDateRange {
  const timeZone = resolveHealthTimeZone(requestedTimeZone)
  const start = startOfDayInTimeZone(now, timeZone)
  const end = now.getTime() <= start.getTime()
    ? new Date(start.getTime() + 1)
    : new Date(now)
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    timeZone,
  }
}

export function recentWorkoutRange(
  now = new Date(),
  days = 14,
  requestedTimeZone?: string | null
): HealthDateRange {
  const timeZone = resolveHealthTimeZone(requestedTimeZone)
  const end = new Date(now)
  const start = new Date(now)
  start.setDate(start.getDate() - days)
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    timeZone,
  }
}

export function logHealthKitQueryRange(
  queryType: HealthKitQueryType,
  range?: HealthDateRange
): void {
  const startEpoch = range ? Date.parse(range.startDate) : Number.NaN
  const endEpoch = range ? Date.parse(range.endDate) : Number.NaN
  const validEpochs = Number.isFinite(startEpoch) && Number.isFinite(endEpoch)
  console.info('[HEALTHKIT_QUERY_RANGE]', {
    queryType,
    timeZone: range?.timeZone ?? resolveHealthTimeZone(),
    startDatePresent: Boolean(range?.startDate),
    endDatePresent: Boolean(range?.endDate),
    startEpoch: validEpochs ? startEpoch : null,
    endEpoch: validEpochs ? endEpoch : null,
    startBeforeEnd: validEpochs ? startEpoch <= endEpoch : false,
    rangeHours: validEpochs ? (endEpoch - startEpoch) / 3_600_000 : null,
  })
}

export function logHealthKitRangeRejection(
  queryType: HealthKitQueryType,
  error: unknown
): void {
  console.warn('[HEALTHKIT_QUERY_RANGE_REJECTED]', {
    queryType,
    reason: healthKitErrorCode(error) || 'HEALTHKIT_QUERY_FAILED',
  })
}

export function clearLegacyHealthStorage(storage?: Pick<Storage, 'removeItem'>): void {
  const target = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined)
  if (!target) return
  for (const key of LEGACY_HEALTH_STORAGE_KEYS) target.removeItem(key)
}
