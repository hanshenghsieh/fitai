import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import type { FoodLogEntry } from '@/lib/banks/types'
import { mealBucket } from '@/lib/analytics/analytics-helpers'
import { extractRecentFoodLogsFromCheckins } from '@/lib/food-memory'
import type { AnalysisDayPlanHint } from '@/lib/analytics/analysis-summary'
import {
  calculateDailyFoodScore,
  type DailyScoreStatus,
  type DailyScoreTone,
} from '@/lib/record/daily-food-score'

const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六'] as const

export type RecordMealBucket = 'breakfast' | 'lunch' | 'snack' | 'dinner'

export interface RecordCheckinRow {
  checkin_date: string
  notes?: string | null
}

export interface RecordDayTargets {
  calories: number
  protein_g: number
}

export interface RecordWeekCard {
  date: string
  weekdayLabel: string
  score: number | null
  status: DailyScoreStatus
  tone: DailyScoreTone
  isToday: boolean
  isFuture: boolean
}

export interface RecordMealGroup {
  bucket: RecordMealBucket
  label: string
  logs: FoodLogEntry[]
  totalKcal: number
  timeLabel: string | null
  photoUrl: string | null
}

export interface RecordDaySummary {
  totalKcal: number
  targetKcal: number
  mealCount: number
  mealTarget: number
  proteinG: number
  proteinTarget: number
  score: number | null
  status: DailyScoreStatus
  tone: DailyScoreTone
}

export interface RecordDayView {
  date: string
  isFuture: boolean
  isEmpty: boolean
  summary: RecordDaySummary
  meals: RecordMealGroup[]
}

const MEAL_ORDER: RecordMealBucket[] = ['breakfast', 'lunch', 'snack', 'dinner']

const MEAL_LABELS: Record<RecordMealBucket, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  snack: '點心',
  dinner: '晚餐',
}

export function formatRecordDateLabel(dateStr: string): string {
  const d = parseISO(dateStr)
  const w = WEEKDAY_ZH[d.getDay()]
  return `${format(d, 'yyyy年 M月d日')} 週${w}`
}

export function weekdayLabelZh(dateStr: string): string {
  return WEEKDAY_ZH[parseISO(dateStr).getDay()]
}

function resolveTargets(
  date: string,
  dayPlansByDate: Record<string, AnalysisDayPlanHint>,
  fallback: RecordDayTargets
): RecordDayTargets {
  const plan = dayPlansByDate[date]?.daily_targets
  if (plan?.calories) {
    return { calories: plan.calories, protein_g: plan.protein_g ?? fallback.protein_g }
  }
  return fallback
}

function formatMealTime(logs: FoodLogEntry[]): string | null {
  if (!logs.length) return null
  const sorted = [...logs].sort((a, b) => a.logged_at.localeCompare(b.logged_at))
  try {
    return format(parseISO(sorted[0].logged_at), 'HH:mm')
  } catch {
    return null
  }
}

function pickMealPhoto(logs: FoodLogEntry[]): string | null {
  for (const log of logs) {
    if (log.photo_data_url) return log.photo_data_url
  }
  return null
}

export function buildMealGroups(dayLogs: FoodLogEntry[]): RecordMealGroup[] {
  const grouped = new Map<RecordMealBucket, FoodLogEntry[]>()
  for (const bucket of MEAL_ORDER) grouped.set(bucket, [])
  for (const log of dayLogs) {
    const bucket = mealBucket(log) as RecordMealBucket
    grouped.get(bucket)?.push(log)
  }

  return MEAL_ORDER.map(bucket => {
    const logs = (grouped.get(bucket) ?? []).sort((a, b) => a.logged_at.localeCompare(b.logged_at))
    return {
      bucket,
      label: MEAL_LABELS[bucket],
      logs,
      totalKcal: logs.reduce((s, l) => s + l.calories, 0),
      timeLabel: formatMealTime(logs),
      photoUrl: pickMealPhoto(logs),
    }
  })
}

export function buildRecordWeekCards(
  anchorDate: string,
  todayStr: string,
  allLogs: FoodLogEntry[],
  dayPlansByDate: Record<string, AnalysisDayPlanHint>,
  fallbackTargets: RecordDayTargets,
  calorieBankEnabled: boolean
): RecordWeekCard[] {
  const weekStart = startOfWeek(parseISO(anchorDate), { weekStartsOn: 1 })
  const cards: RecordWeekCard[] = []

  for (let i = 0; i < 7; i++) {
    const date = format(addDays(weekStart, i), 'yyyy-MM-dd')
    const isFuture = date > todayStr
    const dayLogs = allLogs.filter(l => l.logged_at.slice(0, 10) === date)
    const targets = resolveTargets(date, dayPlansByDate, fallbackTargets)
    const scored = calculateDailyFoodScore({
      dayLogs,
      dailyTargets: targets,
      calorieBankState: { enabled: calorieBankEnabled },
    })

    cards.push({
      date,
      weekdayLabel: weekdayLabelZh(date),
      score: isFuture ? null : scored.score,
      status: isFuture ? '尚未記錄' : scored.status,
      tone: isFuture ? 'empty' : scored.tone,
      isToday: date === todayStr,
      isFuture,
    })
  }

  return cards
}

export function buildRecordDayView(
  date: string,
  todayStr: string,
  allLogs: FoodLogEntry[],
  dayPlansByDate: Record<string, AnalysisDayPlanHint>,
  fallbackTargets: RecordDayTargets,
  calorieBankEnabled: boolean,
  mealTarget = 3
): RecordDayView {
  const isFuture = date > todayStr
  const dayLogs = isFuture ? [] : allLogs.filter(l => l.logged_at.slice(0, 10) === date)
  const targets = resolveTargets(date, dayPlansByDate, fallbackTargets)
  const scored = calculateDailyFoodScore({
    dayLogs,
    dailyTargets: targets,
    calorieBankState: { enabled: calorieBankEnabled },
  })

  const mealGroups = buildMealGroups(dayLogs)
  const mealCount = mealGroups.filter(m => m.logs.length > 0).length

  return {
    date,
    isFuture,
    isEmpty: !isFuture && dayLogs.length === 0,
    summary: {
      totalKcal: dayLogs.reduce((s, l) => s + l.calories, 0),
      targetKcal: targets.calories,
      mealCount,
      mealTarget,
      proteinG: Math.round(dayLogs.reduce((s, l) => s + l.protein_g, 0)),
      proteinTarget: targets.protein_g,
      score: scored.score,
      status: scored.status,
      tone: scored.tone,
    },
    meals: mealGroups,
  }
}

export function extractAllFoodLogs(checkins: RecordCheckinRow[]): FoodLogEntry[] {
  return extractRecentFoodLogsFromCheckins(checkins)
}
