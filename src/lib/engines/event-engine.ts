/** Phase 5/7 — 隱形事件引擎，無按鈕無模式 */

import type { FoodLogEntry } from '@/lib/banks/types'
import { inferAdherenceEvents, toLegacyInferred } from './adherence-detect'

export type InferredEvent =
  | 'night_shift'
  | 'travel_pattern'
  | 'overeat_today'
  | 'stress_week'
  | 'sick_signal'
  | 'plateau'
  | 'missing_days'

export interface EventContext {
  workSchedule?: 'standard' | 'shift'
  todayLoggedKcal: number
  todayTargetKcal: number
  recentMissedDays: number
  isWeightPlateau: boolean
  highCalorieSnacksToday: number
  todayLogs?: FoodLogEntry[]
  recentLogs?: FoodLogEntry[]
  workoutDone?: number
  workoutTotal?: number
  daysSinceLastLog?: number
}

export function inferEvents(ctx: EventContext): InferredEvent[] {
  if (ctx.todayLogs?.length || ctx.recentLogs?.length) {
    const adherence = inferAdherenceEvents({
      workSchedule: ctx.workSchedule,
      todayLogs: ctx.todayLogs ?? [],
      recentLogs: ctx.recentLogs ?? [],
      todayTargetKcal: ctx.todayTargetKcal,
      todayLoggedKcal: ctx.todayLoggedKcal,
      recentMissedDays: ctx.recentMissedDays,
      workoutDone: ctx.workoutDone ?? 0,
      workoutTotal: ctx.workoutTotal ?? 0,
      isWeightPlateau: ctx.isWeightPlateau,
      daysSinceLastLog: ctx.daysSinceLastLog,
    })
    const legacy = toLegacyInferred(adherence)
    if (legacy.length) return legacy
  }

  const events: InferredEvent[] = []
  if (ctx.workSchedule === 'shift') events.push('night_shift')
  if (ctx.todayLoggedKcal > ctx.todayTargetKcal * 1.25) events.push('overeat_today')
  if (ctx.recentMissedDays >= 2) events.push('missing_days')
  if (ctx.isWeightPlateau) events.push('plateau')
  if (ctx.recentMissedDays >= 1 && ctx.todayLoggedKcal < ctx.todayTargetKcal * 0.4) {
    events.push('stress_week')
  }
  if (ctx.highCalorieSnacksToday >= 2) events.push('overeat_today')
  return events
}

export function eventAffectsCorrection(events: InferredEvent[]): boolean {
  return events.length > 0
}
