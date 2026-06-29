import { format, parseISO } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import {
  buildAnalysisSummary,
  type AnalysisInput,
  type AnalysisSummary,
} from './analysis-summary'
import {
  buildDayFacts,
  checkinMap,
  enumerateDaysInRange,
  logsForWeek,
} from './analytics-helpers'
import { calculateDayScore, calculateWeekScore, type DayScoreResult } from './week-score'
import { generateWeeklyInsights, type CoachInsightCard } from './week-insights'
import { generateWeeklyChallenges, type WeeklyChallengeItem, type WeeklyMetrics } from './week-challenge'
import { generateMealStrategy, type MealStrategyRow } from './week-meal-strategy'
import { generateWorkoutStrategy, type WorkoutStrategyRow } from './week-workout-strategy'

export interface WeekDayCard extends DayScoreResult {
  weekdayShort: string
  weekdayLabel: string
  isToday: boolean
  isFuture: boolean
}

export interface WeekHighlightCard {
  date: string
  label: string
  score: number
  calories: number
  protein_g: number
  fat_g: number
  positives?: string[]
  issues: string[]
}

export interface WeekSummary {
  analysis: AnalysisSummary
  insufficient_data: boolean
  insufficient_reason?: string
  weekScore: ReturnType<typeof calculateWeekScore> | null
  dailyScores: WeekDayCard[]
  weeklyMetrics: WeeklyMetrics
  insights: CoachInsightCard[]
  challenges: WeeklyChallengeItem[]
  mealStrategy: MealStrategyRow[]
  workoutStrategy: WorkoutStrategyRow[]
  bestDay: WeekHighlightCard | null
  worstDay: WeekHighlightCard | null
}

const WEEKDAY_SHORT = ['日', '一', '二', '三', '四', '五', '六']

export interface WeekSummaryInput extends Omit<AnalysisInput, 'periodType'> {
  todayDate: string
  workoutTarget?: number
  fatTargetG?: number
}

export function buildWeekSummary(input: WeekSummaryInput): WeekSummary {
  const analysis = buildAnalysisSummary({ ...input, periodType: 'week', todayDate: input.todayDate })
  const { start, end } = analysis.dateRange
  const days = enumerateDaysInRange(start, end)
  const logs = logsForWeek(input.checkins, start, end)
  const cMap = checkinMap(input.checkins)
  const fatTarget = input.fatTargetG ?? Math.round(input.targets.calories * 0.28 / 9)
  const workoutTarget = input.workoutTarget ?? 4

  const dailyScores: WeekDayCard[] = days.map(day => {
    const facts = buildDayFacts(day, logs, cMap.get(day))
    const isFuture = day > input.todayDate
    const isToday = day === input.todayDate
    const d = parseISO(day)
    const dayScore = calculateDayScore({
      facts,
      targets: { ...input.targets, fat_g: fatTarget },
      isFuture,
      isToday,
    })
    return {
      ...dayScore,
      weekdayShort: WEEKDAY_SHORT[d.getDay()]!,
      weekdayLabel: format(d, 'EEEEEE', { locale: zhTW }),
      isToday,
      isFuture,
    }
  })

  const pastDays = dailyScores.filter(d => !d.isFuture && d.score != null)
  const calorieMetDays = analysis.calorieTrend.points.filter(p => p.metTarget).length
  const proteinMetDays = analysis.proteinTrend.points.filter(p => p.metTarget).length
  const waterMetDays = analysis.dietRecordSummary.waterMetDays
  const workoutCompleted = input.checkins.filter(
    c => c.checkin_date >= start && c.checkin_date <= end && c.workout_items?.some(w => w.completed)
  ).length
  const consistencyDays = dailyScores.filter(d => !d.isFuture && d.calories > 0).length
  const waterTotalMl = input.checkins
    .filter(c => c.checkin_date >= start && c.checkin_date <= end)
    .reduce((s, c) => s + (c.water_ml ?? 0), 0)
  const dinnerUnder700Days = days.filter(day => {
    if (day > input.todayDate) return false
    const facts = buildDayFacts(day, logs, cMap.get(day))
    return facts.dinnerCalories > 0 && facts.dinnerCalories <= 700
  }).length

  const weeklyMetrics: WeeklyMetrics = {
    calorieMetDays,
    calorieTotalDays: analysis.calorieTrend.totalDays,
    proteinMetDays,
    proteinTotalDays: analysis.proteinTrend.totalDays,
    workoutCompleted,
    workoutTarget,
    waterMetDays,
    waterTotalDays: analysis.dietRecordSummary.waterTotalDays,
    waterTotalLiters: Math.round(waterTotalMl / 100) / 10,
    dinnerUnder700Days,
  }

  const weekScore = analysis.insufficient_data
    ? null
    : calculateWeekScore({
        calorieMetDays,
        calorieLoggedDays: analysis.calorieTrend.points.filter(p => p.value > 0).length,
        proteinMetDays,
        proteinLoggedDays: analysis.proteinTrend.points.filter(p => p.value > 0).length,
        workoutCompleted,
        workoutTarget,
        waterMetDays,
        waterLoggedDays: analysis.dietRecordSummary.waterTotalDays,
        consistencyDays,
        totalDays: days.filter(d => d <= input.todayDate).length,
        weightDeltaKg: analysis.weightTrend.deltaKg,
      })

  const insights = generateWeeklyInsights(analysis, {
    todayWaterMl: cMap.get(input.todayDate)?.water_ml ?? 0,
    waterTargetMl: input.targets.water_ml,
  })
  const challenges = generateWeeklyChallenges(analysis, weeklyMetrics, input.targets.water_ml)
  const mealStrategy = generateMealStrategy(analysis)
  const workoutStrategy = generateWorkoutStrategy(analysis)

  const scored = pastDays.filter(d => d.score != null) as Array<WeekDayCard & { score: number }>
  const best = scored.length ? [...scored].sort((a, b) => b.score - a.score)[0]! : null
  const worst = scored.length ? [...scored].sort((a, b) => a.score - b.score)[0]! : null

  const toHighlight = (d: WeekDayCard): WeekHighlightCard => ({
    date: d.date,
    label: format(parseISO(d.date), 'EEEE M/d', { locale: zhTW }),
    score: d.score ?? 0,
    calories: d.calories,
    protein_g: d.protein_g,
    fat_g: d.fat_g,
    positives:
      d.signal === 'green'
        ? [`蛋白質 ${d.protein_g}g`, `熱量 ${d.calories} kcal`, `脂肪 ${d.fat_g}g`]
        : undefined,
    issues: d.issues,
  })

  return {
    analysis,
    insufficient_data: analysis.insufficient_data,
    insufficient_reason: analysis.insufficient_reason,
    weekScore,
    dailyScores,
    weeklyMetrics,
    insights,
    challenges,
    mealStrategy,
    workoutStrategy,
    bestDay: best ? toHighlight(best) : null,
    worstDay: worst && worst.score < (best?.score ?? 100) ? toHighlight(worst) : null,
  }
}

export type WeekRecommendation = Pick<
  WeekSummary,
  'insights' | 'challenges' | 'mealStrategy' | 'workoutStrategy'
>

export function extractWeekRecommendation(summary: WeekSummary): WeekRecommendation {
  return {
    insights: summary.insights,
    challenges: summary.challenges,
    mealStrategy: summary.mealStrategy,
    workoutStrategy: summary.workoutStrategy,
  }
}
