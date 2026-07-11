import type { FoodLogEntry } from '@/lib/banks/types'
import { normalizeFoodLogSlot } from '@/lib/food-slots'
import { computeTodayMealState, sumLoggedCalories, sumLoggedProtein } from '@/lib/engines/next-meal-engine'
import type { AnalysisSummary } from '@/lib/analytics/analysis-summary'
import type { WeekSummary } from '@/lib/analytics/week-summary'
import type {
  TodayNotificationState,
  WeekAnalysisHints,
  WeightTrendHint,
} from './notification-types'

export function inferMealFlags(logs: FoodLogEntry[]): {
  hasLoggedBreakfast: boolean
  hasLoggedLunch: boolean
  hasLoggedDinner: boolean
} {
  const normalized = logs.map(l => normalizeFoodLogSlot(l))
  return {
    hasLoggedBreakfast: normalized.includes('meal1'),
    hasLoggedLunch: normalized.includes('meal2'),
    hasLoggedDinner: normalized.includes('meal3'),
  }
}

export function buildTodayNotificationState(input: {
  foodLogs: FoodLogEntry[]
  caloriesTarget: number
  proteinTargetG: number
  waterMl?: number
  waterTargetMl?: number
}): TodayNotificationState {
  const caloriesLogged = sumLoggedCalories(input.foodLogs)
  const proteinLogged = sumLoggedProtein(input.foodLogs)
  const mealFlags = inferMealFlags(input.foodLogs)
  const today = computeTodayMealState({
    todayFoodLogs: input.foodLogs,
    normalTargetKcal: input.caloriesTarget,
    proteinTargetG: input.proteinTargetG,
  })

  const proteinMet = today.proteinGap <= 5
  const onTarget =
    caloriesLogged >= input.caloriesTarget * 0.9 &&
    caloriesLogged <= input.caloriesTarget * 1.05 &&
    proteinMet

  return {
    caloriesLogged,
    caloriesTarget: input.caloriesTarget,
    caloriesRemaining: today.remainingCalories,
    proteinLogged,
    proteinTarget: input.proteinTargetG,
    proteinGap: today.proteinGap,
    proteinMet,
    hasLoggedAnyMeal: input.foodLogs.length > 0,
    ...mealFlags,
    overTarget: today.overTargetProtection,
    onTarget,
    waterMl: input.waterMl ?? 0,
    waterTargetMl: input.waterTargetMl ?? 2000,
  }
}

export function buildWeekAnalysisHintsFromWeekSummary(
  summary: WeekSummary
): WeekAnalysisHints {
  const analysis = summary.analysis
  const proteinTrend = analysis.proteinTrend
  const weeklyProteinLow =
    proteinTrend.sufficient &&
    proteinTrend.average != null &&
    proteinTrend.average < proteinTrend.target * 0.85

  const dinnerCaloriesHigh =
    (analysis.dinnerCaloriesRatio ?? 0) > 0.38

  const workoutInsufficient =
    summary.weeklyMetrics.workoutTarget > 0 &&
    summary.weeklyMetrics.workoutCompleted / summary.weeklyMetrics.workoutTarget < 0.6

  const waterLow =
    analysis.dietRecordSummary.waterTotalDays > 0 &&
    analysis.dietRecordSummary.waterMetDays / analysis.dietRecordSummary.waterTotalDays < 0.6

  let weightTrend: WeightTrendHint = 'unknown'
  const wt = analysis.weightTrend
  if (wt.sufficient && wt.deltaKg != null) {
    if (wt.deltaKg < -0.2) weightTrend = 'down'
    else if (wt.deltaKg > 0.2) weightTrend = 'up'
    else weightTrend = 'stable'
  }

  const coachInsightLines = summary.insights
    .slice(0, 3)
    .map(i => `${i.title}：${i.body}`)
    .filter(Boolean)

  return {
    weeklyProteinLow,
    dinnerCaloriesHigh,
    workoutInsufficient,
    waterLow,
    weightTrend,
    coachInsightLines,
  }
}

export function buildWeekAnalysisHintsFromAnalysis(
  analysis: AnalysisSummary
): WeekAnalysisHints {
  const proteinTrend = analysis.proteinTrend
  const weeklyProteinLow =
    proteinTrend.sufficient &&
    proteinTrend.average != null &&
    proteinTrend.average < proteinTrend.target * 0.85

  const dinnerCaloriesHigh = (analysis.dinnerCaloriesRatio ?? 0) > 0.38

  const waterLow =
    analysis.dietRecordSummary.waterTotalDays > 0 &&
    analysis.dietRecordSummary.waterMetDays / analysis.dietRecordSummary.waterTotalDays < 0.6

  let weightTrend: WeightTrendHint = 'unknown'
  const wt = analysis.weightTrend
  if (wt.sufficient && wt.deltaKg != null) {
    if (wt.deltaKg < -0.2) weightTrend = 'down'
    else if (wt.deltaKg > 0.2) weightTrend = 'up'
    else weightTrend = 'stable'
  }

  return {
    weeklyProteinLow,
    dinnerCaloriesHigh,
    workoutInsufficient: false,
    waterLow,
    weightTrend,
    coachInsightLines: analysis.insights.slice(0, 3).map(i => `${i.title}：${i.body}`).filter(Boolean),
  }
}
