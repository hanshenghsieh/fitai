import { getTaipeiDateKey } from '@/lib/timezone'

/**
 * Founder Dashboard's canonical daily bucket: a plain Asia/Taipei calendar
 * day (YYYY-MM-DD), sourced from getTaipeiDateKey.
 *
 * This is deliberately NOT the same as the in-app food-logging "nutrition
 * day" (getNutritionDayKey in src/lib/timezone.ts), which rolls over at
 * 05:00 Taipei so a very-late-night snack still counts toward "today's"
 * calorie bank. That 05:00 rollover is correct product behavior for the
 * Today screen, but it merges e.g. 23:30 and the following 00:30 into the
 * same bucket — which is exactly wrong for a Founder-facing "which days was
 * this user active" retention/funnel view, where a plain calendar day is
 * the less surprising, more standard definition. Documented explicitly per
 * the Phase 2 instruction not to silently pick between two divergent
 * definitions — see docs/founder-kpi-definitions.md.
 */
export function dashboardDayKey(date: Date | string = new Date()): string {
  return getTaipeiDateKey(typeof date === 'string' ? new Date(date) : date)
}

/** Adds `offsetDays` (may be negative) to a YYYY-MM-DD Taipei day key, staying calendar-correct across month/year boundaries. */
export function addDaysToDayKey(dayKey: string, offsetDays: number): string {
  const [year, month, day] = dayKey.split('-').map(Number)
  // Noon UTC avoids DST/offset edge cases entirely — Taipei has no DST, but
  // this keeps the arithmetic robust regardless of host timezone.
  const base = new Date(Date.UTC(year!, month! - 1, day!, 12, 0, 0))
  base.setUTCDate(base.getUTCDate() + offsetDays)
  return dashboardDayKey(base)
}
