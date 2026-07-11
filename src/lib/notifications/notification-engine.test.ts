import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  allCopyPassesSafetyAudit,
  countCopyByCategory,
  NOTIFICATION_COPY_LIBRARY,
  passesCopySafetyCheck,
  totalCopyCount,
} from './notification-copy-library'
import {
  canSendMoreToday,
  countSentToday,
  filterEligibleCopy,
  wasCopySentWithinCooldown,
} from './notification-dedupe'
import {
  buildTodayNotificationState,
  runNotificationEngine,
  categoriesEligibleNow,
} from './notification-engine'
import { isQuietHour, resolveActiveTimeSlot } from './notification-scheduler'
import type {
  NotificationEngineInput,
  TodayNotificationState,
  WeekAnalysisHints,
} from './notification-types'
import { MAX_NOTIFICATIONS_PER_DAY } from './notification-types'

function baseToday(overrides: Partial<TodayNotificationState> = {}): TodayNotificationState {
  return {
    caloriesLogged: 0,
    caloriesTarget: 1800,
    caloriesRemaining: 1800,
    proteinLogged: 0,
    proteinTarget: 100,
    proteinGap: 100,
    proteinMet: false,
    hasLoggedAnyMeal: false,
    hasLoggedBreakfast: false,
    hasLoggedLunch: false,
    hasLoggedDinner: false,
    overTarget: false,
    onTarget: false,
    waterMl: 0,
    waterTargetMl: 2000,
    ...overrides,
  }
}

function baseWeek(overrides: Partial<WeekAnalysisHints> = {}): WeekAnalysisHints {
  return {
    weeklyProteinLow: false,
    dinnerCaloriesHigh: false,
    workoutInsufficient: false,
    waterLow: false,
    weightTrend: 'unknown',
    coachInsightLines: [],
    ...overrides,
  }
}

function engineInput(
  overrides: Partial<NotificationEngineInput> & {
    today?: Partial<TodayNotificationState>
    week?: Partial<WeekAnalysisHints>
  } = {}
): NotificationEngineInput {
  const now = overrides.now ?? new Date('2026-06-25T08:30:00')
  return {
    userId: 'user-1',
    now,
    today: baseToday(overrides.today),
    week: baseWeek(overrides.week),
    sentHistory: overrides.sentHistory ?? [],
    sentToday: overrides.sentToday,
    dryRun: overrides.dryRun,
    legacyCronType: overrides.legacyCronType,
    timezoneOffsetMinutes: overrides.timezoneOffsetMinutes,
  }
}

describe('notification copy library', () => {
  it('has at least 500 unique coach lines', () => {
    assert.ok(totalCopyCount() >= 500)
  })

  it(`copy library totals (${totalCopyCount()} lines)`, () => {
    const counts = countCopyByCategory()
    assert.ok((counts.breakfast_reminder ?? 0) >= 80)
    assert.ok((counts.lunch_reminder ?? 0) >= 80)
    assert.ok((counts.dinner_reminder ?? 0) >= 80)
    assert.ok((counts.water_reminder ?? 0) >= 50)
    assert.ok((counts.protein_reminder ?? 0) >= 50)
    assert.ok((counts.workout_reminder ?? 0) >= 50)
    assert.ok((counts.encouragement ?? 0) >= 60)
    assert.ok((counts.over_target_comfort ?? 0) >= 40)
    assert.ok((counts.target_hit ?? 0) >= 30)
    assert.ok((counts.ai_coach_insight ?? 0) >= 30)
  })

  it('passes shame-free safety audit', () => {
    assert.equal(allCopyPassesSafetyAudit(), true)
  })

  it('rejects banned shame words', () => {
    assert.equal(passesCopySafetyCheck('你又失敗了'), false)
    assert.equal(passesCopySafetyCheck('不要偷懶'), false)
    assert.equal(passesCopySafetyCheck('午餐先補蛋白質'), true)
  })
})

