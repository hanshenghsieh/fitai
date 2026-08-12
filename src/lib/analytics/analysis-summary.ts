import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'
import { zhTW } from 'date-fns/locale'
import type { FoodLogEntry } from '@/lib/banks/types'
import type { BodyMeasurement } from '@/types'
import { extractRecentFoodLogsFromCheckins } from '@/lib/food-memory'
import {
  isFoodLogCountedTowardTotals,
  sumCountedCalories,
  sumCountedProtein,
  sumCountedCarbs,
  sumCountedFat,
} from '@/lib/food-log-totals'

export function isSyntheticWeightMeasurementId(id?: string | null): boolean {
  return (
    id === 'goal-start-weight' ||
    id === 'profile-baseline-weight' ||
    id === 'weight-trend-anchor' ||
    id?.startsWith('visible-weight-') === true
  )
}

export type AnalysisPeriodType = 'day' | 'week' | 'month'

export interface AnalysisTargets {
  calories: number
  protein_g: number
  water_ml: number
  target_weight_kg: number | null
  start_weight_kg?: number | null
  start_date?: string | null
}

export interface AnalysisCheckinRow {
  checkin_date: string
  notes?: string | null
  water_ml?: number | null
  workout_items?: { completed: boolean }[] | null
}

export interface AnalysisDayPlanHint {
  calories_burned_est?: number
  daily_targets?: { calories?: number; protein_g?: number; water_ml?: number }
}

export interface AnalysisInput {
  periodType: AnalysisPeriodType
  anchorDate: Date
  /** Taipei nutrition day key — used to pace weekly water goals and skip stale nudges. */
  todayDate?: string
  measurements: BodyMeasurement[]
  checkins: AnalysisCheckinRow[]
  targets: AnalysisTargets
  dayPlansByDate?: Record<string, AnalysisDayPlanHint>
  currentWeightKg?: number | null
  /** Profile / settings weight — used as trend baseline before first progress log. */
  profileWeightKg?: number | null
  /** Last visible weight before a new save — fallback when server drops the prior row. */
  priorWeightKg?: number | null
}

export interface DateRange {
  start: string
  end: string
  label: string
}

export interface WeightTrendSummary {
  sufficient: boolean
  currentKg: number | null
  /** Second-most-recent reading — the weight logged before `currentKg`. */
  previousKg: number | null
  targetKg: number | null
  deltaKg: number | null
  deltaLabel: string | null
  points: { label: string; weight: number; key: string }[]
}

export interface DailyMetricPoint {
  date: string
  label: string
  value: number
  metTarget: boolean
}

export interface TrendBlock {
  sufficient: boolean
  average: number | null
  target: number
  deltaFromTarget: number | null
  metDays: number
  totalDays: number
  points: DailyMetricPoint[]
}

export interface MacroRatioSummary {
  sufficient: boolean
  proteinPct: number
  carbsPct: number
  fatPct: number
}

export interface CalorieDistributionSummary {
  sufficient: boolean
  breakfastPct: number
  lunchPct: number
  dinnerPct: number
  snackPct: number
  breakfastKcal: number
  lunchKcal: number
  dinnerKcal: number
  snackKcal: number
  insight: string | null
}

export interface AnalysisInsight {
  tone: 'success' | 'warning' | 'neutral'
  title: string
  body: string
}

export interface DayHighlight {
  date: string
  label: string
  calories: number
  protein_g: number
  tags: string[]
  issues?: string[]
}

export interface NextActionItem {
  id: string
  label: string
  done: boolean
}

export interface AnalysisSummary {
  periodType: AnalysisPeriodType
  dateRange: DateRange
  insufficient_data: boolean
  insufficient_reason?: string
  weightTrend: WeightTrendSummary
  calorieTrend: TrendBlock
  proteinTrend: TrendBlock
  macroRatio: MacroRatioSummary
  calorieDistribution: CalorieDistributionSummary
  insights: AnalysisInsight[]
  nextWeekSuggestions: string[]
  dietRecordSummary: {
    sufficient: boolean
    totalMeals: number
    avgCaloriesPerMeal: number | null
    overTargetDays: number
    exerciseBurnKcal: number | null
    waterMetDays: number
    waterTotalDays: number
  }
  bestDay: DayHighlight | null
  needsAttentionDay: DayHighlight | null
  nextActions: NextActionItem[]
  dinnerCaloriesRatio: number | null
  proteinGapAvg: number | null
  fatRatioAvg: number | null
  sugarDrinkCount: number
  fiberGapScore: number | null
}

