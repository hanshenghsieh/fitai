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

export type AnalysisPeriodType = 'day' | 'week' | 'month'

export interface AnalysisTargets {
  calories: number
  protein_g: number
  water_ml: number
  target_weight_kg: number | null
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
  measurements: BodyMeasurement[]
  checkins: AnalysisCheckinRow[]
  targets: AnalysisTargets
  dayPlansByDate?: Record<string, AnalysisDayPlanHint>
  currentWeightKg?: number | null
}

export interface DateRange {
  start: string
  end: string
  label: string
}

export interface WeightTrendSummary {
  sufficient: boolean
  currentKg: number | null
  targetKg: number | null
  deltaKg: number | null
  deltaLabel: string | null
  points: { label: string; weight: number }[]
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

function sumLogsDay(logs: FoodLogEntry[], day: string) {
  const dayLogs = logs.filter(l => l.logged_at.slice(0, 10) === day)
  return {
    calories: dayLogs.reduce((s, l) => s + l.calories, 0),
    protein_g: dayLogs.reduce((s, l) => s + l.protein_g, 0),
    carbs_g: dayLogs.reduce((s, l) => s + (l.carbs_g ?? 0), 0),
    fat_g: dayLogs.reduce((s, l) => s + (l.fat_g ?? 0), 0),
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

export function buildAnalysisSummary(input: AnalysisInput): AnalysisSummary {
  const dateRange = resolveAnalysisDateRange(input.periodType, input.anchorDate)
  const allLogs = extractRecentFoodLogsFromCheckins(input.checkins)
  const logs = logsInRange(allLogs, dateRange)
  const periodCheckins = checkinsInRange(input.checkins, dateRange)
  const periodMeasurements = measurementsInRange(input.measurements, dateRange)
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

  const weightPoints = periodMeasurements.map(m => ({
    label: format(parseISO(m.measured_at.slice(0, 10)), 'M/d'),
    weight: m.weight_kg,
  }))
  const currentKg = input.currentWeightKg ?? periodMeasurements.at(-1)?.weight_kg ?? null
  const firstWeight = periodMeasurements[0]?.weight_kg
  const deltaKg =
    currentKg != null && firstWeight != null && periodMeasurements.length >= 2
      ? Math.round((currentKg - firstWeight) * 10) / 10
      : null
  const deltaLabel =
    deltaKg != null
      ? `${input.periodType === 'week' ? '本週' : input.periodType === 'month' ? '本月' : '今日'} ${deltaKg > 0 ? '+' : ''}${deltaKg} kg`
      : null

  const totalCals = logs.reduce((s, l) => s + l.calories, 0)
  const totalPro = logs.reduce((s, l) => s + l.protein_g, 0)
  const totalCarbs = logs.reduce((s, l) => s + (l.carbs_g ?? 0), 0)
  const totalFat = logs.reduce((s, l) => s + (l.fat_g ?? 0), 0)
  const macroDenom = totalPro * 4 + totalCarbs * 4 + totalFat * 9

  const bucketCals = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 }
  for (const log of logs) {
    bucketCals[mealBucket(log)] += log.calories
  }
  const dinnerRatio = totalCals > 0 ? bucketCals.dinner / totalCals : null

  const dayScores = days
    .map(day => {
      const v = sumLogsDay(logs, day)
      if (v.count === 0) return null
      const calOk = v.calories <= calTarget * 1.05 && v.calories >= calTarget * 0.85
      const proOk = v.protein_g >= proTarget * 0.9
      const dinnerShare = v.calories > 0 ? (logs.filter(l => l.logged_at.startsWith(day) && mealBucket(l) === 'dinner').reduce((s, l) => s + l.calories, 0) / v.calories) : 0
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
    const dinnerKcal = logs
      .filter(l => l.logged_at.startsWith(day) && mealBucket(l) === 'dinner')
      .reduce((s, l) => s + l.calories, 0)
    return dinnerKcal > 0 && dinnerKcal <= 600
  }).length
  const workoutSessions = periodCheckins.filter(c => c.workout_items?.some(w => w.completed)).length

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
      done: waterDays.length >= Math.min(5, days.length),
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
