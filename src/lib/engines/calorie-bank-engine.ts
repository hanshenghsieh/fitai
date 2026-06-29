/**
 * BetterBit Engine v1 — Calorie Bank + Recovery Window (pure logic)
 * Users control life. BetterBit controls math.
 */

import type { CalorieBankRow, RecoveryWindow } from '@/lib/banks/calorie-bank-types'
import type { DiceAdherenceBias, AdherenceState } from '@/lib/engines/adherence-types'

export const DEFAULT_CALORIE_FLOOR_MALE = 1500
export const DEFAULT_CALORIE_FLOOR_FEMALE = 1200

export function calorieFloorFromGender(gender?: string | null): number {
  return gender === 'female' ? DEFAULT_CALORIE_FLOOR_FEMALE : DEFAULT_CALORIE_FLOOR_MALE
}

/** Recovery window tiers from single-day excess (or total balance when recomputing). */
export function computeRecoveryWindow(excessKcal: number): RecoveryWindow {
  if (excessKcal <= 0) {
    return { spreadDays: 0, dailyAdjustKcal: 0 }
  }
  if (excessKcal <= 500) {
    return { spreadDays: 2, dailyAdjustKcal: -100 }
  }
  if (excessKcal <= 1200) {
    return { spreadDays: 4, dailyAdjustKcal: -120 }
  }
  if (excessKcal <= 2500) {
    return { spreadDays: 6, dailyAdjustKcal: -150 }
  }
  return { spreadDays: 8, dailyAdjustKcal: -180 }
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
  const applied = Math.min(
    previous.recovery_balance_kcal,
    Math.abs(adjust)
  )
  const nextBalance = Math.max(0, previous.recovery_balance_kcal - applied)
  const nextSpread = Math.max(0, previous.spread_days_remaining - 1)
  const internal = Math.max(calorieFloor, normalTargetKcal + adjust)

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

function applyNewExcess(
  row: Pick<
    CalorieBankRow,
    'recovery_balance_kcal' | 'spread_days_remaining' | 'daily_adjust_kcal' | 'daily_target_kcal'
  >,
  addedExcess: number,
  calorieFloor: number
): Pick<CalorieBankRow, 'recovery_balance_kcal' | 'spread_days_remaining' | 'daily_adjust_kcal'> {
  if (addedExcess <= 0) {
    return {
      recovery_balance_kcal: row.recovery_balance_kcal,
      spread_days_remaining: row.spread_days_remaining,
      daily_adjust_kcal: row.daily_adjust_kcal,
    }
  }

  const nextBalance = row.recovery_balance_kcal + addedExcess
  const window = computeRecoveryWindow(nextBalance)
  const adjust = clampDailyAdjust(window.dailyAdjustKcal, row.daily_target_kcal, calorieFloor)

  return {
    recovery_balance_kcal: nextBalance,
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
  previousRow: CalorieBankRow | null
  existingToday: CalorieBankRow | null
}): CalorieBankRow {
  const { userId, date, normalTargetKcal, calorieFloor, actualKcal, previousRow, existingToday } = input

  const tick = existingToday
    ? {
        internal_target_kcal: existingToday.internal_target_kcal,
        recovery_balance_kcal: existingToday.recovery_balance_kcal,
        spread_days_remaining: existingToday.spread_days_remaining,
        daily_adjust_kcal: existingToday.daily_adjust_kcal,
      }
    : tickRecoveryFromPrevious(previousRow, normalTargetKcal, calorieFloor)

  const priorActual = existingToday?.actual_kcal ?? 0
  const priorExcess = Math.max(0, priorActual - normalTargetKcal)
  const newExcess = Math.max(0, actualKcal - normalTargetKcal)
  const addedExcess = Math.max(0, newExcess - priorExcess)

  const recovery = applyNewExcess(
    {
      daily_target_kcal: normalTargetKcal,
      recovery_balance_kcal: tick.recovery_balance_kcal,
      spread_days_remaining: tick.spread_days_remaining,
      daily_adjust_kcal: tick.daily_adjust_kcal,
    },
    addedExcess,
    calorieFloor
  )

  const deltaKcal = actualKcal - normalTargetKcal
  const runningBalance = tick.internal_target_kcal - actualKcal

  return {
    user_id: userId,
    date,
    daily_target_kcal: normalTargetKcal,
    internal_target_kcal: tick.internal_target_kcal,
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