export function resolveAnalysisDateRange(periodType: AnalysisPeriodType, anchor: Date): DateRange {
  if (periodType === 'day') {
    const d = format(anchor, 'yyyy-MM-dd')
    return {
      start: d,
      end: d,
      label: format(anchor, 'yyyy/MM/dd'),
    }
  }
  if (periodType === 'month') {
    const start = startOfMonth(anchor)
    const end = endOfMonth(anchor)
    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
      label: format(anchor, 'yyyy年M月', { locale: zhTW }),
    }
  }
  const start = startOfWeek(anchor, { weekStartsOn: 1 })
  const end = endOfWeek(anchor, { weekStartsOn: 1 })
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
    label: `${format(start, 'yyyy/MM/dd')} - ${format(end, 'yyyy/MM/dd')}`,
  }
}

export function shiftAnalysisAnchor(periodType: AnalysisPeriodType, anchor: Date, direction: -1 | 1): Date {
  if (periodType === 'day') return addDays(anchor, direction)
  if (periodType === 'month') return addMonths(anchor, direction)
  return addWeeks(anchor, direction)
}

function logsInRange(logs: FoodLogEntry[], range: DateRange): FoodLogEntry[] {
  return logs.filter(l => {
    const day = l.logged_at.slice(0, 10)
    return day >= range.start && day <= range.end
  })
}

function checkinsInRange(checkins: AnalysisCheckinRow[], range: DateRange): AnalysisCheckinRow[] {
  return checkins.filter(c => c.checkin_date >= range.start && c.checkin_date <= range.end)
}

function measurementsInRange(measurements: BodyMeasurement[], range: DateRange): BodyMeasurement[] {
  return measurements.filter(m => {
    const day = m.measured_at.slice(0, 10)
    return day >= range.start && day <= range.end
  })
}

function sortMeasurementsChronologically(measurements: BodyMeasurement[]): BodyMeasurement[] {
  return [...measurements].sort((a, b) => {
    const byDay = a.measured_at.localeCompare(b.measured_at)
    if (byDay !== 0) return byDay
    return (a.created_at ?? '').localeCompare(b.created_at ?? '')
  })
}

/** Weight from the reading before the latest entry (for「上次」vs「目前」). */
export function resolvePreviousWeightKg(measurements: BodyMeasurement[]): number | null {
  const sorted = sortMeasurementsChronologically(measurements)
  if (sorted.length < 2) return null
  return sorted[sorted.length - 2]?.weight_kg ?? null
}

function weightsNear(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.05
}

