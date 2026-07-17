/**
 * BetterBit Engine v1 — Calorie Bank + Recovery Window (pure logic)
 * Users control life. BetterBit controls math.
 */

import type { CalorieBankRow, RecoveryWindow } from '@/lib/banks/calorie-bank-types'
import type { DiceAdherenceBias, AdherenceState } from '@/lib/engines/adherence-types'

export const DEFAULT_CALORIE_FLOOR_MALE = 1500
export const DEFAULT_CALORIE_FLOOR_FEMALE = 1200

export interface DailyIntakeSnapshot {
  kcal: number
  protein_g: number
  fat_g: number
  carbs_g: number
}

export interface DailyTargetSnapshot {
  kcal: number
  protein_g: number
  fat_g: number
  carbs_g: number
}

export type DailyExcessDriver = 'kcal' | 'protein' | 'fat' | 'carbs' | null

export function calorieFloorFromGender(gender?: string | null): number {
  return gender === 'female' ? DEFAULT_CALORIE_FLOOR_FEMALE : DEFAULT_CALORIE_FLOOR_MALE
}

/** Recovery window tiers from single-day excess (or total balance when recomputing). */
export function computeRecoveryWindow(excessKcal: number): RecoveryWindow {
  if (excessKcal <= 0) {
    return { spreadDays: 0, dailyAdjustKcal: 0 }
  }
  let spreadDays: number
  let maxDailyAdjust: number
  if (excessKcal <= 500) {
    spreadDays = 2
    maxDailyAdjust = 100
  } else if (excessKcal <= 1200) {
    spreadDays = 4
    maxDailyAdjust = 120
  } else if (excessKcal <= 2500) {
    spreadDays = 6
    maxDailyAdjust = 150
  } else {
    spreadDays = 8
    maxDailyAdjust = 180
  }
  const dailyAdjust = Math.min(maxDailyAdjust, Math.ceil(excessKcal / spreadDays))
  return { spreadDays, dailyAdjustKcal: -dailyAdjust }
}

/** Clamp daily reduction so internal target never drops below calorie floor. */
export function clampDailyAdjust(
  dailyAdjustKcal: number,
  normalTargetKcal: number,
  calorieFloor: number
): number {
  const adjust = Math.min(0, dailyAdjustKcal)
  const maxReduction = Math.max(0, normalTargetKcal - calorieFloor)
  return -Math.min(Math.abs(adjust), maxReduction)
}

export function isRecoveryActive(row: Pick<CalorieBankRow, 'recovery_balance_kcal' | 'spread_days_remaining'>): boolean {
  return row.recovery_balance_kcal > 0 && row.spread_days_remaining > 0
}

/** Effective over-target amount — kcal OR any macro converted to kcal equivalent. */
export function computeEffectiveDailyExcess(
  actual: DailyIntakeSnapshot,
  target: DailyTargetSnapshot
): number {
  const kcalExcess = Math.max(0, actual.kcal - target.kcal)
  const proteinExcessKcal = Math.max(0, actual.protein_g - target.protein_g) * 4
  const fatExcessKcal = Math.max(0, actual.fat_g - target.fat_g) * 9
  const carbsExcessKcal = Math.max(0, actual.carbs_g - target.carbs_g) * 4
  return Math.max(kcalExcess, proteinExcessKcal, fatExcessKcal, carbsExcessKcal)
}

export function resolveDailyExcessDriver(
  actual: DailyIntakeSnapshot,
  target: DailyTargetSnapshot
): DailyExcessDriver {
  const excess = computeEffectiveDailyExcess(actual, target)
  if (excess <= 0) return null

  const kcalExcess = Math.max(0, actual.kcal - target.kcal)
  const proteinExcessKcal = Math.max(0, actual.protein_g - target.protein_g) * 4
  const fatExcessKcal = Math.max(0, actual.fat_g - target.fat_g) * 9
  const carbsExcessKcal = Math.max(0, actual.carbs_g - target.carbs_g) * 4

  if (fatExcessKcal >= excess && fatExcessKcal > 0) return 'fat'
  if (proteinExcessKcal >= excess && proteinExcessKcal > 0) return 'protein'
  if (carbsExcessKcal >= excess && carbsExcessKcal > 0) return 'carbs'
  if (kcalExcess > 0) return 'kcal'
  return 'kcal'
}

/** Carry recovery from previous nutrition day into today (morning tick). */
export function tickRecoveryFromPrevious(
  previous: CalorieBankRow | null,
  normalTargetKcal: number,
  calorieFloor: number
): Pick<
  CalorieBankRow,
  'internal_target_kcal' | 'recovery_balance_kcal' | 'spread_days_remaining' | 'daily_adjust_kcal'
