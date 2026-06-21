/** 本週旅程 — 日記語氣（非 KPI、非儀表板） */

import { addDays, format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export type DayJourneyStatus = 'upcoming' | 'today' | 'done' | 'missed' | 'rest' | 'weekend'

export interface DayJourneyNode {
  dayIndex: number
  label: string
  dateLabel: string
  journal: string
  workoutHint: string
  status: DayJourneyStatus
}

const WEEKDAY_MOODS = [
  '新的一週。不用完美開局。',
  '還在。這就夠了。',
  '中場。走到哪算哪。',
  '快週末了。',
  '今天可以。',
  '吃好一點。人生不是只有雞胸。',
  '準備下週。不用報復性節食。',
]

const DAY_NAMES = ['週一', '週二', '週三', '週四', '週五', '週六', '週日']

function workoutHint(type: string, typeZh: string): string {
  if (type === 'rest') return '休息'
  return typeZh || '有運動'
}

function journalForDay(params: {
  dayIndex: number
  status: DayJourneyStatus
  isToday: boolean
}): string {
  const { dayIndex, status, isToday } = params
  if (isToday) return WEEKDAY_MOODS[dayIndex]!
  if (status === 'upcoming' || status === 'weekend') return '還沒寫到這一天。'
  if (status === 'done') return '有留下一點痕跡。'
  if (status === 'rest') return '排定休息。'
  if (status === 'missed') return '那天先略過。'
  return WEEKDAY_MOODS[dayIndex]!
}

export function buildWeekJourney(params: {
  todayDayIndex: number
  checkinMap: Record<string, { diet_items?: { completed: boolean }[]; workout_items?: { completed: boolean }[] } | null>
  weekStart: string
  workoutTypes: ('rest' | string)[]
  workoutLabels: string[]
}): DayJourneyNode[] {
  const { todayDayIndex, checkinMap, weekStart, workoutTypes, workoutLabels } = params

  return DAY_NAMES.map((label, dayIndex) => {
    const date = addDays(new Date(weekStart), dayIndex)
    const dateStr = format(date, 'yyyy-MM-dd')
    const dateLabel = format(date, 'M月d日 EEEE', { locale: zhTW })
    const checkin = checkinMap[dateStr]
    const isRest = workoutTypes[dayIndex] === 'rest'
    const isToday = dayIndex === todayDayIndex
    const isPast = dayIndex < todayDayIndex
    const isWeekend = dayIndex >= 5

    let status: DayJourneyStatus = 'upcoming'
    if (isToday) status = 'today'
    else if (isPast) {
      if (checkin) {
        const dietDone = checkin.diet_items?.some(i => i.completed) ?? false
        const workDone = checkin.workout_items?.some(i => i.completed) ?? false
        status = dietDone || workDone ? 'done' : isRest ? 'rest' : 'missed'
      } else if (isRest) status = 'rest'
      else status = 'missed'
    } else if (isWeekend) status = 'weekend'

    const hint = workoutHint(workoutTypes[dayIndex] ?? 'rest', workoutLabels[dayIndex] ?? '')

    return {
      dayIndex,
      label,
      dateLabel,
      journal: journalForDay({ dayIndex, status, isToday }),
      workoutHint: hint,
      status,
    }
  })
}

export function buildWeekPosture(todayDayIndex: number, journey: DayJourneyNode[]): string {
  const today = journey[todayDayIndex]
  if (!today) return '這週，照你能做到的走。'

  const past = journey.filter(n => n.dayIndex < todayDayIndex)
  const touched = past.filter(n => n.status === 'done' || n.status === 'rest').length

  if (todayDayIndex === 0) return '新的一週。你知道起點在哪。'
  if (todayDayIndex >= 5) return '週末了。這週到這裡就好。'
  if (touched >= Math.max(1, past.length - 1)) return `${today.label}。這週還在節奏裡。`
  if (touched === 0) return `${today.label}。從今天寫起來。`
  return `${today.label}。走到哪，算到哪。`
}

export function simplifyWorkout(workout: {
  type: string
  type_zh: string
  estimated_duration_mins: number
  main: { exercise_name_zh: string }[]
}): { title: string; subtitle: string; duration: string } {
  if (workout.type === 'rest') {
    return { title: '今天先休息', subtitle: '身體也需要寫進日記。', duration: '' }
  }
  const mainName = workout.main[0]?.exercise_name_zh
  const title = mainName ? `${mainName}` : workout.type_zh
  return {
    title,
    subtitle: workout.type_zh,
    duration: `${workout.estimated_duration_mins} 分鐘`,
  }
}

/** @deprecated Phase 10 — no gamified rewards on Week */
export function shouldShowWeekReward(_params: {
  todayDayIndex: number
  completionRate: number
}): boolean {
  return false
}

/** @deprecated Phase 10 — no completion scores on Week */
export function weekCompletionRate(
  checkinMap: Record<string, { diet_items?: { completed: boolean }[]; workout_items?: { completed: boolean }[] } | null>,
  weekStart: string,
  days: number
): number {
  let done = 0
  let total = 0
  for (let i = 0; i < days; i++) {
    const dateStr = format(addDays(new Date(weekStart), i), 'yyyy-MM-dd')
    const c = checkinMap[dateStr]
    if (!c) continue
    const dietTotal = c.diet_items?.length ?? 0
    const dietDone = c.diet_items?.filter(x => x.completed).length ?? 0
    const workTotal = c.workout_items?.length ?? 0
    const workDone = c.workout_items?.filter(x => x.completed).length ?? 0
    total += dietTotal + workTotal
    done += dietDone + workDone
  }
  return total > 0 ? done / total : 0
}
