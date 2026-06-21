/** Phase 3 — 為不完美真人設計，不為創辦人設計 */

import { getTaipeiHour } from '@/lib/timezone'
import type { MealType } from '@/lib/checkin-utils'

export type WorkSchedule = 'standard' | 'shift'

export type LifeEventMode =
  | 'cheat'
  | 'travel'
  | 'family'
  | 'cny'
  | 'sick'
  | 'stress'
  | 'bad_week'

export const LIFE_EVENT_OPTIONS: { id: LifeEventMode; label: string }[] = [
  { id: 'cheat', label: '亂吃一餐' },
  { id: 'travel', label: '出差旅行' },
  { id: 'family', label: '家庭聚餐' },
  { id: 'cny', label: '過年節慶' },
  { id: 'sick', label: '生病' },
  { id: 'stress', label: '壓力大' },
  { id: 'bad_week', label: '這週很糟' },
]

const STANDARD_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
}

const SHIFT_LABELS: Record<MealType, string> = {
  breakfast: '第一餐',
  lunch: '第二餐',
  dinner: '第三餐',
}

export function getMealLabel(schedule: WorkSchedule, meal: MealType): string {
  return schedule === 'shift' ? SHIFT_LABELS[meal] : STANDARD_LABELS[meal]
}

export function getMealLabels(schedule: WorkSchedule): Record<MealType, string> {
  return schedule === 'shift' ? { ...SHIFT_LABELS } : { ...STANDARD_LABELS }
}

/** 睡前時段提示（輪班/晚睡） */
export function isBeforeSleepWindow(hour = getTaipeiHour()): boolean {
  return hour >= 22 || hour < 5
}

export function getNowTabHint(schedule: WorkSchedule, meal: MealType): string | null {
  if (schedule === 'shift' && meal === 'dinner' && isBeforeSleepWindow()) {
    return '睡前'
  }
  if (schedule === 'standard') return '現在'
  return '現在'
}

export function currentMealSlotForSchedule(schedule: WorkSchedule = 'standard'): MealType {
  const h = getTaipeiHour()
  if (schedule === 'shift') {
    if (h >= 22 || h < 5) return 'dinner'
    if (h >= 5 && h < 11) return 'breakfast'
    if (h >= 11 && h < 17) return 'lunch'
    return 'dinner'
  }
  if (h >= 22 || h < 5) return 'dinner'
  if (h < 10) return 'breakfast'
  if (h < 15) return 'lunch'
  return 'dinner'
}

export function decideButtonLabel(schedule: WorkSchedule, meal: MealType): string {
  const h = getTaipeiHour()
  if (meal === 'dinner' && (h >= 22 || h < 5)) {
    return schedule === 'shift' ? '幫我決定睡前這餐' : '幫我決定宵夜這餐'
  }
  const label = getMealLabel(schedule, meal)
  return `幫我決定${label}`
}
