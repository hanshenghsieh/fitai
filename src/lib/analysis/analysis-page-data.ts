import {
  addDays,
  addWeeks,
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
} from 'date-fns'
import type { FoodLogEntry } from '@/lib/banks/types'
import {
  buildAnalysisSummary,
  type AnalysisCheckinRow,
  type AnalysisDayPlanHint,
  type AnalysisTargets,
} from '@/lib/analytics/analysis-summary'
import { extractRecentFoodLogsFromCheckins } from '@/lib/food-memory'
import { sumCountedCalories } from '@/lib/food-log-totals'
import type { BodyMeasurement } from '@/types'

export interface AnalysisWeekSummaryCards {
  avgWeight: number | null
  weightDelta: number | null
  avgBodyFat: number | null
  bodyFatDelta: number | null
  avgCalories: number | null
  calorieDelta: number | null
  adherenceRate: number | null
  adherenceDelta: number | null
}

export interface AnalysisTrendPoint {
  date: string
  label: string
  value: number | null
}

export interface AnalysisAdherencePoint {
  date: string
  label: string
  percent: number | null
  overTarget: boolean
}

export interface AnalysisCoachSummary {
  line1: string
  line2: string
}

export interface AnalysisNextWeekTargets {
  calories: number
  protein_g: number
  steps: number
  stepsIsSuggestion: boolean
}

export interface AnalysisWeekView {
  weekStart: string
  weekEnd: string
  weekLabel: string
  isFuture: boolean
  isEmpty: boolean
  summary: AnalysisWeekSummaryCards
  weightTrend: AnalysisTrendPoint[]
  bodyFatTrend: AnalysisTrendPoint[]
  calorieAdherence: AnalysisAdherencePoint[]
  coachSummary: AnalysisCoachSummary
  nextWeekTargets: AnalysisNextWeekTargets
  hasBodyFatData: boolean
}

export interface BuildAnalysisWeekInput {
  anchorDate: Date
  todayStr: string
  measurements: BodyMeasurement[]
  checkins: AnalysisCheckinRow[]
  targets: AnalysisTargets
  dayPlansByDate?: Record<string, AnalysisDayPlanHint>
  currentWeightKg?: number | null
  profileWeightKg?: number | null
}

function formatWeekLabel(start: string, end: string): string {
  const s = parseISO(start)
  const e = parseISO(end)
  const sameMonth = s.getMonth() === e.getMonth()
  if (sameMonth) {
    return `${format(s, 'M/d')} - ${format(e, 'd')}`
  }
  return `${format(s, 'M/d')} - ${format(e, 'M/d')}`
}

