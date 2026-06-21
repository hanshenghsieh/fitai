/**
 * BetterBit Next Meal Engine v2 — continuous today system.
 * Users control life. BetterBit controls math.
 */

import type { CalorieBankRow } from '@/lib/banks/calorie-bank-types'
import type { FoodLogEntry } from '@/lib/banks/types'
import { isRecoveryActive } from '@/lib/engines/calorie-bank-engine'
import type { MealType } from '@/lib/checkin-utils'
import { MEAL_RATIOS } from '@/lib/meal-engine-types'

export interface NextMealEngineInput {
  todayFoodLogs: FoodLogEntry[]
  normalTargetKcal: number
  internalTargetKcal?: number
  proteinTargetG: number
  calorieBank?: CalorieBankRow | null
  mealSlot?: MealType
  hourOfDay?: number
  /** 7-day rolling avg kcal (optional) */
  avg7DayKcal?: number
  /** 14-day rolling avg kcal (optional) */
  avg14DayKcal?: number
  maintenanceKcal?: number
  weightPlateauDays?: number
  adherencePct?: number
  sleepDebt?: boolean
  calorieFloor?: number
}

export interface TodayMealState {
  alreadyCalories: number
  alreadyProtein: number
  todayTarget: number
  remainingCalories: number
  proteinGap: number
  recoveryActive: boolean
  overTargetProtection: boolean
  skipMealRecommendation: boolean
  allowDiceAndSuggest: boolean
  highProteinPriority: boolean
  weeklyProtectionActive: boolean
  adaptiveMetabolismActive: boolean
  sleepProtectionActive: boolean
  effectiveMealCalTarget: number
  effectiveMealProteinTarget: number
}

export const OVER_TARGET_COPY = {
  lines: [
    '今天已經很足夠了。',
    '不用急著補救。',
    '喝點水，好好休息。',
    '接下來幾天交給我。',
    '今天不需要再做什麼。',
  ],
}

export function sumLoggedCalories(logs: FoodLogEntry[]): number {
  return logs.reduce((s, l) => s + (l.calories ?? 0), 0)
}

export function sumLoggedProtein(logs: FoodLogEntry[]): number {
  return logs.reduce((s, l) => s + (l.protein_g ?? 0), 0)
}

export function computeTodayMealState(input: NextMealEngineInput): TodayMealState {
  const alreadyCalories = sumLoggedCalories(input.todayFoodLogs)
  const alreadyProtein = sumLoggedProtein(input.todayFoodLogs)
  const internal =
    input.internalTargetKcal ??
    input.calorieBank?.internal_target_kcal ??
    input.normalTargetKcal
  const recoveryActive =
    isRecoveryActive(input.calorieBank ?? { recovery_balance_kcal: 0, spread_days_remaining: 0 }) ||
    (internal < input.normalTargetKcal && (input.calorieBank?.recovery_balance_kcal ?? 0) > 0)

  const todayTarget = recoveryActive ? internal : input.normalTargetKcal
  const remainingCalories = todayTarget - alreadyCalories
  const proteinGap = Math.max(0, input.proteinTargetG - alreadyProtein)

  const overTargetProtection = alreadyCalories >= todayTarget
  const skipMealRecommendation = remainingCalories < 200 || overTargetProtection

  const weeklyProtectionActive = isWeeklyGoalProtectionActive(input)
  const adaptiveMetabolismActive = isAdaptiveMetabolismActive(input)
  const sleepProtectionActive = Boolean(input.sleepDebt)
  const highProteinPriority = proteinGap > 40 || weeklyProtectionActive

  const slot = input.mealSlot ?? 'lunch'
  const slotRatio = MEAL_RATIOS[slot]
  const slotCalTarget = Math.round(todayTarget * slotRatio)
  const slotProteinTarget = Math.round(input.proteinTargetG * slotRatio)

  let effectiveMealCalTarget = Math.min(Math.max(remainingCalories, 0), slotCalTarget)
  if (remainingCalories > 0 && effectiveMealCalTarget < 150 && !overTargetProtection) {
    effectiveMealCalTarget = Math.min(remainingCalories, 400)
  }

  const proteinBoost = highProteinPriority ? 1.15 : 1
  const effectiveMealProteinTarget = Math.round(slotProteinTarget * proteinBoost)

  return {
    alreadyCalories,
    alreadyProtein,
    todayTarget,
    remainingCalories,
    proteinGap,
    recoveryActive,
    overTargetProtection,
    skipMealRecommendation,
    allowDiceAndSuggest: !overTargetProtection,
    highProteinPriority,
    weeklyProtectionActive,
    adaptiveMetabolismActive,
    sleepProtectionActive,
    effectiveMealCalTarget,
    effectiveMealProteinTarget,
  }
}

