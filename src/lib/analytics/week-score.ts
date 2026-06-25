import {
  DAY_SCORE_WEIGHTS,
  SCORE_SIGNAL_THRESHOLDS,
  WEEK_GOAL_SCORE,
  WEEK_SCORE_WEIGHTS,
} from './week-constants'
import type { DayFacts } from './analytics-helpers'

export type ScoreSignal = 'green' | 'yellow' | 'red' | 'neutral'
export type TodayStatus = 'Good' | 'Warning' | 'Need Improve'

export interface DayScoreResult {
  date: string
  score: number | null
  signal: ScoreSignal
  todayStatus?: TodayStatus
  calories: number
  protein_g: number
  fat_g: number
  issues: string[]
}

export interface WeekScoreComponents {
  calories: number
  protein: number
  workout: number
  water: number
  consistency: number
  weightTrend: number
}

export interface WeekScoreResult {
  score: number
  label: string
  goalScore: number
  gapToGoal: number
  components: WeekScoreComponents
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function calSubScore(calories: number, target: number, hasLogs: boolean): number {
  if (!hasLogs) return 0
  if (calories <= 0) return 0
  const ratio = calories / target
  if (ratio >= 0.85 && ratio <= 1.05) return 100
  if (ratio < 0.85) return clampScore(100 - (0.85 - ratio) * 200)
  return clampScore(100 - (ratio - 1.05) * 150)
}

function proSubScore(protein: number, target: number, hasLogs: boolean): number {
  if (!hasLogs) return 0
  const ratio = protein / target
  if (ratio >= 0.9) return 100
  return clampScore(ratio * 100)
}

function fatSubScore(fat_g: number, fatTarget: number, hasLogs: boolean): number {
  if (!hasLogs) return 50
  if (fatTarget <= 0) return 70
  const ratio = fat_g / fatTarget
  if (ratio <= 1.05) return 100
  return clampScore(100 - (ratio - 1.05) * 120)
}

function veggieSubScore(hits: number, mealCount: number): number {
  if (mealCount === 0) return 0
  if (hits >= 2) return 100
  if (hits === 1) return 75
  return 35
}

function sugarSubScore(count: number): number {
  if (count === 0) return 100
  if (count === 1) return 60
  return 25
}

function workoutSubScore(done: boolean, hasPastDay: boolean): number {
  if (!hasPastDay) return 50
  return done ? 100 : 20
}

function waterSubScore(ml: number, target: number, hasPastDay: boolean): number {
  if (!hasPastDay) return 50
  if (ml <= 0) return 30
  const ratio = ml / target
  if (ratio >= 0.9) return 100
  return clampScore(ratio * 100)
}

export function scoreSignal(score: number | null): ScoreSignal {
  if (score == null) return 'neutral'
  if (score >= SCORE_SIGNAL_THRESHOLDS.green) return 'green'
  if (score >= SCORE_SIGNAL_THRESHOLDS.yellow) return 'yellow'
  return 'red'
}

export function todayStatusFromScore(score: number | null): TodayStatus | undefined {
  if (score == null) return undefined
  if (score >= SCORE_SIGNAL_THRESHOLDS.green) return 'Good'
  if (score >= SCORE_SIGNAL_THRESHOLDS.yellow) return 'Warning'
  return 'Need Improve'
}

export function weekScoreLabel(score: number): string {
  if (score >= 85) return '很棒'
  if (score >= 75) return '還不錯'
  if (score >= 60) return '再加把勁'
  return '需要調整'
}

export interface DayScoreInput {
  facts: DayFacts
  targets: { calories: number; protein_g: number; fat_g: number; water_ml: number }
  isFuture: boolean
  isToday: boolean
}

export function calculateDayScore(input: DayScoreInput): DayScoreResult {
  const { facts, targets, isFuture } = input
  const issues: string[] = []

  if (isFuture || !facts.hasLogs) {
    return {
      date: facts.date,
      score: null,
      signal: 'neutral',
      calories: facts.calories,
      protein_g: facts.protein_g,
      fat_g: facts.fat_g,
      issues,
    }
  }

  const fatTarget = targets.fat_g > 0 ? targets.fat_g : Math.round(targets.calories * 0.28 / 9)
  const subs = {
    calories: calSubScore(facts.calories, targets.calories, facts.hasLogs),
    protein: proSubScore(facts.protein_g, targets.protein_g, facts.hasLogs),
    fat: fatSubScore(facts.fat_g, fatTarget, facts.hasLogs),
    veggies: veggieSubScore(facts.veggieHits, facts.mealCount),
    sugar: sugarSubScore(facts.sugarDrinkCount),
    workout: workoutSubScore(facts.workoutDone, true),
    water: waterSubScore(facts.water_ml, targets.water_ml, true),
  }

  const score = clampScore(
    subs.calories * DAY_SCORE_WEIGHTS.calories +
      subs.protein * DAY_SCORE_WEIGHTS.protein +
      subs.fat * DAY_SCORE_WEIGHTS.fat +
      subs.veggies * DAY_SCORE_WEIGHTS.veggies +
      subs.sugar * DAY_SCORE_WEIGHTS.sugar +
      subs.workout * DAY_SCORE_WEIGHTS.workout +
      subs.water * DAY_SCORE_WEIGHTS.water
  )

  if (facts.calories > targets.calories * 1.05) {
    issues.push(`熱量超標 ${Math.round(facts.calories - targets.calories)} kcal`)
  }
  if (facts.protein_g < targets.protein_g * 0.85) {
    issues.push(`蛋白質不足 ${Math.round(targets.protein_g - facts.protein_g)}g`)
  }
  if (facts.dinnerCalories > 700) {
    issues.push(`晚餐 ${facts.dinnerCalories} kcal`)
  }
  if (!facts.workoutDone) {
    issues.push('未運動')
  }

  const signal = scoreSignal(score)
  return {
    date: facts.date,
    score,
    signal,
    todayStatus: input.isToday ? todayStatusFromScore(score) : undefined,
    calories: facts.calories,
    protein_g: facts.protein_g,
    fat_g: facts.fat_g,
    issues,
  }
}

export interface WeekScoreInput {
  calorieMetDays: number
  calorieLoggedDays: number
  proteinMetDays: number
  proteinLoggedDays: number
  workoutCompleted: number
  workoutTarget: number
  waterMetDays: number
  waterLoggedDays: number
  consistencyDays: number
  totalDays: number
  weightDeltaKg: number | null
}

export function calculateWeekScore(input: WeekScoreInput): WeekScoreResult {
  const ratio = (met: number, logged: number) => (logged > 0 ? met / logged : 0)

  const calories = clampScore(ratio(input.calorieMetDays, input.calorieLoggedDays) * 100)
  const protein = clampScore(ratio(input.proteinMetDays, input.proteinLoggedDays) * 100)
  const workout = clampScore(
    input.workoutTarget > 0 ? (input.workoutCompleted / input.workoutTarget) * 100 : 50
  )
  const water = clampScore(ratio(input.waterMetDays, input.waterLoggedDays) * 100)
  const consistency = clampScore(
    input.totalDays > 0 ? (input.consistencyDays / input.totalDays) * 100 : 0
  )

  let weightTrend = 70
  if (input.weightDeltaKg != null) {
    if (input.weightDeltaKg < -0.2) weightTrend = 100
    else if (input.weightDeltaKg > 0.2) weightTrend = 40
    else weightTrend = 65
  }

  const components: WeekScoreComponents = {
    calories,
    protein,
    workout,
    water,
    consistency,
    weightTrend,
  }

  const score = clampScore(
    components.calories * WEEK_SCORE_WEIGHTS.calories +
      components.protein * WEEK_SCORE_WEIGHTS.protein +
      components.workout * WEEK_SCORE_WEIGHTS.workout +
      components.water * WEEK_SCORE_WEIGHTS.water +
      components.consistency * WEEK_SCORE_WEIGHTS.consistency +
      components.weightTrend * WEEK_SCORE_WEIGHTS.weightTrend
  )

  return {
    score,
    label: weekScoreLabel(score),
    goalScore: WEEK_GOAL_SCORE,
    gapToGoal: Math.max(0, WEEK_GOAL_SCORE - score),
    components,
  }
}