function dedupeWeightMeasurements(measurements: BodyMeasurement[]): BodyMeasurement[] {
  const sorted = sortMeasurementsChronologically(
    measurements.filter(m => m.weight_kg != null) as BodyMeasurement[]
  )
  const seen = new Set<string>()
  const out: BodyMeasurement[] = []
  for (const m of sorted) {
    const key = m.id || `${m.measured_at}|${m.created_at ?? ''}|${m.weight_kg}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(m)
  }
  return out
}

/** When only one log exists, use goal start weight as the first trend point. */
export function injectGoalStartWeightBaseline(
  measurements: BodyMeasurement[],
  startWeightKg: number | null | undefined,
  startDate: string | null | undefined,
  profileWeightKg?: number | null,
  priorWeightKg?: number | null
): BodyMeasurement[] {
  const dedupedAll = dedupeWeightMeasurements(
    measurements.filter(m => !isSyntheticWeightMeasurementId(m.id))
  )
  const initial = resolveInitialWeightPoint(
    dedupedAll,
    startWeightKg,
    startDate,
    profileWeightKg,
    priorWeightKg
  )
  if (!initial || (initial.id !== 'goal-start-weight' && initial.id !== 'profile-baseline-weight')) {
    return dedupedAll
  }
  return sortMeasurementsChronologically([initial, ...dedupedAll])
}

function makeProfileBaselineWeight(
  profileWeightKg: number,
  latestLog: BodyMeasurement,
  userId: string
): BodyMeasurement {
  const day = latestLog.measured_at.slice(0, 10)
  const logStamp = latestLog.created_at ?? `${day}T12:00:00.000Z`
  let baselineCreatedAt = `${day}T00:00:00.000Z`
  try {
    baselineCreatedAt = new Date(new Date(logStamp).getTime() - 60_000).toISOString()
  } catch {
    // keep midnight fallback
  }
  return {
    id: 'profile-baseline-weight',
    user_id: userId,
    measured_at: day,
    weight_kg: profileWeightKg,
    body_fat_pct: null,
    muscle_mass_kg: null,
    waist_cm: null,
    hip_cm: null,
    chest_cm: null,
    created_at: baselineCreatedAt,
  }
}

function resolveInitialWeightPoint(
  dedupedAll: BodyMeasurement[],
  startWeightKg: number | null | undefined,
  startDate: string | null | undefined,
  profileWeightKg?: number | null,
  priorWeightKg?: number | null
): BodyMeasurement | null {
  const baselineDay = startDate?.slice(0, 10)
  const latestLog = dedupedAll.at(-1)

  if (dedupedAll.length >= 2) return null

  if (startWeightKg != null && baselineDay) {
    const onboardingLog = dedupedAll.find(
      m =>
        m.weight_kg != null &&
        m.measured_at.slice(0, 10) === baselineDay &&
        weightsNear(m.weight_kg, startWeightKg)
    )
    if (onboardingLog) return onboardingLog
  }

  for (const baselineKg of [priorWeightKg, profileWeightKg]) {
    if (baselineKg == null || latestLog?.weight_kg == null) continue
    if (weightsNear(baselineKg, latestLog.weight_kg)) continue
    if (dedupedAll.some(m => m.weight_kg != null && weightsNear(m.weight_kg, baselineKg))) continue
    return makeProfileBaselineWeight(baselineKg, latestLog, dedupedAll[0]?.user_id ?? 'unknown')
  }

  if (startWeightKg == null || !baselineDay) return null
  if (profileWeightKg != null && !weightsNear(profileWeightKg, startWeightKg)) return null
  if (dedupedAll.length >= 2) return null

  const logW = latestLog?.weight_kg
  if (logW != null && weightsNear(logW, startWeightKg)) return null
  if (logW != null && profileWeightKg != null && weightsNear(profileWeightKg, logW)) return null
  if (logW != null && priorWeightKg != null && weightsNear(priorWeightKg, logW)) return null

  return {
    id: 'goal-start-weight',
    user_id: dedupedAll[0]?.user_id ?? 'unknown',
    measured_at: baselineDay,
    weight_kg: startWeightKg,
    body_fat_pct: null,
    muscle_mass_kg: null,
    waist_cm: null,
    hip_cm: null,
    chest_cm: null,
    created_at: `${baselineDay}T00:00:00.000Z`,
  }
}

function buildFullWeightTrendMeasurements(
  measurements: BodyMeasurement[],
  startWeightKg?: number | null,
  startDate?: string | null,
  profileWeightKg?: number | null,
  priorWeightKg?: number | null
): BodyMeasurement[] {
  const dedupedAll = dedupeWeightMeasurements(
    measurements.filter(m => !isSyntheticWeightMeasurementId(m.id))
  )
  const initial = resolveInitialWeightPoint(
    dedupedAll,
    startWeightKg,
    startDate,
    profileWeightKg,
    priorWeightKg
  )
  if (!initial) return dedupedAll
  if (initial.id !== 'goal-start-weight' && initial.id !== 'profile-baseline-weight') return dedupedAll
  return sortMeasurementsChronologically([initial, ...dedupedAll])
}

/** Initial weight + each saved update — one chart point per measurement in the selected period. */
export function buildPeriodWeightTrendMeasurements(
  measurements: BodyMeasurement[],
  range: DateRange,
  startWeightKg?: number | null,
  startDate?: string | null,
  profileWeightKg?: number | null,
  priorWeightKg?: number | null
): BodyMeasurement[] {
  const dedupedAll = dedupeWeightMeasurements(
    measurements.filter(m => !isSyntheticWeightMeasurementId(m.id))
  )
  const inPeriodLogs = measurementsInRange(dedupedAll, range)
  const initial = resolveInitialWeightPoint(
    dedupedAll,
    startWeightKg,
    startDate,
    profileWeightKg,
    priorWeightKg
  )

  if (initial) {
    const initialDay = initial.measured_at.slice(0, 10)
    const alreadyInPeriod =
      initial.weight_kg != null &&
      inPeriodLogs.some(m => m.weight_kg != null && weightsNear(m.weight_kg, initial.weight_kg))
    if (!alreadyInPeriod && inPeriodLogs.length > 0) {
      if (initial.id === 'profile-baseline-weight') {
        return sortMeasurementsChronologically([initial, ...inPeriodLogs])
      }
      if (initial.id === 'goal-start-weight' && dedupedAll.length < 2 && initialDay < range.start) {
        return sortMeasurementsChronologically([initial, ...inPeriodLogs])
      }
    }
  }

  if (inPeriodLogs.length >= 1 && dedupedAll.length >= 2) {
    const prePeriod = dedupedAll.filter(m => m.measured_at.slice(0, 10) < range.start).at(-1)
    if (
      prePeriod?.weight_kg != null &&
      !inPeriodLogs.some(m => m.weight_kg != null && weightsNear(m.weight_kg, prePeriod.weight_kg!))
    ) {
      return sortMeasurementsChronologically([prePeriod, ...inPeriodLogs])
    }
    return inPeriodLogs
  }

  const fullTrend = buildFullWeightTrendMeasurements(
    measurements,
    startWeightKg,
    startDate,
    profileWeightKg,
    priorWeightKg
  )
  return measurementsInRange(fullTrend, range)
}

export function hasVisibleWeightTrend(points: { weight: number }[]): boolean {
  if (points.length < 2) return false
  const ws = points.map(p => p.weight)
  return Math.max(...ws) - Math.min(...ws) >= 0.05
}

export function weightChartYDomain(points: { weight: number }[]): [number, number] {
  if (points.length === 0) return [60, 80]
  const weights = points.map(p => p.weight)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const pad = Math.max((max - min) * 0.35, 1)
  return [Math.floor((min - pad) * 10) / 10, Math.ceil((max + pad) * 10) / 10]
}

function sumLogsDay(logs: FoodLogEntry[], day: string) {
  const dayLogs = logs.filter(l => l.logged_at.slice(0, 10) === day)
  return {
    calories: sumCountedCalories(dayLogs),
    protein_g: sumCountedProtein(dayLogs),
    carbs_g: sumCountedCarbs(dayLogs),
    fat_g: sumCountedFat(dayLogs),
    count: dayLogs.length,
  }
}

function mealBucket(log: FoodLogEntry): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  if (log.slot === 'breakfast') return 'breakfast'
  if (log.slot === 'lunch') return 'lunch'
  if (log.slot === 'dinner') return 'dinner'
  if (log.slot === 'bedtime' || log.slot === 'other') return 'snack'
  try {
    const hour = parseISO(log.logged_at).getHours()
    if (hour < 10) return 'breakfast'
    if (hour < 15) return 'lunch'
    if (hour < 21) return 'dinner'
  } catch {
    // ignore
  }
  return 'snack'
}

const SUGAR_DRINK = /珍奶|奶茶|手搖|全糖|半糖|含糖|可樂|汽水|黑糖/
const HIGH_FIBER = /花椰|蔬菜|青菜|毛豆|地瓜|番薯|菇|沙拉/

function enumerateDays(range: DateRange): string[] {
  const days: string[] = []
  let cursor = parseISO(range.start)
  const end = parseISO(range.end)
  while (cursor <= end) {
    days.push(format(cursor, 'yyyy-MM-dd'))
    cursor = addDays(cursor, 1)
  }
  return days
}

function dayLabel(day: string): string {
  return format(parseISO(day), 'M/d（EEEEE）', { locale: zhTW })
}

export function buildWeightTrendPoints(
  measurements: BodyMeasurement[]
): { label: string; weight: number; key: string }[] {
  return measurements.map((m, idx, arr) => {
    const day = m.measured_at.slice(0, 10)
    const stamp = m.created_at ?? m.measured_at
    const baseLabel = format(parseISO(day), 'M/d')
    const sameDayCount = arr.filter(x => x.measured_at.slice(0, 10) === day).length
    const sameDayIndex = arr.slice(0, idx + 1).filter(x => x.measured_at.slice(0, 10) === day).length
    const label = sameDayCount > 1 ? `${baseLabel}·${sameDayIndex}` : baseLabel
    return {
      label,
      weight: m.weight_kg as number,
      key: `${day}|${stamp}|${m.weight_kg}|${idx}`,
    }
  })
}

export function buildAnalysisSummary(input: AnalysisInput): AnalysisSummary {
  const dateRange = resolveAnalysisDateRange(input.periodType, input.anchorDate)
  const allLogs = extractRecentFoodLogsFromCheckins(input.checkins)
  const logs = logsInRange(allLogs, dateRange)
  const periodCheckins = checkinsInRange(input.checkins, dateRange)
  const periodTrendMeasurements = buildPeriodWeightTrendMeasurements(
    input.measurements,
    dateRange,
    input.targets.start_weight_kg,
    input.targets.start_date,
    input.profileWeightKg,
    input.priorWeightKg
  )
  const days = enumerateDays(dateRange)

  const totalMeals = logs.length
  const insufficient_data = totalMeals < 3
  const insufficient_reason = insufficient_data ? '再記錄 3 餐，我就能幫你看出趨勢' : undefined

  const calTarget = input.targets.calories
  const proTarget = input.targets.protein_g
  const waterTarget = input.targets.water_ml

  const caloriePoints: DailyMetricPoint[] = days.map(day => {
    const v = sumLogsDay(logs, day)
    return {
      date: day,
      label: format(parseISO(day), 'M/d'),
      value: v.calories,
      metTarget: v.count > 0 && v.calories <= calTarget * 1.05 && v.calories >= calTarget * 0.85,
    }
  })

  const proteinPoints: DailyMetricPoint[] = days.map(day => {
    const v = sumLogsDay(logs, day)
    return {
      date: day,
      label: format(parseISO(day), 'M/d'),
      value: v.protein_g,
      metTarget: v.count > 0 && v.protein_g >= proTarget * 0.9,
    }
  })

  const loggedCalDays = caloriePoints.filter(p => p.value > 0)
  const avgCalories =
    loggedCalDays.length > 0
      ? Math.round(loggedCalDays.reduce((s, p) => s + p.value, 0) / loggedCalDays.length)
      : null
  const loggedProDays = proteinPoints.filter(p => p.value > 0)
  const avgProtein =
    loggedProDays.length > 0
      ? Math.round(loggedProDays.reduce((s, p) => s + p.value, 0) / loggedProDays.length)
      : null

  const weightPoints = buildWeightTrendPoints(periodTrendMeasurements)
  const currentKg = input.currentWeightKg ?? periodTrendMeasurements.at(-1)?.weight_kg ?? null
  const previousKg = resolvePreviousWeightKg(periodTrendMeasurements)
  const firstWeight = periodTrendMeasurements[0]?.weight_kg
  const deltaKg =
    currentKg != null && firstWeight != null && weightPoints.length >= 2
      ? Math.round((currentKg - firstWeight) * 10) / 10
      : null
  const deltaLabel =
    deltaKg != null
      ? `${input.periodType === 'week' ? '本週' : input.periodType === 'month' ? '本月' : '今日'} ${deltaKg > 0 ? '+' : ''}${deltaKg} kg`
      : null

  const totalCals = sumCountedCalories(logs)
  const totalPro = sumCountedProtein(logs)
  const totalCarbs = sumCountedCarbs(logs)
  const totalFat = sumCountedFat(logs)
  const macroDenom = totalPro * 4 + totalCarbs * 4 + totalFat * 9

  const bucketCals = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 }
  for (const log of logs) {
    if (!isFoodLogCountedTowardTotals(log)) continue
    bucketCals[mealBucket(log)] += log.calories ?? 0
  }
  const dinnerRatio = totalCals > 0 ? bucketCals.dinner / totalCals : null

  const dayScores = days
    .map(day => {
      const v = sumLogsDay(logs, day)
      if (v.count === 0) return null
      const calOk = v.calories <= calTarget * 1.05 && v.calories >= calTarget * 0.85
      const proOk = v.protein_g >= proTarget * 0.9
      const dinnerShare = v.calories > 0 ? (sumCountedCalories(logs.filter(l => l.logged_at.startsWith(day) && mealBucket(l) === 'dinner')) / v.calories) : 0
      const score =
        (calOk ? 2 : 0) +
        (proOk ? 2 : 0) +
        (dinnerShare <= 0.42 ? 1 : 0) -
        (v.calories > calTarget * 1.1 ? 2 : 0) -
        (v.protein_g < proTarget * 0.7 ? 1 : 0)
      const issues: string[] = []
      if (v.calories > calTarget * 1.05) issues.push(`熱量超標 ${Math.round(v.calories - calTarget)} kcal`)
      if (v.protein_g < proTarget * 0.85) issues.push(`蛋白質不足 ${Math.round(proTarget - v.protein_g)}g`)
      if (dinnerShare > 0.48) issues.push('晚餐熱量過高')
      const tags: string[] = []
      if (proOk) tags.push('蛋白質達標')
      if (calOk) tags.push('飲食均衡')
      return { day, v, score, issues, tags }
    })
    .filter(Boolean) as Array<{
    day: string
    v: ReturnType<typeof sumLogsDay>
    score: number
    issues: string[]
    tags: string[]
  }>

  let exerciseBurn: number | null = null
  if (input.dayPlansByDate) {
    let burn = 0
    for (const c of periodCheckins) {
      const done = c.workout_items?.some(w => w.completed)
      if (!done) continue
      burn += input.dayPlansByDate[c.checkin_date]?.calories_burned_est ?? 0
    }
    exerciseBurn = burn > 0 ? burn : null
  }

  const waterDays = periodCheckins.filter(c => (c.water_ml ?? 0) >= waterTarget * 0.9)
  const overTargetDays = caloriePoints.filter(p => p.value > calTarget * 1.05).length

  const insights: AnalysisInsight[] = []
  const nextWeekSuggestions: string[] = []

  if (!insufficient_data && avgCalories != null) {
    const calDelta = avgCalories - calTarget
    if (calDelta <= 0) {
      insights.push({
        tone: 'success',
        title: '熱量控制不錯！',
        body: `${input.periodType === 'week' ? '本週' : '這段期間'}平均熱量 ${avgCalories} kcal，比目標少 ${Math.abs(calDelta)} kcal，保持得很好。`,
      })
    } else {
      insights.push({
        tone: 'warning',
        title: '熱量略高',
        body: `平均熱量 ${avgCalories} kcal，比目標多 ${calDelta} kcal，下週可以稍微收一點份量。`,
      })
    }
  }

  const lowProDays = proteinPoints.filter(p => p.value > 0 && !p.metTarget)
  if (!insufficient_data && lowProDays.length > 0) {
    const dates = lowProDays.map(p => format(parseISO(p.date), 'M/d')).join('、')
    insights.push({
      tone: 'warning',
      title: `蛋白質有 ${lowProDays.length} 天不足`,
      body: `${dates} 蛋白質攝取不足，可能影響肌肉保留與飽足感。`,
    })
    nextWeekSuggestions.push('午餐增加 25~30g 蛋白質，例如：雞胸肉、豆腐、鮭魚')
  }

  if (!insufficient_data && dinnerRatio != null && dinnerRatio > 0.42) {
    insights.push({
      tone: 'warning',
      title: '晚餐熱量偏高',
      body: `晚餐平均佔每日熱量的 ${Math.round(dinnerRatio * 100)}%，建議把部分熱量分配到午餐。`,
    })
    nextWeekSuggestions.push('晚餐減少油炸與澱粉，選擇原型食物，減少精緻澱粉')
  }

  if (nextWeekSuggestions.length < 3) {
    nextWeekSuggestions.push('睡前 3 小時內避免進食，有助於睡眠與脂肪代謝')
  }

  const sugarDrinkCount = logs.filter(l => SUGAR_DRINK.test(l.name)).length
  const fiberLogs = logs.filter(l => HIGH_FIBER.test(l.name)).length
  const fiberGapScore = logs.length > 0 ? fiberLogs / logs.length : null

  const proteinGapAvg =
    avgProtein != null ? Math.max(0, proTarget - avgProtein) : null
  const fatRatioAvg = macroDenom > 0 ? totalFat * 9 / macroDenom : null

  const best = dayScores.length ? [...dayScores].sort((a, b) => b.score - a.score)[0]! : null
  const worst = dayScores.length ? [...dayScores].sort((a, b) => a.score - b.score)[0]! : null

  const proteinMetDays = proteinPoints.filter(p => p.metTarget).length
  const dinnerUnder600Days = days.filter(day => {
    const dinnerKcal = sumCountedCalories(
      logs.filter(l => l.logged_at.startsWith(day) && mealBucket(l) === 'dinner')
    )
    return dinnerKcal > 0 && dinnerKcal <= 600
  }).length
  const workoutSessions = periodCheckins.filter(c => c.workout_items?.some(w => w.completed)).length

  const todayKey = input.todayDate ?? format(input.anchorDate, 'yyyy-MM-dd')
  const pastDaysInPeriod = days.filter(d => d <= todayKey).length
  const requiredWaterDays = Math.min(5, Math.max(1, pastDaysInPeriod))

  const nextActions: NextActionItem[] = [
    {
      id: 'protein-5',
      label: '本週蛋白質達標 5 天以上',
      done: proteinMetDays >= 5,
    },
    {
      id: 'dinner-600',
      label: '晚餐熱量控制在 600 kcal 內',
      done: dinnerUnder600Days >= Math.min(5, days.length),
    },
    {
      id: 'water-2000',
      label: `每天喝水 ${waterTarget}ml`,
      done: waterDays.length >= requiredWaterDays,
    },
    {
      id: 'workout-3',
      label: '每週運動 3 次以上',
      done: workoutSessions >= 3,
    },
  ]

  return {
    periodType: input.periodType,
    dateRange,
    insufficient_data,
    insufficient_reason,
    weightTrend: {
      sufficient: weightPoints.length >= 2,
      currentKg,
      previousKg,
      targetKg: input.targets.target_weight_kg,
      deltaKg,
      deltaLabel,
      points: weightPoints,
    },
    calorieTrend: {
      sufficient: loggedCalDays.length >= 2,
      average: avgCalories,
      target: calTarget,
      deltaFromTarget: avgCalories != null ? avgCalories - calTarget : null,
      metDays: caloriePoints.filter(p => p.metTarget).length,
      totalDays: days.length,
      points: caloriePoints,
    },
    proteinTrend: {
      sufficient: loggedProDays.length >= 2,
      average: avgProtein,
      target: proTarget,
      deltaFromTarget: avgProtein != null ? avgProtein - proTarget : null,
      metDays: proteinPoints.filter(p => p.metTarget).length,
      totalDays: days.length,
      points: proteinPoints,
    },
    macroRatio: {
      sufficient: macroDenom > 0,
      proteinPct: macroDenom > 0 ? Math.round((totalPro * 4 * 100) / macroDenom) : 0,
      carbsPct: macroDenom > 0 ? Math.round((totalCarbs * 4 * 100) / macroDenom) : 0,
      fatPct: macroDenom > 0 ? Math.round((totalFat * 9 * 100) / macroDenom) : 0,
    },
    calorieDistribution: {
      sufficient: totalCals > 0,
      breakfastPct: totalCals > 0 ? Math.round((bucketCals.breakfast / totalCals) * 100) : 0,
      lunchPct: totalCals > 0 ? Math.round((bucketCals.lunch / totalCals) * 100) : 0,
      dinnerPct: totalCals > 0 ? Math.round((bucketCals.dinner / totalCals) * 100) : 0,
      snackPct: totalCals > 0 ? Math.round((bucketCals.snack / totalCals) * 100) : 0,
      breakfastKcal: bucketCals.breakfast,
      lunchKcal: bucketCals.lunch,
      dinnerKcal: bucketCals.dinner,
      snackKcal: bucketCals.snack,
      insight:
        dinnerRatio != null && dinnerRatio > 0.42
          ? '晚餐熱量偏高，建議調整份量或選擇低熱量食材。'
          : null,
    },
    insights,
    nextWeekSuggestions: [...new Set(nextWeekSuggestions)].slice(0, 3),
    dietRecordSummary: {
      sufficient: totalMeals > 0,
      totalMeals,
      avgCaloriesPerMeal: totalMeals > 0 ? Math.round(totalCals / totalMeals) : null,
      overTargetDays,
      exerciseBurnKcal: exerciseBurn,
      waterMetDays: waterDays.length,
      waterTotalDays: periodCheckins.filter(c => (c.water_ml ?? 0) > 0).length || days.length,
    },
    bestDay: best
      ? {
          date: best.day,
          label: dayLabel(best.day),
          calories: best.v.calories,
          protein_g: best.v.protein_g,
          tags: best.tags,
        }
      : null,
    needsAttentionDay: worst && worst.score < (best?.score ?? 0)
      ? {
          date: worst.day,
          label: dayLabel(worst.day),
          calories: worst.v.calories,
          protein_g: worst.v.protein_g,
          tags: [],
          issues: worst.issues,
        }
      : null,
    nextActions,
    dinnerCaloriesRatio: dinnerRatio,
    proteinGapAvg,
    fatRatioAvg,
    sugarDrinkCount,
    fiberGapScore,
  }
}
