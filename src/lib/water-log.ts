/** Hydration logging — separate from food_logs / nutrition macros. */

export const DEFAULT_DAILY_WATER_GOAL_ML = 2000
export const LARGE_SINGLE_DOSE_THRESHOLD_ML = 3000
export const WATER_GOAL_MET_RATIO = 0.9

export type WaterMutationResult =
  | { ok: true; value: number }
  | { ok: false; reason: 'negative_delta' | 'negative_total' | 'invalid' }

export function resolveDailyWaterGoalMl(options?: {
  planWaterMl?: number | null
  profileWaterMlTarget?: number | null
}): number {
  const plan = options?.planWaterMl
  if (plan != null && plan > 0) return plan
  const profile = options?.profileWaterMlTarget
  if (profile != null && profile > 0) return profile
  return DEFAULT_DAILY_WATER_GOAL_ML
}

export function addWaterMl(currentMl: number, deltaMl: number): WaterMutationResult {
  if (!Number.isFinite(deltaMl) || deltaMl < 0) return { ok: false, reason: 'negative_delta' }
  return { ok: true, value: Math.round(currentMl + deltaMl) }
}

export function setWaterMl(valueMl: number): WaterMutationResult {
  if (!Number.isFinite(valueMl)) return { ok: false, reason: 'invalid' }
  if (valueMl < 0) return { ok: false, reason: 'negative_total' }
  return { ok: true, value: Math.round(valueMl) }
}

export function resetWaterMl(): number {
  return 0
}

export function singleDoseNeedsConfirm(doseMl: number): boolean {
  return doseMl > LARGE_SINGLE_DOSE_THRESHOLD_ML
}

export function waterProgressPct(loggedMl: number, targetMl: number): number {
  if (targetMl <= 0) return 0
  return Math.min(100, (loggedMl / targetMl) * 100)
}

export function isDailyWaterGoalMet(loggedMl: number, targetMl: number): boolean {
  return loggedMl >= targetMl * WATER_GOAL_MET_RATIO
}

/** Sum of daily_checkins.water_ml for the week, in liters (one decimal). */
export function sumWeekWaterLiters(checkins: { water_ml?: number | null }[]): number {
  const totalMl = checkins.reduce((sum, row) => sum + (row.water_ml ?? 0), 0)
  return Math.round(totalMl / 100) / 10
}

export function weeklyWaterTargetLiters(dailyGoalMl: number): number {
  return Math.round((dailyGoalMl * 7) / 100) / 10
}

export function formatTodayWaterLine(loggedMl: number, targetMl: number): string {
  return `已喝 ${loggedMl} / ${targetMl} ml`
}

export function countWaterMetDays(
  checkins: { water_ml?: number | null }[],
  dailyTargetMl: number
): number {
  const threshold = dailyTargetMl * WATER_GOAL_MET_RATIO
  return checkins.filter(c => (c.water_ml ?? 0) >= threshold).length
}