> {
  if (!previous || !isRecoveryActive(previous)) {
    return {
      internal_target_kcal: normalTargetKcal,
      recovery_balance_kcal: 0,
      spread_days_remaining: 0,
      daily_adjust_kcal: 0,
    }
  }

  const adjust = clampDailyAdjust(previous.daily_adjust_kcal, normalTargetKcal, calorieFloor)
  const applied = Math.min(previous.recovery_balance_kcal, Math.abs(adjust))
  const nextBalance = Math.max(0, previous.recovery_balance_kcal - applied)
  const nextSpread = Math.max(0, previous.spread_days_remaining - 1)
  const internal = Math.max(calorieFloor, normalTargetKcal - applied)

  if (nextBalance <= 0) {
    return {
      internal_target_kcal: internal,
      recovery_balance_kcal: 0,
      spread_days_remaining: 0,
      daily_adjust_kcal: 0,
    }
  }

  if (nextSpread <= 0) {
    const window = computeRecoveryWindow(nextBalance)
    const rolledAdjust = clampDailyAdjust(window.dailyAdjustKcal, normalTargetKcal, calorieFloor)
    return {
      internal_target_kcal: internal,
      recovery_balance_kcal: nextBalance,
      spread_days_remaining: window.spreadDays,
      daily_adjust_kcal: rolledAdjust,
    }
  }

  return {
    internal_target_kcal: internal,
    recovery_balance_kcal: nextBalance,
    spread_days_remaining: nextSpread,
    daily_adjust_kcal: adjust,
  }
}

function applyTodayExcessToRecovery(
  morningTick: Pick<
    CalorieBankRow,
    'internal_target_kcal' | 'recovery_balance_kcal' | 'spread_days_remaining' | 'daily_adjust_kcal'
  >,
  todayExcessKcal: number,
  normalTargetKcal: number,
  calorieFloor: number
): Pick<
  CalorieBankRow,
  'internal_target_kcal' | 'recovery_balance_kcal' | 'spread_days_remaining' | 'daily_adjust_kcal'
> {
  if (todayExcessKcal <= 0) {
    return morningTick
  }

  const totalBalance = morningTick.recovery_balance_kcal + todayExcessKcal
  const window = computeRecoveryWindow(totalBalance)
  const adjust = clampDailyAdjust(window.dailyAdjustKcal, normalTargetKcal, calorieFloor)

  return {
    internal_target_kcal: Math.max(calorieFloor, normalTargetKcal + adjust),
    recovery_balance_kcal: totalBalance,
    spread_days_remaining: window.spreadDays,
    daily_adjust_kcal: adjust,
  }
}

/** Build or update today's bank row from intake + optional yesterday carry. */
export function syncCalorieBankRow(input: {
  userId: string
  date: string
  normalTargetKcal: number
  calorieFloor: number
  actualKcal: number
  actualProteinG?: number
  actualFatG?: number
  actualCarbsG?: number
  targetProteinG?: number
  targetFatG?: number
  targetCarbsG?: number
  previousRow: CalorieBankRow | null
  existingToday: CalorieBankRow | null
}): CalorieBankRow {
  const {
    userId,
    date,
    normalTargetKcal,
    calorieFloor,
    actualKcal,
    actualProteinG = 0,
    actualFatG = 0,
    actualCarbsG = 0,
    targetProteinG = 0,
    targetFatG = 0,
    targetCarbsG = 0,
    previousRow,
    existingToday,
  } = input

  const morningTick = tickRecoveryFromPrevious(previousRow, normalTargetKcal, calorieFloor)
  const todayExcess = computeEffectiveDailyExcess(
    { kcal: actualKcal, protein_g: actualProteinG, fat_g: actualFatG, carbs_g: actualCarbsG },
    {
      kcal: normalTargetKcal,
      protein_g: targetProteinG,
      fat_g: targetFatG,
      carbs_g: targetCarbsG,
    }
  )

  const recovery = applyTodayExcessToRecovery(morningTick, todayExcess, normalTargetKcal, calorieFloor)

  const deltaKcal = actualKcal - normalTargetKcal
  const runningBalance = recovery.internal_target_kcal - actualKcal

  return {
    user_id: userId,
    date,
    daily_target_kcal: normalTargetKcal,
    internal_target_kcal: recovery.internal_target_kcal,
    actual_kcal: actualKcal,
    delta_kcal: deltaKcal,
    running_balance_kcal: runningBalance,
    recovery_balance_kcal: recovery.recovery_balance_kcal,
    spread_days_remaining: recovery.spread_days_remaining,
    daily_adjust_kcal: recovery.daily_adjust_kcal,
    id: existingToday?.id,
    created_at: existingToday?.created_at,
  }
}

