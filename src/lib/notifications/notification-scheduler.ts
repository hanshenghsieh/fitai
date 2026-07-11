import {
  CATEGORY_TIME_SLOTS,
  QUIET_HOUR_END,
  QUIET_HOUR_START,
  SLOT_HOUR_RANGES,
  type LegacyCronNotificationType,
  type NotificationCategory,
  type NotificationTimeSlot,
} from './notification-types'

export function getLocalHour(now: Date, timezoneOffsetMinutes?: number): number {
  if (timezoneOffsetMinutes === undefined) {
    return now.getHours()
  }
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000
  const shifted = new Date(utcMs + timezoneOffsetMinutes * 60_000)
  return shifted.getUTCHours()
}

export function getLocalMinute(now: Date, timezoneOffsetMinutes?: number): number {
  if (timezoneOffsetMinutes === undefined) {
    return now.getMinutes()
  }
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000
  const shifted = new Date(utcMs + timezoneOffsetMinutes * 60_000)
  return shifted.getUTCMinutes()
}

export function isQuietHour(now: Date, timezoneOffsetMinutes?: number): boolean {
  const hour = getLocalHour(now, timezoneOffsetMinutes)
  return hour >= QUIET_HOUR_START || hour < QUIET_HOUR_END
}

export function resolveActiveTimeSlot(
  now: Date,
  timezoneOffsetMinutes?: number
): NotificationTimeSlot | null {
  const hour = getLocalHour(now, timezoneOffsetMinutes)
  for (const [slot, [start, end]] of Object.entries(SLOT_HOUR_RANGES) as [
    NotificationTimeSlot,
    [number, number],
  ][]) {
    if (hour >= start && hour <= end) return slot
  }
  return null
}

export function categoriesForTimeSlot(slot: NotificationTimeSlot): NotificationCategory[] {
  return (Object.entries(CATEGORY_TIME_SLOTS) as [NotificationCategory, NotificationTimeSlot[]][])
    .filter(([, slots]) => slots.includes(slot))
    .map(([category]) => category)
}

export function legacyCronTypeToSlot(
  type: LegacyCronNotificationType
): NotificationTimeSlot | null {
  switch (type) {
    case 'breakfast':
      return 'morning'
    case 'lunch':
      return 'pre_lunch'
    case 'dinner':
      return 'pre_dinner'
    case 'workout':
      return 'afternoon'
    case 'reminder':
    case 'daily_summary':
      return 'bedtime'
    default:
      return null
  }
}

export function legacyCronTypeToPreferredCategories(
  type: LegacyCronNotificationType
): NotificationCategory[] {
  switch (type) {
    case 'breakfast':
      return ['breakfast_reminder', 'encouragement']
    case 'lunch':
      return ['lunch_reminder', 'protein_reminder']
    case 'dinner':
      return ['dinner_reminder', 'protein_reminder']
    case 'workout':
      return ['workout_reminder']
    case 'reminder':
      return ['encouragement', 'water_reminder', 'target_hit']
    case 'daily_summary':
      return ['target_hit', 'encouragement', 'ai_coach_insight']
    default:
      return ['encouragement']
  }
}

export function isWithinCronTolerance(
  now: Date,
  targetHour: number,
  targetMinute: number,
  toleranceMinutes = 5,
  timezoneOffsetMinutes?: number
): boolean {
  const hour = getLocalHour(now, timezoneOffsetMinutes)
  const minute = getLocalMinute(now, timezoneOffsetMinutes)
  if (hour !== targetHour) return false
  return Math.abs(minute - targetMinute) <= toleranceMinutes
}
