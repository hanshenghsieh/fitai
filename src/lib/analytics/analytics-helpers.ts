import { addDays, format, parseISO } from 'date-fns'
import type { FoodLogEntry } from '@/lib/banks/types'
import { extractRecentFoodLogsFromCheckins } from '@/lib/food-memory'
import { HIGH_FIBER_PATTERN, SUGAR_DRINK_PATTERN } from './week-constants'
import type { AnalysisCheckinRow } from './analysis-summary'

export function mealBucket(log: FoodLogEntry): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
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

export function enumerateDaysInRange(start: string, end: string): string[] {
  const days: string[] = []
  let cursor = parseISO(start)
  const endDate = parseISO(end)
  while (cursor <= endDate) {
    days.push(format(cursor, 'yyyy-MM-dd'))
    cursor = addDays(cursor, 1)
  }
  return days
}

export interface DayFacts {
  date: string
  hasLogs: boolean
  calories: number
  protein_g: number
  fat_g: number
  dinnerCalories: number
  veggieHits: number
  sugarDrinkCount: number
  water_ml: number
  workoutDone: boolean
  mealCount: number
}

export function buildDayFacts(
  day: string,
  logs: FoodLogEntry[],
  checkin: AnalysisCheckinRow | undefined
): DayFacts {
  const dayLogs = logs.filter(l => l.logged_at.slice(0, 10) === day)
  const dinnerCalories = dayLogs
    .filter(l => mealBucket(l) === 'dinner')
    .reduce((s, l) => s + l.calories, 0)
  return {
    date: day,
    hasLogs: dayLogs.length > 0,
    calories: dayLogs.reduce((s, l) => s + l.calories, 0),
    protein_g: dayLogs.reduce((s, l) => s + l.protein_g, 0),
    fat_g: dayLogs.reduce((s, l) => s + (l.fat_g ?? 0), 0),
    dinnerCalories,
    veggieHits: dayLogs.filter(l => HIGH_FIBER_PATTERN.test(l.name)).length,
    sugarDrinkCount: dayLogs.filter(l => SUGAR_DRINK_PATTERN.test(l.name)).length,
    water_ml: checkin?.water_ml ?? 0,
    workoutDone: checkin?.workout_items?.some(w => w.completed) ?? false,
    mealCount: dayLogs.length,
  }
}

export function logsForWeek(
  checkins: AnalysisCheckinRow[],
  start: string,
  end: string
): FoodLogEntry[] {
  const all = extractRecentFoodLogsFromCheckins(checkins)
  return all.filter(l => {
    const d = l.logged_at.slice(0, 10)
    return d >= start && d <= end
  })
}

export function checkinMap(checkins: AnalysisCheckinRow[]): Map<string, AnalysisCheckinRow> {
  return new Map(checkins.map(c => [c.checkin_date, c]))
}