describe('notification dedupe', () => {
  it('blocks same copy within 90 days', () => {
    const copy = NOTIFICATION_COPY_LIBRARY[0]
    const now = new Date('2026-06-25T10:00:00')
    const history = [
      {
        copy_id: copy.id,
        category: copy.category,
        sent_at: '2026-04-01T10:00:00',
      },
    ]
    assert.equal(wasCopySentWithinCooldown(copy.id, history, now), true)
  })

  it('allows same copy after 90 days', () => {
    const copy = NOTIFICATION_COPY_LIBRARY[0]
    const now = new Date('2026-06-25T10:00:00')
    const history = [
      {
        copy_id: copy.id,
        category: copy.category,
        sent_at: '2026-01-01T10:00:00',
      },
    ]
    assert.equal(wasCopySentWithinCooldown(copy.id, history, now), false)
  })

  it('filters category streak over 2', () => {
    const pool = NOTIFICATION_COPY_LIBRARY.filter(c => c.category === 'encouragement').slice(0, 5)
    const history = [
      { copy_id: 'a', category: 'encouragement' as const, sent_at: '2026-06-24T10:00:00' },
      { copy_id: 'b', category: 'encouragement' as const, sent_at: '2026-06-23T10:00:00' },
    ]
    const eligible = filterEligibleCopy(pool, history, new Date('2026-06-25T10:00:00'))
    assert.equal(eligible.length, 0)
  })
})

describe('notification scheduler', () => {
  it('detects quiet hours 23:00-06:59', () => {
    assert.equal(isQuietHour(new Date('2026-06-25T23:30:00')), true)
    assert.equal(isQuietHour(new Date('2026-06-25T06:30:00')), true)
    assert.equal(isQuietHour(new Date('2026-06-25T08:00:00')), false)
  })

  it('resolves morning slot at 8am', () => {
    assert.equal(resolveActiveTimeSlot(new Date('2026-06-25T08:00:00')), 'morning')
  })
})

