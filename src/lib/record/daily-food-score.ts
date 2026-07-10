import type { FoodLogEntry } from '@/lib/banks/types'
import { mealBucket } from '@/lib/analytics/analytics-helpers'

export type DailyScoreStatus = '很穩' | '不錯' | '可調整' | '待回補' | '尚未記錄'

export type DailyScoreTone = 'high' | 'medium' | 'low' | 'empty'

export interface CalorieBankScoreState {
  enabled: boolean
  /** Day had calories above target */
  overTarget?: boolean
}

export interface DailyFoodScoreInput {
  dayLogs: FoodLogEntry[]
  dailyTargets: { calories: number; protein_g: number }
  calorieBankState?: CalorieBankScoreState | null
}

export interface DailyFoodScoreResult {
  score: number | null
  status: DailyScoreStatus
  tone: DailyScoreTone
  breakdown: {
    calories: number
    protein: number
    completeness: number
    stability: number
  }
  hasLogs: boolean
  mealBucketCount: number
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n))
}

function countMealBuckets(logs: FoodLogEntry[]): number {
  if (!logs.length) return 0
  return new Set(logs.map(mealBucket)).size
}

function caloriePoints40(calories: number, target: number): number {
  if (target <= 0 || calories <= 0) return 0
  const ratio = calories / target
  if (ratio >= 0.9 && ratio <= 1.1) return 40
  if (ratio < 0.9) {
    const deviation = 0.9 - ratio
    return clamp(40 - deviation * 160)
  }
  const deviation = ratio - 1.1
  return clamp(40 - deviation * 120)
}

function proteinPoints30(protein: number, target: number): number {
  if (target <= 0) return 0
  const ratio = Math.min(1, protein / target)
  return ratio * 30
}

function completenessPoints20(mealBuckets: number): number {
  if (mealBuckets >= 3) return 20
  if (mealBuckets === 2) return 13
  if (mealBuckets === 1) return 7
  return 0
}

function stabilityPoints10(
  calories: number,
  target: number,
  bank?: CalorieBankScoreState | null
): number {
  if (target <= 0) return 5
  if (calories <= target) return 10
  if (calories <= target * 1.05) return 9
  if (bank?.enabled) return 6
  if (calories > target * 1.15) return 1
  return 3
}

export function dailyScoreStatusFromScore(score: number | null, hasLogs: boolean): DailyScoreStatus {
  if (!hasLogs || score == null) return '尚未記錄'
  if (score >= 90) return '很穩'
  if (score >= 75) return '不錯'
  if (score >= 60) return '可調整'
  return '待回補'
}

export function dailyScoreToneFromStatus(status: DailyScoreStatus): DailyScoreTone {
  if (status === '很穩' || status === '不錯') return 'high'
  if (status === '可調整') return 'medium'
  if (status === '待回補') return 'low'
  return 'empty'
}

/** Record page daily food score — 100 pts: calories 40, protein 30, completeness 20, stability 10 */
export function calculateDailyFoodScore(input: DailyFoodScoreInput): DailyFoodScoreResult {
  const { dayLogs, dailyTargets, calorieBankState } = input
  const hasLogs = dayLogs.length > 0
  const mealBucketCount = countMealBuckets(dayLogs)

  if (!hasLogs) {
    return {
      score: null,
      status: '尚未記錄',
      tone: 'empty',
      breakdown: { calories: 0, protein: 0, completeness: 0, stability: 0 },
      hasLogs: false,
      mealBucketCount: 0,
    }
  }

  const calories = dayLogs.reduce((s, l) => s + l.calories, 0)
  const protein = dayLogs.reduce((s, l) => s + l.protein_g, 0)

  const breakdown = {
    calories: caloriePoints40(calories, dailyTargets.calories),
    protein: proteinPoints30(protein, dailyTargets.protein_g),
    completeness: completenessPoints20(mealBucketCount),
    stability: stabilityPoints10(calories, dailyTargets.calories, {
      enabled: calorieBankState?.enabled ?? false,
      overTarget: calories > dailyTargets.calories,
    }),
  }

  const score = clamp(Math.round(
    breakdown.calories + breakdown.protein + breakdown.completeness + breakdown.stability
  ))
  const status = dailyScoreStatusFromScore(score, true)

  return {
    score,
    status,
    tone: dailyScoreToneFromStatus(status),
    breakdown,
    hasLogs: true,
    mealBucketCount,
  }
}