export function isWeeklyGoalProtectionActive(input: NextMealEngineInput): boolean {
  const maintenance = input.maintenanceKcal
  if (!maintenance || maintenance <= 0) return false
  const avg7 = input.avg7DayKcal
  if (avg7 != null && avg7 >= maintenance) return true
  const avg14 = input.avg14DayKcal
  if (avg14 != null && avg14 >= maintenance) return true
  return false
}

export function isAdaptiveMetabolismActive(input: NextMealEngineInput): boolean {
  const plateauDays = input.weightPlateauDays ?? 0
  const adherence = input.adherencePct ?? 0
  return plateauDays > 14 && adherence > 80
}

const HIGH_PROTEIN_NAMES = /雞胸|鮭魚|豆漿|優格|茶葉蛋|蛋白|鮭|豆腐|無糖豆|希臘/
const FRIED_NAMES = /炸|咔啦|雞排|薯條|披薩|比薩|鍋物炸/
const SUGAR_NAMES = /珍珠|可樂|含糖|蛋糕|甜甜圈|奶昔|冰淇淋|巧克力|含糖飲/
const VEG_NAMES = /沙拉|青菜|蔬菜|燙|清炒|水煮|小黃瓜|花椰/

export interface CandidateScoreInput {
  itemNames: string[]
  calories: number
  proteinG: number
  state: TodayMealState
  historyBoost?: number
  userPrefBoost?: number
  recoveryActive?: boolean
}

/** Lower score = better candidate (matches meal-suggest convention). */
export function scoreMealCandidate(input: CandidateScoreInput): number {
  const { itemNames, calories, proteinG, state } = input
  const names = itemNames.join(' ')

  const remaining = Math.max(0, state.remainingCalories)
  const calTarget = Math.max(150, state.effectiveMealCalTarget)
  const proteinTarget = Math.max(10, state.effectiveMealProteinTarget)

  const calDelta = Math.abs(calories - calTarget)
  const remainingFit = remaining <= 0 ? calories * 3 : Math.abs(calories - Math.min(calories, remaining)) * 2
  const overRemaining = calories > remaining && remaining > 0 ? (calories - remaining) * 8 : 0

  const proteinDensity = proteinG / Math.max(1, calories)
  const proteinDensityWeight = state.highProteinPriority
    ? Math.max(0, 0.35 - proteinDensity) * 40
    : Math.abs(proteinG - proteinTarget) * 2

  let recoveryFit = 0
  if (state.recoveryActive || input.recoveryActive) {
    if (FRIED_NAMES.test(names)) recoveryFit += 35
    if (SUGAR_NAMES.test(names)) recoveryFit += 25
    if (VEG_NAMES.test(names) || HIGH_PROTEIN_NAMES.test(names)) recoveryFit -= 12
  }

  let weeklyFit = 0
  if (state.weeklyProtectionActive) {
    if (FRIED_NAMES.test(names) || SUGAR_NAMES.test(names)) weeklyFit += 20
    if (VEG_NAMES.test(names)) weeklyFit -= 8
    if (HIGH_PROTEIN_NAMES.test(names)) weeklyFit -= 6
  }

  const friedPenalty = FRIED_NAMES.test(names) ? 18 : 0
  const sugarPenalty = SUGAR_NAMES.test(names) ? 14 : 0
  const historyPref = -(input.historyBoost ?? 0) * 8
  const userPref = -(input.userPrefBoost ?? 0) * 6

  return (
    calDelta * 2 +
    remainingFit +
    proteinDensityWeight +
    overRemaining +
    recoveryFit +
    weeklyFit +
    friedPenalty +
    sugarPenalty +
    historyPref +
    userPref
  )
}

export function avgDailyKcalFromLogs(
  logs: FoodLogEntry[],
  dayKeys: string[]
): number | undefined {
  if (!dayKeys.length) return undefined
  const byDay = new Map<string, number>()
  for (const log of logs) {
    const day = log.logged_at?.slice(0, 10)
    if (!day) continue
    byDay.set(day, (byDay.get(day) ?? 0) + log.calories)
  }
  let sum = 0
  let count = 0
  for (const d of dayKeys) {
    if (byDay.has(d)) {
      sum += byDay.get(d)!
      count++
    }
  }
  return count > 0 ? sum / count : undefined
}