describe('notification engine rules', () => {
  it('returns nothing during quiet hours', () => {
    const result = runNotificationEngine(
      engineInput({ now: new Date('2026-06-25T02:00:00') })
    )
    assert.equal(result.notifications.length, 0)
    assert.ok(result.skipped.some(s => s.reason === 'quiet_hours_23_to_07'))
  })

  it('caps at 5 notifications per day', () => {
    const history = Array.from({ length: 5 }).map((_, i) => ({
      copy_id: `encouragement_${i + 1}`,
      category: 'encouragement' as const,
      sent_at: '2026-06-25T07:00:00',
    }))
    const result = runNotificationEngine(
      engineInput({
        now: new Date('2026-06-25T08:00:00'),
        sentHistory: history,
      })
    )
    assert.equal(result.notifications.length, 0)
    assert.ok(result.skipped.some(s => s.reason === 'daily_cap_reached'))
    assert.equal(countSentToday(history, new Date('2026-06-25T08:00:00')), 5)
    assert.equal(canSendMoreToday(history, [], new Date('2026-06-25T08:00:00')), false)
  })

  it('does not push protein when protein met', () => {
    const result = runNotificationEngine(
      engineInput({
        now: new Date('2026-06-25T11:30:00'),
        today: {
          proteinMet: true,
          proteinGap: 0,
          proteinLogged: 110,
          hasLoggedBreakfast: true,
          hasLoggedAnyMeal: true,
        },
        week: { weeklyProteinLow: true },
      })
    )
    assert.ok(!result.notifications.some(n => n.category === 'protein_reminder'))
  })

  it('does not push dinner reminder when dinner logged', () => {
    const result = runNotificationEngine(
      engineInput({
        now: new Date('2026-06-25T18:00:00'),
        today: {
          hasLoggedDinner: true,
          hasLoggedAnyMeal: true,
          hasLoggedLunch: true,
          hasLoggedBreakfast: true,
        },
      })
    )
    assert.ok(!result.notifications.some(n => n.category === 'dinner_reminder'))
  })

  it('over target pushes comfort not meal reminders', () => {
    const result = runNotificationEngine(
      engineInput({
        now: new Date('2026-06-25T18:00:00'),
        today: {
          overTarget: true,
          caloriesLogged: 2200,
          caloriesRemaining: -400,
          hasLoggedBreakfast: true,
          hasLoggedLunch: true,
          hasLoggedAnyMeal: true,
        },
      })
    )
    assert.ok(result.notifications.some(n => n.category === 'over_target_comfort'))
    assert.ok(!result.notifications.some(n => n.category === 'dinner_reminder'))
    assert.ok(!result.notifications.some(n => n.category === 'lunch_reminder'))
    assert.ok(!result.notifications.some(n => n.category === 'protein_reminder'))
  })

  it('no meals logged prioritizes first meal reminder', () => {
    const result = runNotificationEngine(
      engineInput({ now: new Date('2026-06-25T08:00:00') })
    )
    assert.ok(
      result.notifications.some(
        n => n.category === 'breakfast_reminder' || n.category === 'encouragement'
      )
    )
    assert.ok(result.notifications[0].trigger_reason.includes('meal') || result.notifications[0].category === 'encouragement')
  })

  it('weekly protein low suggests protein at lunch slot', () => {
    const cats = categoriesEligibleNow(
      engineInput({
        now: new Date('2026-06-25T11:30:00'),
        today: {
          hasLoggedBreakfast: true,
          hasLoggedAnyMeal: true,
          proteinGap: 40,
        },
        week: { weeklyProteinLow: true },
      })
    )
    assert.ok(cats.includes('protein_reminder'))
  })

  it('workout insufficient suggests workout in afternoon', () => {
    const result = runNotificationEngine(
      engineInput({
        now: new Date('2026-06-25T15:00:00'),
        today: { hasLoggedBreakfast: true, hasLoggedLunch: true, hasLoggedAnyMeal: true },
        week: { workoutInsufficient: true },
      })
    )
    assert.ok(result.notifications.some(n => n.category === 'workout_reminder'))
  })

  it('legacy breakfast cron returns one breakfast-oriented notification', () => {
    const result = runNotificationEngine(
      engineInput({
        legacyCronType: 'breakfast',
        now: new Date('2026-06-25T07:30:00'),
      })
    )
    assert.equal(result.notifications.length, 1)
    assert.ok(
      result.notifications[0].category === 'breakfast_reminder' ||
        result.notifications[0].category === 'encouragement'
    )
  })

  it('does not repeat identical copy same day when in history', () => {
    const morning = runNotificationEngine(
      engineInput({ now: new Date('2026-06-25T08:00:00') })
    )
    const first = morning.notifications[0]
    assert.ok(first)
    const again = runNotificationEngine(
      engineInput({
        now: new Date('2026-06-25T08:05:00'),
        sentHistory: [
          {
            copy_id: first.copy_id,
            category: first.category,
            sent_at: '2026-06-25T08:00:00',
          },
        ],
      })
    )
    assert.ok(!again.notifications.some(n => n.copy_id === first.copy_id))
  })

  it('dry-run flag is preserved in result', () => {
    const result = runNotificationEngine(
      engineInput({ dryRun: true, now: new Date('2026-06-25T08:00:00') })
    )
    assert.equal(result.dryRun, true)
  })

  it('payload includes required metadata fields', () => {
    const result = runNotificationEngine(
      engineInput({ now: new Date('2026-06-25T08:00:00') })
    )
    const n = result.notifications[0]
    assert.ok(n.title)
    assert.ok(n.body)
    assert.ok(n.category)
    assert.ok(n.priority)
    assert.ok(n.trigger_reason)
    assert.ok(n.cooldown_days >= 30)
    assert.ok(n.min_interval_hours >= 1)
    assert.ok(n.copy_id)
    assert.ok(n.time_slot)
  })

  it('all emitted copy passes shame filter', () => {
    const slots = [
      new Date('2026-06-25T08:00:00'),
      new Date('2026-06-25T11:30:00'),
      new Date('2026-06-25T15:00:00'),
      new Date('2026-06-25T18:00:00'),
      new Date('2026-06-25T21:00:00'),
    ]
    for (const now of slots) {
      const result = runNotificationEngine(engineInput({ now }))
      for (const n of result.notifications) {
        assert.equal(passesCopySafetyCheck(n.title), true)
        assert.equal(passesCopySafetyCheck(n.body), true)
      }
    }
  })

  it('target hit when on target in afternoon', () => {
    const result = runNotificationEngine(
      engineInput({
        now: new Date('2026-06-25T15:00:00'),
        today: {
          onTarget: true,
          proteinMet: true,
          proteinGap: 0,
          caloriesLogged: 1750,
          caloriesRemaining: 50,
          hasLoggedBreakfast: true,
          hasLoggedLunch: true,
          hasLoggedAnyMeal: true,
        },
      })
    )
    assert.ok(result.notifications.some(n => n.category === 'target_hit'))
  })

  it('water reminder when water low', () => {
    const result = runNotificationEngine(
      engineInput({
        now: new Date('2026-06-25T15:00:00'),
        today: {
          waterMl: 300,
          waterTargetMl: 2000,
          hasLoggedBreakfast: true,
          hasLoggedLunch: true,
          hasLoggedAnyMeal: true,
        },
        week: { waterLow: true },
      })
    )
    assert.ok(result.notifications.some(n => n.category === 'water_reminder'))
  })

  it('ai coach insight uses week lines', () => {
    const result = runNotificationEngine(
      engineInput({
        now: new Date('2026-06-25T15:00:00'),
        today: { hasLoggedBreakfast: true, hasLoggedLunch: true, hasLoggedAnyMeal: true },
        week: { coachInsightLines: ['本週蛋白質偏低，午餐先補一份蛋白。'] },
      })
    )
    assert.ok(result.notifications.some(n => n.category === 'ai_coach_insight'))
  })

  it('buildTodayNotificationState marks over target', () => {
    const state = buildTodayNotificationState({
      foodLogs: [
        {
          id: '1',
          name: 'test',
          calories: 2500,
          protein_g: 80,
          logged_at: '2026-06-25T12:00:00',
          user_declared: true,
          source: 'search',
        },
      ],
      caloriesTarget: 1800,
      proteinTargetG: 100,
    })
    assert.equal(state.overTarget, true)
  })

  it('respects max notifications constant', () => {
    assert.equal(MAX_NOTIFICATIONS_PER_DAY, 5)
  })

  it('outside slots returns skipped', () => {
    const result = runNotificationEngine(
      engineInput({ now: new Date('2026-06-25T13:00:00') })
    )
    if (result.notifications.length === 0) {
      assert.ok(result.skipped.some(s => s.reason === 'outside_coach_time_slots'))
    }
  })

  it('legacy dinner cron prefers dinner category when not logged', () => {
    const result = runNotificationEngine(
      engineInput({
        legacyCronType: 'dinner',
        now: new Date('2026-06-25T18:00:00'),
        today: {
          hasLoggedBreakfast: true,
          hasLoggedLunch: true,
          hasLoggedAnyMeal: true,
        },
      })
    )
    assert.equal(result.notifications.length, 1)
    assert.equal(result.notifications[0].category, 'dinner_reminder')
  })

  it('legacy workout cron returns workout reminder', () => {
    const result = runNotificationEngine(
      engineInput({
        legacyCronType: 'workout',
        now: new Date('2026-06-25T15:00:00'),
        today: { hasLoggedBreakfast: true, hasLoggedLunch: true, hasLoggedAnyMeal: true },
        week: { workoutInsufficient: true },
      })
    )
    assert.equal(result.notifications[0]?.category, 'workout_reminder')
  })
})
