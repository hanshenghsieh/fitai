/**
 * P0 — 被動健康資料（Apple Health / Health Connect / Garmin）
 * Web 端先以 opt-in + localStorage 排隊；原生連線就緒後替換 fetchPassiveHealth。
 */

export interface PassiveHealthSnapshot {
  stepsToday?: number
  sleepHoursLastNight?: number
  activeEnergyKcal?: number
  source?: 'apple_health' | 'health_connect' | 'garmin' | 'manual'
  syncedAt?: string
}

const PREF_KEY = 'betterbit_health_sync'

export function healthSyncAvailable(): boolean {
  if (typeof window === 'undefined') return false
  return typeof (window as Window & { HealthKit?: unknown }).HealthKit !== 'undefined'
    || typeof (window as Window & { health?: unknown }).health !== 'undefined'
}

export function getHealthSyncPreference(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(PREF_KEY) === '1'
}

export function setHealthSyncPreference(on: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PREF_KEY, on ? '1' : '0')
}

export async function fetchPassiveHealth(): Promise<PassiveHealthSnapshot | null> {
  if (!getHealthSyncPreference()) return null

  if (healthSyncAvailable()) {
    // Native bridge placeholder — replace when Capacitor / HealthKit wired
    return null
  }

  return null
}

/** 睡眠資料可強化 sleep_debt 偵測（未啟用時回傳 null） */
export function sleepDebtFromHealth(snapshot: PassiveHealthSnapshot | null): boolean | null {
  if (!snapshot?.sleepHoursLastNight) return null
  return snapshot.sleepHoursLastNight < 6
}
