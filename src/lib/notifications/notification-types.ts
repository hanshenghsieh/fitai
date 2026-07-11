/**
 * BetterBit Push Notification Engine v1 — shared types.
 * No DB schema; callers pass state + optional sent history.
 */

export type NotificationCategory =
  | 'breakfast_reminder'
  | 'lunch_reminder'
  | 'dinner_reminder'
  | 'water_reminder'
  | 'protein_reminder'
  | 'workout_reminder'
  | 'encouragement'
  | 'over_target_comfort'
  | 'target_hit'
  | 'ai_coach_insight'

export type NotificationTimeSlot =
  | 'morning'
  | 'pre_lunch'
  | 'afternoon'
  | 'pre_dinner'
  | 'bedtime'

export type NotificationPriority = 'low' | 'normal' | 'high'

export type WeightTrendHint = 'down' | 'up' | 'stable' | 'unknown'

export interface NotificationCopyEntry {
  id: string
  category: NotificationCategory
  title: string
  body: string
  cooldown_days: number
  min_interval_hours: number
}

export interface NotificationPayload {
  title: string
  body: string
  category: NotificationCategory
  priority: NotificationPriority
  trigger_reason: string
  cooldown_days: number
  min_interval_hours: number
  copy_id: string
  time_slot: NotificationTimeSlot
}

export interface NotificationSentRecord {
  copy_id: string
  category: NotificationCategory
  sent_at: string
}

export interface TodayNotificationState {
  caloriesLogged: number
  caloriesTarget: number
  caloriesRemaining: number
  proteinLogged: number
  proteinTarget: number
  proteinGap: number
  proteinMet: boolean
  hasLoggedAnyMeal: boolean
  hasLoggedBreakfast: boolean
  hasLoggedLunch: boolean
  hasLoggedDinner: boolean
  overTarget: boolean
  onTarget: boolean
  waterMl: number
  waterTargetMl: number
}

export interface WeekAnalysisHints {
  weeklyProteinLow: boolean
  dinnerCaloriesHigh: boolean
  workoutInsufficient: boolean
  waterLow: boolean
  weightTrend: WeightTrendHint
  coachInsightLines: string[]
}

export interface NotificationEngineInput {
  userId: string
  now: Date
  timezoneOffsetMinutes?: number
  today: TodayNotificationState
  week: WeekAnalysisHints
  sentHistory: NotificationSentRecord[]
  /** Already planned/sent today (engine output or delivery log) */
  sentToday?: NotificationPayload[]
  /** When true, skip Firebase and return payloads only */
  dryRun?: boolean
  /** Limit to a single cron slot (legacy cron compatibility) */
  legacyCronType?: LegacyCronNotificationType
}

export type LegacyCronNotificationType =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'workout'
  | 'reminder'
  | 'daily_summary'

export interface NotificationEngineResult {
  notifications: NotificationPayload[]
  skipped: { reason: string; category?: NotificationCategory }[]
  dryRun: boolean
}

export const MAX_NOTIFICATIONS_PER_DAY = 5
export const COPY_COOLDOWN_DAYS = 90
export const MAX_CONSECUTIVE_SAME_CATEGORY = 2
export const QUIET_HOUR_START = 23
export const QUIET_HOUR_END = 7

export const CATEGORY_TIME_SLOTS: Record<NotificationCategory, NotificationTimeSlot[]> = {
  breakfast_reminder: ['morning'],
  lunch_reminder: ['pre_lunch'],
  dinner_reminder: ['pre_dinner'],
  water_reminder: ['afternoon', 'pre_dinner', 'bedtime'],
  protein_reminder: ['pre_lunch', 'pre_dinner'],
  workout_reminder: ['afternoon', 'pre_dinner'],
  encouragement: ['morning', 'afternoon', 'bedtime'],
  over_target_comfort: ['afternoon', 'pre_dinner', 'bedtime'],
  target_hit: ['afternoon', 'bedtime'],
  ai_coach_insight: ['morning', 'afternoon', 'pre_dinner', 'bedtime'],
}

export const SLOT_HOUR_RANGES: Record<NotificationTimeSlot, [number, number]> = {
  morning: [7, 9],
  pre_lunch: [11, 12],
  afternoon: [14, 17],
  pre_dinner: [17, 19],
  bedtime: [20, 22],
}
