import type { FoodLogEntry } from '@/lib/banks/types'
import type { AdherenceEvent } from './adherence-types'

const SOCIAL = /火鍋|麻辣鍋|涮涮鍋|蛋糕|生日蛋糕|啤酒|燒烤|BBQ|串燒|居酒屋|婚禮|喜酒|聚餐|吃到飽|buffet|和牛|燒肉/i
const STRESS = /珍奶|手搖|奶茶|雞排|鹽酥雞|炸雞|咔啦|薯條|泡麵|巧克力|甜甜圈|可樂|含糖/i
const TRAVEL = /機場|高鐵|車站|便利商店|7-11|全家|Lawson|出國|飯店|民宿/i
const SICK = /粥|白粥|清粥|藥膳|燉湯|感冒|退燒/i

function logHour(log: FoodLogEntry): number {
  try {
    return new Date(log.logged_at).getHours()
  } catch {
    return 12
  }
}

function names(logs: FoodLogEntry[]): string {
  return logs.map(l => l.name).join(' ')
}

export function detectSocialEvent(logs: FoodLogEntry[]): boolean {
  const text = names(logs)
  if (SOCIAL.test(text)) return true
  const bigMeal = logs.some(l => l.calories >= 900)
  const multiHeavy = logs.filter(l => l.calories >= 550).length >= 2
  return bigMeal && multiHeavy
}

export function detectSleepDebt(logs: FoodLogEntry[], schedule?: string): boolean {
  const late = logs.filter(l => {
    const h = logHour(l)
    return l.slot === 'before_sleep' || (h >= 0 && h < 5) || h >= 23
  })
  if (late.length >= 2) return true
  if (schedule === 'shift' && logs.some(l => logHour(l) >= 1 && logHour(l) < 6)) return true
  return false
}

export function detectStressEating(
  recentLogs: FoodLogEntry[],
  workoutDone: number,
  workoutTotal: number
): boolean {
  const text = names(recentLogs.slice(-12))
  const stressHits = (text.match(new RegExp(STRESS.source, 'gi')) ?? []).length
  const lowActivity = workoutTotal > 0 && workoutDone === 0
  return stressHits >= 2 || (stressHits >= 1 && lowActivity)
}

export function detectTravel(logs: FoodLogEntry[], recentLogs: FoodLogEntry[]): boolean {
  const stores = new Set(recentLogs.map(l => l.store).filter(Boolean))
  const newStores = logs.filter(l => l.store && !stores.has(l.store))
  const text = names([...logs, ...recentLogs.slice(-6)])
  return TRAVEL.test(text) || newStores.length >= 2
}

export function detectSick(logs: FoodLogEntry[]): boolean {
  return SICK.test(names(logs)) || (logs.every(l => l.calories < 450) && logs.length >= 2)
}

export function detectRecovery(ctx: {
  recentMissedDays: number
  todayLoggedKcal: number
  todayTargetKcal: number
  daysSinceLastLog?: number
}): boolean {
  if (ctx.daysSinceLastLog != null && ctx.daysSinceLastLog >= 3) return true
  if (ctx.recentMissedDays >= 3) return true
  if (ctx.recentMissedDays >= 2 && ctx.todayLoggedKcal < ctx.todayTargetKcal * 0.35) return true
  return false
}

export function detectPlateau(ctx: {
  isWeightPlateau?: boolean
  recentLogs: FoodLogEntry[]
  todayTargetKcal: number
}): boolean {
  if (ctx.isWeightPlateau) return true
  const byDay = groupLogsByDay(ctx.recentLogs)
  const days = [...byDay.values()].slice(-14)
  if (days.length < 7) return false
  const onTarget = days.filter(dayLogs => {
    const kcal = dayLogs.reduce((s, l) => s + l.calories, 0)
    return kcal >= ctx.todayTargetKcal * 0.75 && kcal <= ctx.todayTargetKcal * 1.2
  })
  return onTarget.length >= Math.min(10, days.length - 2)
}

function groupLogsByDay(logs: FoodLogEntry[]): Map<string, FoodLogEntry[]> {
  const m = new Map<string, FoodLogEntry[]>()
  for (const l of logs) {
    const day = l.logged_at.slice(0, 10)
    const list = m.get(day) ?? []
    list.push(l)
    m.set(day, list)
  }
  return m
}

export function inferAdherenceEvents(ctx: {
  workSchedule?: 'standard' | 'shift'
  todayLogs: FoodLogEntry[]
  recentLogs: FoodLogEntry[]
  todayTargetKcal: number
  todayLoggedKcal: number
  recentMissedDays: number
  workoutDone: number
  workoutTotal: number
  isWeightPlateau?: boolean
  daysSinceLastLog?: number
}): AdherenceEvent[] {
  const events: AdherenceEvent[] = []
  const allRecent = [...ctx.recentLogs, ...ctx.todayLogs]

  if (ctx.workSchedule === 'shift' || detectSleepDebt(ctx.todayLogs, ctx.workSchedule)) {
    events.push('night_shift')
  }
  if (detectSocialEvent(ctx.todayLogs) || ctx.todayLoggedKcal > ctx.todayTargetKcal * 1.22) {
    events.push('social_event')
  }
  if (detectSleepDebt(allRecent, ctx.workSchedule)) events.push('sleep_debt')
  if (detectStressEating(allRecent, ctx.workoutDone, ctx.workoutTotal)) events.push('stress_eating')
  if (detectTravel(ctx.todayLogs, ctx.recentLogs)) events.push('travel')
  if (detectSick(ctx.todayLogs)) events.push('sick_signal')
  if (detectRecovery(ctx)) events.push('recovery')
  if (
    detectPlateau({
      isWeightPlateau: ctx.isWeightPlateau,
      recentLogs: allRecent,
      todayTargetKcal: ctx.todayTargetKcal,
    })
  ) {
    events.push('plateau')
  }

  return [...new Set(events)]
}

export function toLegacyInferred(events: AdherenceEvent[]): import('./event-engine').InferredEvent[] {
  const out: import('./event-engine').InferredEvent[] = []
  if (events.includes('social_event')) out.push('overeat_today')
  if (events.includes('plateau')) out.push('plateau')
  if (events.includes('recovery')) out.push('missing_days')
  if (events.includes('stress_eating')) out.push('stress_week')
  if (events.includes('night_shift') || events.includes('sleep_debt')) out.push('night_shift')
  if (events.includes('travel')) out.push('travel_pattern')
  if (events.includes('sick_signal')) out.push('sick_signal')
  return [...new Set(out)]
}
