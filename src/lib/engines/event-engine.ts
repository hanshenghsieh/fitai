/** Phase 5 — 隱形事件引擎，無按鈕無模式 */

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
}

export function inferEvents(ctx: EventContext): InferredEvent[] {
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
