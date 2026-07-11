import {
  buildAiInsightCopyFromLine,
  copyByCategory,
  passesCopySafetyCheck,
} from './notification-copy-library'
import {
  canSendMoreToday,
  filterEligibleCopy,
  pickCopyDeterministic,
} from './notification-dedupe'
import {
  buildTodayNotificationState,
  buildWeekAnalysisHintsFromAnalysis,
  buildWeekAnalysisHintsFromWeekSummary,
} from './notification-context'
import {
  isQuietHour,
  legacyCronTypeToPreferredCategories,
  legacyCronTypeToSlot,
  resolveActiveTimeSlot,
} from './notification-scheduler'
import type {
  LegacyCronNotificationType,
  NotificationCategory,
  NotificationEngineInput,
  NotificationEngineResult,
  NotificationPayload,
  NotificationPriority,
  NotificationTimeSlot,
  TodayNotificationState,
  WeekAnalysisHints,
} from './notification-types'
import { CATEGORY_TIME_SLOTS } from './notification-types'

export {
  buildTodayNotificationState,
  buildWeekAnalysisHintsFromAnalysis,
  buildWeekAnalysisHintsFromWeekSummary,
} from './notification-context'
export {
  totalCopyCount,
  countCopyByCategory,
  allCopyPassesSafetyAudit,
  passesCopySafetyCheck,
} from './notification-copy-library'

interface CategoryCandidate {
  category: NotificationCategory
  priority: NotificationPriority
  trigger_reason: string
}

function slotAllowedForCategory(
  category: NotificationCategory,
  slot: NotificationTimeSlot
): boolean {
  return CATEGORY_TIME_SLOTS[category].includes(slot)
}

function buildCategoryCandidates(
  today: TodayNotificationState,
  week: WeekAnalysisHints,
  slot: NotificationTimeSlot
): CategoryCandidate[] {
  const candidates: CategoryCandidate[] = []

  const push = (
    category: NotificationCategory,
    priority: NotificationPriority,
    trigger_reason: string
  ) => {
    if (!slotAllowedForCategory(category, slot)) return
    candidates.push({ category, priority, trigger_reason })
  }

  if (!today.hasLoggedAnyMeal) {
    push('breakfast_reminder', 'high', 'no_meal_logged_today')
    push('encouragement', 'normal', 'first_meal_nudge')
  }

  if (today.overTarget) {
    push('over_target_comfort', 'high', 'calories_over_target')
    push('water_reminder', 'normal', 'over_target_hydration')
    if (slot === 'bedtime') {
      push('encouragement', 'normal', 'over_target_evening_close')
    }
  } else {
    if (!today.hasLoggedBreakfast && (slot === 'morning' || slot === 'pre_lunch')) {
      push('breakfast_reminder', 'high', 'breakfast_not_logged')
    }
    if (!today.hasLoggedLunch && slot === 'pre_lunch') {
      push('lunch_reminder', 'high', 'lunch_not_logged')
    }
    if (!today.hasLoggedDinner && slot === 'pre_dinner') {
      push('dinner_reminder', 'high', 'dinner_not_logged')
    }

    if (!today.proteinMet && today.proteinGap > 10) {
      if (slot === 'pre_lunch' || slot === 'pre_dinner') {
        push('protein_reminder', 'high', 'protein_gap_today')
      }
    }

    if (week.weeklyProteinLow && (slot === 'pre_lunch' || slot === 'pre_dinner')) {
      push('protein_reminder', 'high', 'weekly_protein_low')
    }

    if (week.waterLow || today.waterMl < today.waterTargetMl * 0.5) {
      push('water_reminder', 'normal', 'water_low')
    }

    if (week.workoutInsufficient && (slot === 'afternoon' || slot === 'pre_dinner')) {
      push('workout_reminder', 'normal', 'weekly_workout_low')
    }

    if (today.onTarget && (slot === 'afternoon' || slot === 'bedtime')) {
      push('target_hit', 'normal', 'daily_target_met')
    }
  }

  if (week.coachInsightLines.length > 0) {
    push('ai_coach_insight', 'normal', 'week_coach_insight')
  }

  if (week.dinnerCaloriesHigh && slot === 'pre_dinner' && !today.overTarget) {
    push('ai_coach_insight', 'normal', 'dinner_ratio_high')
  }

  if (week.weightTrend === 'down') {
    push('encouragement', 'low', 'weight_trend_down')
  }

  if (candidates.length === 0) {
    push('encouragement', 'low', 'default_coach_ping')
  }

  return candidates
}

function filterCandidatesByRules(
  candidates: CategoryCandidate[],
  today: TodayNotificationState
): CategoryCandidate[] {
  return candidates.filter(c => {
    if (today.proteinMet && c.category === 'protein_reminder') return false
    if (today.hasLoggedDinner && c.category === 'dinner_reminder') return false
    if (today.overTarget && c.category === 'dinner_reminder') return false
    if (today.overTarget && c.category === 'lunch_reminder') return false
    if (today.overTarget && c.category === 'breakfast_reminder') return false
    if (today.overTarget && c.category === 'protein_reminder') return false
    return true
  })
}