function enumerateWeekDays(weekStart: string): string[] {
  const range = { start: weekStart, end: format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd'), label: '' }
  return enumerateDaysFromRange(range)
}

/** Re-export helper if not exported — use local copy */
function enumerateDaysFromRange(range: { start: string; end: string }): string[] {
  const days: string[] = []
  let cursor = parseISO(range.start)
  const end = parseISO(range.end)
  while (cursor <= end) {
    days.push(format(cursor, 'yyyy-MM-dd'))
    cursor = addDays(cursor, 1)
  }
  return days
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null
  return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10
}

function resolveDayCalorieTarget(
  day: string,
  dayPlansByDate: Record<string, AnalysisDayPlanHint> | undefined,
  fallback: number
): number {
  return dayPlansByDate?.[day]?.daily_targets?.calories ?? fallback
}

function sumLogsDay(logs: FoodLogEntry[], day: string) {
  const dayLogs = logs.filter(l => l.logged_at.slice(0, 10) === day)
  return sumCountedCalories(dayLogs)
}

function buildDailyMetricSeries(
  days: string[],
  measurements: BodyMeasurement[],
  field: 'weight_kg' | 'body_fat_pct',
  beforeWeekSeed?: number | null
): AnalysisTrendPoint[] {
  const sorted = [...measurements]
    .filter(m => m[field] != null && Number.isFinite(m[field] as number))
    .sort((a, b) => {
      const byDay = a.measured_at.localeCompare(b.measured_at)
      if (byDay !== 0) return byDay
      return (a.created_at ?? '').localeCompare(b.created_at ?? '')
    })

  let lastKnown = beforeWeekSeed ?? null
  for (const m of sorted) {
    if (m.measured_at.slice(0, 10) < days[0]) {
      lastKnown = m[field] as number
    }
  }

  return days.map(day => {
    const onDay = sorted.filter(m => m.measured_at.slice(0, 10) === day)
    if (onDay.length) {
      lastKnown = onDay.at(-1)![field] as number
    }
    return {
      date: day,
      label: format(parseISO(day), 'M/d'),
      value: lastKnown,
    }
  })
}

function buildAdherencePoints(
  days: string[],
  logs: FoodLogEntry[],
  dayPlansByDate: Record<string, AnalysisDayPlanHint> | undefined,
  fallbackTarget: number
): AnalysisAdherencePoint[] {
  return days.map(day => {
    const actual = sumLogsDay(logs, day)
    const target = resolveDayCalorieTarget(day, dayPlansByDate, fallbackTarget)
    if (actual <= 0 || target <= 0) {
      return { date: day, label: format(parseISO(day), 'M/d'), percent: null, overTarget: false }
    }
    const percent = Math.round((actual / target) * 100)
    return {
      date: day,
      label: format(parseISO(day), 'M/d'),
      percent,
      overTarget: percent > 105,
    }
  })
}

function adherenceAverage(points: AnalysisAdherencePoint[]): number | null {
  const vals = points.map(p => p.percent).filter((p): p is number => p != null)
  if (!vals.length) return null
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
}

function avgBodyFatInWeek(days: string[], measurements: BodyMeasurement[]): number | null {
  const vals: number[] = []
  for (const day of days) {
    const rows = measurements.filter(
      m => m.measured_at.slice(0, 10) === day && m.body_fat_pct != null
    )
    if (rows.length) vals.push(rows.at(-1)!.body_fat_pct!)
  }
  return avg(vals)
}

function avgWeightInWeek(days: string[], measurements: BodyMeasurement[]): number | null {
  const vals: number[] = []
  for (const day of days) {
    const rows = measurements.filter(m => m.measured_at.slice(0, 10) === day && m.weight_kg != null)
    if (rows.length) vals.push(rows.at(-1)!.weight_kg!)
  }
  if (vals.length) return avg(vals)
  const inWeek = measurements.filter(m => {
    const d = m.measured_at.slice(0, 10)
    return d >= days[0] && d <= days.at(-1)! && m.weight_kg != null
  })
  if (!inWeek.length) return null
  return avg(inWeek.map(m => m.weight_kg!))
}

function buildCoachSummary(
  current: AnalysisWeekView['summary'],
  weightDelta: number | null,
  adherenceDelta: number | null,
  overTargetDays: number
): AnalysisCoachSummary {
  const weightDown = weightDelta != null && weightDelta < -0.05
  const adherenceUp = adherenceDelta != null && adherenceDelta > 3

  if (weightDown && adherenceUp) {
    return {
      line1: '表現很棒！體重與體脂穩定下降，熱量達成率提升。',
      line2: '下週將微調熱量與碳水，幫助你突破停滯期，持續進步！',
    }
  }

  if (overTargetDays >= 3) {
    return {
      line1: '這週有幾天熱量偏高，不用重來。',
      line2: '下週先把蛋白質補穩，再用 Calorie Bank 慢慢回到節奏。',
    }
  }

  if (current.avgCalories != null && current.adherenceRate != null && current.adherenceRate >= 75) {
    return {
      line1: '這週紀錄很穩定，雖然體重變化不大，但你已經建立節奏。',
      line2: '下週可以微調熱量或增加蛋白質，讓進度更明顯。',
    }
  }

  if (current.avgCalories == null) {
    return {
      line1: '這週還沒有太多飲食紀錄。',
      line2: '先從記錄一餐開始，趨勢會越來越清楚。',
    }
  }

  return {
    line1: '這週有在推進，節奏比完美更重要。',
    line2: '下週維持記錄習慣，我會依你的數據微調目標。',
  }
}

function buildNextWeekTargets(
  targets: AnalysisTargets,
  summary: AnalysisWeekSummaryCards
): AnalysisNextWeekTargets {
  let calories = targets.calories
  if (summary.avgCalories != null) {
    if (summary.avgCalories > targets.calories + 80) {
      calories = Math.max(1200, targets.calories - 50)
    } else if (summary.avgCalories < targets.calories - 120) {
      calories = Math.min(targets.calories + 30, targets.calories)
    }
  }

  return {
    calories,
    protein_g: targets.protein_g,
    steps: 8000,
    stepsIsSuggestion: true,
  }
}

function buildSummaryCards(
  days: string[],
  logs: FoodLogEntry[],
  measurements: BodyMeasurement[],
  dayPlansByDate: Record<string, AnalysisDayPlanHint> | undefined,
  fallbackTarget: number,
  prior?: AnalysisWeekSummaryCards | null
): AnalysisWeekSummaryCards {
  const loggedCals = days.map(d => sumLogsDay(logs, d)).filter(v => v > 0)
  const avgCalories = loggedCals.length ? Math.round(loggedCals.reduce((s, v) => s + v, 0) / loggedCals.length) : null

  const adherencePoints = buildAdherencePoints(days, logs, dayPlansByDate, fallbackTarget)
  const adherenceRate = adherenceAverage(adherencePoints)

  const avgWeight = avgWeightInWeek(days, measurements)
  const avgBodyFat = avgBodyFatInWeek(days, measurements)

  const delta = (current: number | null, previous: number | null) =>
    current != null && previous != null ? Math.round((current - previous) * 10) / 10 : null

  return {
    avgWeight,
    weightDelta: delta(avgWeight, prior?.avgWeight ?? null),
    avgBodyFat,
    bodyFatDelta: delta(avgBodyFat, prior?.avgBodyFat ?? null),
    avgCalories,
    calorieDelta: delta(avgCalories, prior?.avgCalories ?? null),
    adherenceRate,
    adherenceDelta: delta(adherenceRate, prior?.adherenceRate ?? null),
  }
}

export function buildAnalysisWeekView(input: BuildAnalysisWeekInput): AnalysisWeekView {
  const weekStart = format(startOfWeek(input.anchorDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(input.anchorDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const days = enumerateWeekDays(weekStart)
  const isFuture = weekStart > input.todayStr
  const weekLabel = formatWeekLabel(weekStart, weekEnd)

  const priorAnchor = addWeeks(input.anchorDate, -1)
  const priorStart = format(startOfWeek(priorAnchor, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const priorEnd = format(endOfWeek(priorAnchor, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const priorDays = enumerateWeekDays(priorStart)
  const priorLogs = extractRecentFoodLogsFromCheckins(input.checkins).filter(l => {
    const d = l.logged_at.slice(0, 10)
    return d >= priorStart && d <= priorEnd
  })
  const priorSummary = buildSummaryCards(
    priorDays,
    priorLogs,
    input.measurements,
    input.dayPlansByDate,
    input.targets.calories,
    null
  )

  if (isFuture) {
    return {
      weekStart,
      weekEnd,
      weekLabel,
      isFuture: true,
      isEmpty: true,
      summary: {
        avgWeight: null,
        weightDelta: null,
        avgBodyFat: null,
        bodyFatDelta: null,
        avgCalories: null,
        calorieDelta: null,
        adherenceRate: null,
        adherenceDelta: null,
      },
      weightTrend: days.map(d => ({ date: d, label: format(parseISO(d), 'M/d'), value: null })),
      bodyFatTrend: days.map(d => ({ date: d, label: format(parseISO(d), 'M/d'), value: null })),
      calorieAdherence: days.map(d => ({
        date: d,
        label: format(parseISO(d), 'M/d'),
        percent: null,
        overTarget: false,
      })),
      coachSummary: {
        line1: '這是一週未來的區間。',
        line2: '等這週開始記錄後，就會在這裡看到趨勢。',
      },
      nextWeekTargets: buildNextWeekTargets(input.targets, {
        avgWeight: null,
        weightDelta: null,
        avgBodyFat: null,
        bodyFatDelta: null,
        avgCalories: null,
        calorieDelta: null,
        adherenceRate: null,
        adherenceDelta: null,
      }),
      hasBodyFatData: false,
    }
  }

  const allLogs = extractRecentFoodLogsFromCheckins(input.checkins)
  const logs = allLogs.filter(l => {
    const d = l.logged_at.slice(0, 10)
    return d >= weekStart && d <= weekEnd
  })

  const summary = buildSummaryCards(
    days,
    logs,
    input.measurements,
    input.dayPlansByDate,
    input.targets.calories,
    priorSummary
  )

  const weightTrend = buildDailyMetricSeries(days, input.measurements, 'weight_kg', input.currentWeightKg)
  const bodyFatTrend = buildDailyMetricSeries(days, input.measurements, 'body_fat_pct')
  const hasBodyFatData = bodyFatTrend.some(p => p.value != null)

  const calorieAdherence = buildAdherencePoints(
    days,
    logs,
    input.dayPlansByDate,
    input.targets.calories
  )

  const analysis = buildAnalysisSummary({
    periodType: 'week',
    anchorDate: input.anchorDate,
    todayDate: input.todayStr,
    measurements: input.measurements,
    checkins: input.checkins,
    targets: input.targets,
    dayPlansByDate: input.dayPlansByDate,
    currentWeightKg: input.currentWeightKg,
    profileWeightKg: input.profileWeightKg,
  })

  const overTargetDays = analysis.calorieTrend.points.filter(p => p.value > input.targets.calories * 1.05).length

  const coachSummary = buildCoachSummary(
    summary,
    summary.weightDelta,
    summary.adherenceDelta,
    overTargetDays
  )

  const nextWeekTargets = buildNextWeekTargets(input.targets, summary)

  const isEmpty = logs.length === 0 && !summary.avgWeight && !hasBodyFatData

  return {
    weekStart,
    weekEnd,
    weekLabel,
    isFuture: false,
    isEmpty,
    summary,
    weightTrend,
    bodyFatTrend,
    calorieAdherence,
    coachSummary,
    nextWeekTargets,
    hasBodyFatData,
  }
}

export function canNavigateAnalysisWeek(anchor: Date, direction: -1 | 1, todayStr: string): boolean {
  const next = addWeeks(anchor, direction)
  const nextStart = format(startOfWeek(next, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  if (direction === 1) {
    return nextStart <= format(startOfWeek(parseISO(todayStr), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  }
  return true
}

export function shiftAnalysisWeekAnchor(anchor: Date, direction: -1 | 1): Date {
  return addWeeks(anchor, direction)
}

export function initialAnalysisWeekAnchor(todayStr: string): Date {
  return startOfWeek(parseISO(todayStr), { weekStartsOn: 1 })
}

export function isCurrentAnalysisWeek(weekStart: string, todayStr: string): boolean {
  const current = format(startOfWeek(parseISO(todayStr), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  return weekStart === current
}