/** Weekly / multi-day gentle targets during active recovery. */
export function recoveryTargetsForDayOffsets(
  normalTargetKcal: number,
  spreadDaysRemaining: number,
  dailyAdjustKcal: number,
  calorieFloor: number,
  dayCount: number
): number[] {
  const adjust = Math.abs(dailyAdjustKcal)
  const spread = Math.max(0, spreadDaysRemaining)
  const targets: number[] = []

  for (let i = 0; i < dayCount; i++) {
    if (spread <= 0 || i >= spread) {
      targets.push(normalTargetKcal)
      continue
    }
    const reduction = recoveryReductionForDay(i, spread, adjust)
    targets.push(Math.max(calorieFloor, normalTargetKcal - reduction))
  }

  return targets
}

/** Split a finite recovery balance without creating extra calorie debt. */
export function distributeRecoveryBalance(
  recoveryBalanceKcal: number,
  spreadDays: number,
  maxDailyReduction: number
): number[] {
  const total = Math.max(0, Math.round(recoveryBalanceKcal))
  const days = Math.max(0, Math.floor(spreadDays))
  const dailyCap = Math.max(0, Math.floor(maxDailyReduction))
  if (total === 0 || days === 0 || dailyCap === 0) {
    return Array.from({ length: days }, () => 0)
  }

  const recoverable = Math.min(total, days * dailyCap)
  const base = Math.floor(recoverable / days)
  const remainder = recoverable % days
  return Array.from({ length: days }, (_, index) => base + (index < remainder ? 1 : 0))
}

function recoveryReductionForDay(dayIndex: number, spreadDays: number, dailyAdjust: number): number {
  if (dayIndex >= spreadDays) return 0
  const plateauDays = Math.max(1, Math.ceil(spreadDays / 2))
  if (dayIndex < plateauDays) return dailyAdjust
  const fadeDays = spreadDays - plateauDays
  if (fadeDays <= 0) return 0
  const fadeStep = (dayIndex - plateauDays + 1) / fadeDays
  return Math.round(dailyAdjust * (1 - fadeStep))
}

/** Dice / meal suggest bias — no guilt, slightly lighter + higher protein. */
export function bankToDiceBias(
  bank: Pick<CalorieBankRow, 'recovery_balance_kcal' | 'spread_days_remaining'> | null | undefined
): DiceAdherenceBias | null {
  if (!bank || !isRecoveryActive(bank)) return null
  return {
    preferEnjoyable: true,
    avoidExtremeLight: false,
    calTargetScale: 0.96,
    proteinBoost: 1.1,
  }
}

/** Score adjustment for recovery-mode food picks (internal only). */
export function recoveryFoodScoreAdjust(itemName: string, recoveryActive: boolean): number {
  if (!recoveryActive) return 0
  if (/炸|咔啦|雞排|薯條|珍珠|可樂|含糖|蛋糕|甜甜圈|披薩|比薩|鍋/.test(itemName)) return 14
  if (/沙拉|雞胸|清炒|燙|水煮|無糖|豆漿|優格|蛋白/.test(itemName)) return -10
  return 0
}

export function effectiveDailyTargetFromBank(
  planTargetKcal: number,
  bank: CalorieBankRow | null | undefined
): number {
  if (!bank) return planTargetKcal
  return bank.internal_target_kcal || planTargetKcal
}

/** Merge persistent bank into session adherence (bank wins for spread + dice). */
export function mergeBankIntoAdherence(
  adherence: AdherenceState,
  bank: CalorieBankRow | null | undefined
): AdherenceState {
  const bankBias = bankToDiceBias(bank)
  if (!bank || !bankBias) return adherence

  return {
    ...adherence,
    spread: {
      excessKcal: bank.recovery_balance_kcal,
      spreadDays: bank.spread_days_remaining,
      dailyAdjustKcal: bank.daily_adjust_kcal,
    },
    dice: {
      preferEnjoyable: bankBias.preferEnjoyable || adherence.dice.preferEnjoyable,
      avoidExtremeLight: bankBias.avoidExtremeLight,
      calTargetScale: Math.min(adherence.dice.calTargetScale, bankBias.calTargetScale),
      proteinBoost: Math.max(adherence.dice.proteinBoost, bankBias.proteinBoost),
    },
  }
}