function materializePayload(
  candidate: CategoryCandidate,
  input: NotificationEngineInput,
  slot: NotificationTimeSlot,
  index: number
): NotificationPayload | null {
  const { today, week, sentHistory, userId, now } = input
  const planned = input.sentToday ?? []

  let pool = filterEligibleCopy(copyByCategory(candidate.category), sentHistory, now)

  if (candidate.category === 'ai_coach_insight' && week.coachInsightLines.length > 0) {
    const dynamic = week.coachInsightLines
      .map((line, i) => buildAiInsightCopyFromLine(line, i))
      .filter((c): c is NonNullable<typeof c> => c != null)
    pool = filterEligibleCopy([...dynamic, ...pool], sentHistory, now)
  }

  const seed = `${userId}:${now.toISOString().slice(0, 10)}:${slot}:${candidate.category}:${index}`
  const picked = pickCopyDeterministic(pool, seed)
  if (!picked) return null

  if (!passesCopySafetyCheck(picked.title) || !passesCopySafetyCheck(picked.body)) {
    return null
  }

  const alreadyCategoriesToday = new Set([
    ...planned.map(p => p.category),
    ...sentHistory
      .filter(r => {
        const d = new Date(r.sent_at)
        return d.toDateString() === now.toDateString()
      })
      .map(r => r.category),
  ])

  if (alreadyCategoriesToday.has(candidate.category) && candidate.priority !== 'high') {
    return null
  }

  return {
    title: picked.title,
    body: picked.body,
    category: candidate.category,
    priority: candidate.priority,
    trigger_reason: candidate.trigger_reason,
    cooldown_days: picked.cooldown_days,
    min_interval_hours: picked.min_interval_hours,
    copy_id: picked.id,
    time_slot: slot,
  }
}

export function runNotificationEngine(
  input: NotificationEngineInput
): NotificationEngineResult {
  const skipped: NotificationEngineResult['skipped'] = []
  const notifications: NotificationPayload[] = []
  const tz = input.timezoneOffsetMinutes

  if (isQuietHour(input.now, tz)) {
    return {
      notifications: [],
      skipped: [{ reason: 'quiet_hours_23_to_07' }],
      dryRun: Boolean(input.dryRun),
    }
  }

  const slot =
    (input.legacyCronType && legacyCronTypeToSlot(input.legacyCronType)) ||
    resolveActiveTimeSlot(input.now, tz)

  if (!slot) {
    return {
      notifications: [],
      skipped: [{ reason: 'outside_coach_time_slots' }],
      dryRun: Boolean(input.dryRun),
    }
  }

  if (!canSendMoreToday(input.sentHistory, input.sentToday ?? [], input.now)) {
    return {
      notifications: [],
      skipped: [{ reason: 'daily_cap_reached' }],
      dryRun: Boolean(input.dryRun),
    }
  }

  let candidates = buildCategoryCandidates(input.today, input.week, slot)
  candidates = filterCandidatesByRules(candidates, input.today)

  if (input.legacyCronType) {
    const preferred = legacyCronTypeToPreferredCategories(input.legacyCronType)
    candidates = [
      ...candidates.filter(c => preferred.includes(c.category)),
      ...candidates.filter(c => !preferred.includes(c.category)),
    ]
  }

  const priorityRank: Record<NotificationPriority, number> = {
    high: 0,
    normal: 1,
    low: 2,
  }
  candidates.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])

  const usedCategories = new Set<NotificationCategory>()

  for (let i = 0; i < candidates.length; i++) {
    if (!canSendMoreToday(input.sentHistory, [...(input.sentToday ?? []), ...notifications], input.now)) {
      skipped.push({ reason: 'daily_cap_reached' })
      break
    }

    const candidate = candidates[i]
    if (usedCategories.has(candidate.category) && candidate.priority !== 'high') {
      continue
    }

    const payload = materializePayload(candidate, input, slot, i)
    if (!payload) {
      skipped.push({ reason: 'no_eligible_copy', category: candidate.category })
      continue
    }

    notifications.push(payload)
    usedCategories.add(candidate.category)

    if (input.legacyCronType) {
      break
    }
  }

  return {
    notifications,
    skipped,
    dryRun: Boolean(input.dryRun),
  }
}

export function buildLegacyEngineInput(input: {
  userId: string
  now: Date
  legacyCronType: LegacyCronNotificationType
  today: TodayNotificationState
  week?: WeekAnalysisHints
  sentHistory?: NotificationEngineInput['sentHistory']
  dryRun?: boolean
}): NotificationEngineInput {
  return {
    userId: input.userId,
    now: input.now,
    today: input.today,
    week: input.week ?? {
      weeklyProteinLow: false,
      dinnerCaloriesHigh: false,
      workoutInsufficient: false,
      waterLow: false,
      weightTrend: 'unknown',
      coachInsightLines: [],
    },
    sentHistory: input.sentHistory ?? [],
    legacyCronType: input.legacyCronType,
    dryRun: input.dryRun,
  }
}

export function resolveEngineNotificationsForLegacyType(
  legacyType: LegacyCronNotificationType,
  context: Omit<NotificationEngineInput, 'legacyCronType'>
): NotificationEngineResult {
  return runNotificationEngine({ ...context, legacyCronType: legacyType })
}

export function categoriesEligibleNow(
  input: Omit<NotificationEngineInput, 'legacyCronType'>
): NotificationCategory[] {
  const tz = input.timezoneOffsetMinutes
  const slot = resolveActiveTimeSlot(input.now, tz)
  if (!slot || isQuietHour(input.now, tz)) return []
  const candidates = filterCandidatesByRules(
    buildCategoryCandidates(input.today, input.week, slot),
    input.today
  )
  return [...new Set(candidates.map(c => c.category))]
}

export async function deliverNotificationPayloads(
  payloads: NotificationPayload[],
  options: {
    send: (payload: NotificationPayload) => Promise<boolean>
    dryRun?: boolean
  }
): Promise<{ sent: number; dryRun: boolean; payloads: NotificationPayload[] }> {
  if (options.dryRun) {
    return { sent: 0, dryRun: true, payloads }
  }
  let sent = 0
  for (const payload of payloads) {
    const ok = await options.send(payload)
    if (ok) sent++
  }
  return { sent, dryRun: false, payloads }
}
