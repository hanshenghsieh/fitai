/** 本週旅程 — 情緒標籤（非 KPI） */

import { addDays, format } from 'date-fns'

export type DayJourneyStatus = 'upcoming' | 'today' | 'done' | 'missed' | 'rest' | 'weekend'

export interface DayJourneyNode {
  dayIndex: number
  label: string
  mood: string
  status: DayJourneyStatus
}

const WEEKDAY_MOODS = [
  '開局。不用完美。',
  '還在。這就夠了。',
  '中場。撐一下。',
  '快週末了。',
  '今天可以。',
  '吃好一點。',
  '準備下週。',
]

const DAY_NAMES = ['週一', '週二', '週三', '週四', '週五', '週六', '週日']

export function statusLabel(status: DayJourneyStatus): string {
  switch (status) {
    case 'upcoming':
      return '還沒到'
    case 'today':
      return '今天'
    case 'done':
      return '有記錄'
    case 'missed':
      return '跳過了'
    case 'rest':
      return '休息'
    case 'weekend':
      return '週末'
  }
}

export function buildWeekJourney(params: {
  todayDayIndex: number
  checkinMap: Record<string, { diet_items?: { completed: boolean }[]; workout_items?: { completed: boolean }[] } | null>
  weekStart: string
  workoutTypes: ('rest' | string)[]
  dayCalories?: number[]
}): DayJourneyNode[] {
  const { todayDayIndex, checkinMap, weekStart, workoutTypes, dayCalories } = params

  return DAY_NAMES.map((label, dayIndex) => {
    const dateStr = format(addDays(new Date(weekStart), dayIndex), 'yyyy-MM-dd')
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
        status = dietDone || workDone ? 'done' : 'missed'
      } else if (isRest) status = 'rest'
      else status = 'missed'
    } else if (isWeekend) status = 'weekend'

    let mood = dayCalories?.[dayIndex]
      ? `${dayCalories[dayIndex]} kcal · ${workoutTypes[dayIndex] === 'rest' ? '休息' : '有運動'}`
      : WEEKDAY_MOODS[dayIndex]!
    if (dayIndex === 5) mood = '吃好一點。人生不是只有雞胸。'
    if (dayIndex === 6) mood = '準備下週。不用報復性節食。'

    return { dayIndex, label, mood, status }
  })
}

export function formatWeeklyGoals(planData: {
  goal_snapshot?: { weekly_fat_loss_g?: number; daily_deficit?: number; fat_to_lose_kg?: number }
  weekly_targets: {
    workout_days: number
    avg_daily_calories: number
    avg_daily_protein_g: number
    weekly_exercise_burn_kcal?: number
  }
}): { icon: string; text: string }[] {
  const cal = planData.weekly_targets.avg_daily_calories
  const pro = planData.weekly_targets.avg_daily_protein_g
  const deficit = planData.goal_snapshot?.daily_deficit
  const fatG = planData.goal_snapshot?.weekly_fat_loss_g

  const lines: { icon: string; text: string }[] = [
    { icon: '🔥', text: `每日 ${cal} kcal · 蛋白 ${pro}g` },
  ]
  if (deficit != null && deficit > 0) {
    lines.push({ icon: '📉', text: `熱量缺口　每日約 ${deficit} kcal` })
  }
  if (fatG != null && fatG > 0) {
    lines.push({ icon: '🎯', text: `體重方向　每週約 -${(fatG / 1000).toFixed(1)} kg` })
  }
  lines.push(
    { icon: '🏃', text: `運動　本週 ${planData.weekly_targets.workout_days} 次` },
  )
  if (planData.weekly_targets.weekly_exercise_burn_kcal) {
    lines.push({
      icon: '⚡',
      text: `運動消耗　約 ${planData.weekly_targets.weekly_exercise_burn_kcal} kcal（已納入赤字）`,
    })
  }
  lines.push({ icon: '💧', text: `喝水　每天照目標喝` })
  return lines
}

export function simplifyWorkout(workout: {
  type: string
  type_zh: string
  estimated_duration_mins: number
  main: { exercise_name_zh: string }[]
}): { title: string; subtitle: string; duration: string } {
  if (workout.type === 'rest') {
    return { title: '今天先活著', subtitle: '其他明天再說。', duration: '' }
  }
  const mainName = workout.main[0]?.exercise_name_zh
  const title = mainName ? `動一下：${mainName}` : '動一下'
  return {
    title,
    subtitle: '做完就好。不用很猛。',
    duration: `${workout.estimated_duration_mins} 分鐘`,
  }
}

export function shouldShowWeekReward(params: {
  todayDayIndex: number
  completionRate: number
}): boolean {
  return params.todayDayIndex >= 6 && params.completionRate >= 0.5
}

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
