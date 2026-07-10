import type { CalorieBankRow } from '@/lib/banks/calorie-bank-types'
import { getTodayExcessKcal } from '@/lib/calorie-bank-v2-ui'
import { clampDailyAdjust, isRecoveryActive } from '@/lib/engines/calorie-bank-engine'
import { mergePreferences, type UserSettingsPreferences } from '@/lib/settings/user-settings-types'
import { apiFetch } from '@/lib/api/client'

let cachedUserPrefs: UserSettingsPreferences | null = null

export function invalidateUserPreferencesCache(): void {
  cachedUserPrefs = null
}

export async function loadUserPreferencesClient(): Promise<UserSettingsPreferences> {
  if (cachedUserPrefs) return cachedUserPrefs
  try {
    const res = await apiFetch('/api/settings/preferences')
    if (res.ok) {
      const data = (await res.json()) as { preferences?: UserSettingsPreferences | null }
      cachedUserPrefs = mergePreferences(data.preferences)
      return cachedUserPrefs
    }
  } catch {
    /* fall through */
  }
  cachedUserPrefs = mergePreferences(null)
  return cachedUserPrefs
}

export function isCalorieBankEnabled(prefs?: UserSettingsPreferences | null): boolean {
  return prefs?.calorie_bank_enabled !== false
}

/** When disabled, Today uses base daily target without recovery adjustments. */
export function applyCalorieBankDisabled(bank: CalorieBankRow): CalorieBankRow {
  return {
    ...bank,
    internal_target_kcal: bank.daily_target_kcal,
    daily_adjust_kcal: 0,
    recovery_balance_kcal: 0,
    spread_days_remaining: 0,
  }
}

function intensitySpreadDays(
  baseDays: number,
  intensity: UserSettingsPreferences['calorie_bank_intensity']
): number {
  if (intensity === 'gentle') return Math.min(10, Math.ceil(baseDays * 1.25))
  if (intensity === 'aggressive') return Math.max(3, Math.floor(baseDays * 0.75))
  return baseDays
}

export function applyCalorieBankUserPrefs(
  bank: CalorieBankRow,
  prefs: UserSettingsPreferences | null | undefined,
  calorieFloor: number = 1200
): CalorieBankRow {
  if (!isCalorieBankEnabled(prefs)) return applyCalorieBankDisabled(bank)
  if (!isRecoveryActive(bank)) return bank

  const baseDays = prefs?.calorie_bank_days ?? bank.spread_days_remaining ?? 5
  const spreadDays = intensitySpreadDays(baseDays, prefs?.calorie_bank_intensity ?? 'standard')
  const excess = getTodayExcessKcal(bank)
  const dailyAdjust = clampDailyAdjust(
    bank.daily_adjust_kcal < 0
      ? bank.daily_adjust_kcal
      : -Math.round(excess / Math.max(1, spreadDays)),
    bank.daily_target_kcal,
    calorieFloor
  )

  return {
    ...bank,
    spread_days_remaining: spreadDays,
    daily_adjust_kcal: dailyAdjust,
    internal_target_kcal: Math.max(calorieFloor, bank.daily_target_kcal + dailyAdjust),
  }
}
