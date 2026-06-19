/** Phase 5 — 脂肪銀行，減少體重秤焦慮 */

import { addWeeks, format } from 'date-fns'

interface GoalSnap {
  fat_to_lose_kg?: number
  weekly_fat_loss_g?: number
  weeks_remaining?: number
  target_weight?: number | null
}

interface Goal {
  start_weight_kg?: number | null
  target_weight_kg?: number | null
}

export interface FatBank {
  targetFatLossKg: number
  completedKg: number
  remainingKg: number
  weeklySpeedG: number
  estimatedDate: string | null
  progressPct: number
}

export function buildFatBank(
  goalSnapshot: GoalSnap | null | undefined,
  goal: Goal | null,
  latestWeightKg: number | null
): FatBank | null {
  const start = goal?.start_weight_kg
  const target = goal?.target_weight_kg ?? goalSnapshot?.target_weight
  if (!start || !target || !latestWeightKg) return null

  const targetFatLossKg =
    goalSnapshot?.fat_to_lose_kg ??
    Math.max(0, start - target)

  const completedKg = Math.max(0, start - latestWeightKg)
  const remainingKg = Math.max(0, targetFatLossKg - completedKg)
  const weeklySpeedG = goalSnapshot?.weekly_fat_loss_g ?? 400
  const weeksLeft =
    goalSnapshot?.weeks_remaining ??
    (weeklySpeedG > 0 ? Math.ceil((remainingKg * 1000) / weeklySpeedG) : null)

  const estimatedDate =
    weeksLeft != null && weeksLeft > 0
      ? format(addWeeks(new Date(), weeksLeft), 'yyyy/M/d')
      : null

  const progressPct =
    targetFatLossKg > 0 ? Math.min(100, Math.round((completedKg / targetFatLossKg) * 100)) : 0

  return {
    targetFatLossKg,
    completedKg,
    remainingKg,
    weeklySpeedG,
    estimatedDate,
    progressPct,
  }
}
