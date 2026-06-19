import { format, subDays } from 'date-fns'
import type { DailyCheckin, DietCheckinItem, WorkoutCheckinItem } from '@/types'

import type { PortionId } from '@/lib/eat-out-builder'
import type { EatOutPreferences } from '@/lib/meal-engine-types'
import type { HighlightKey } from '@/lib/meal-engine-types'

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const
export type MealType = (typeof MEAL_TYPES)[number]
export type MealMode = 'cook' | 'convenience'

export interface MealModes {
  breakfast: MealMode
  lunch: MealMode
  dinner: MealMode
}

export interface CustomEatOutSelection {
  id: string
  portion: PortionId
}

export interface MealSuggestState {
  current_highlight?: string
  current_highlight_key?: HighlightKey
}

export interface DailyRollState {
  daily_rolls_used: number
  seen_suggestion_ids: string[]
  /** 各餐次獨立記錄，避免早餐換過就擋住午餐 */
  seen_by_meal?: Partial<Record<MealType, string[]>>
  /** 各餐次獨立骰子次數（語氣升級用） */
  rolls_by_meal?: Partial<Record<MealType, number>>
}

export interface UserMemoryMeta {
  eat_out_prefs?: EatOutPreferences
  favorite_item_ids?: string[]
  favorite_brands?: string[]
  /** standard | shift — 輪班用第一餐/第二餐/第三餐 */
  work_schedule?: 'standard' | 'shift'
  /** 生活事件模式，不懲罰 */
  life_event_mode?: 'cheat' | 'travel' | 'family' | 'cny' | 'sick' | 'stress' | 'bad_week' | null
}

export interface CheckinMeta {
  meal_modes?: MealModes
  custom_eat_out?: Partial<Record<MealType, CustomEatOutSelection[]>>
  daily_rolls?: DailyRollState
  meal_suggest?: Partial<Record<MealType, MealSuggestState>>
  user_memory?: UserMemoryMeta
}

type CheckinSlice = Pick<DailyCheckin, 'checkin_date' | 'diet_items' | 'workout_items'>

export const DEFAULT_MEAL_MODES: MealModes = {
  breakfast: 'convenience',
  lunch: 'convenience',
  dinner: 'convenience',
}

export function parseCheckinMeta(checkin: DailyCheckin | null): CheckinMeta {
  if (!checkin?.notes) return {}
  try {
    return JSON.parse(checkin.notes) as CheckinMeta
  } catch {
    return {}
  }
}

export function mealModesFromCheckin(checkin: DailyCheckin | null): MealModes {
  const meta = parseCheckinMeta(checkin)
  return { ...DEFAULT_MEAL_MODES, ...meta.meal_modes }
}

export function isCheckinDayQualified(
  checkin: Pick<DailyCheckin, 'diet_items' | 'workout_items'>
): boolean {
  const mealsDone = MEAL_TYPES.every(mt =>
    checkin.diet_items?.some(d => d.meal_id === mt && d.completed)
  )
  if (!mealsDone) return false

  const hasWorkout = (checkin.workout_items?.length ?? 0) > 0
  if (!hasWorkout) return true

  return checkin.workout_items?.every(w => w.completed) ?? false
}

export function countQualifiedDays(checkins: CheckinSlice[]): number {
  return checkins.filter(isCheckinDayQualified).length
}

export function countQualifiedDaysInMonth(
  checkins: CheckinSlice[],
  year: number,
  month: number
): number {
  const monthStart = format(new Date(year, month, 1), 'yyyy-MM-dd')
  const monthEnd = format(new Date(year, month + 1, 0), 'yyyy-MM-dd')
  return countQualifiedDays(
    checkins.filter(c => c.checkin_date >= monthStart && c.checkin_date <= monthEnd)
  )
}

export function calcStreakDays(checkins: CheckinSlice[]): number {
  const qualifiedDates = new Set(
    checkins.filter(isCheckinDayQualified).map(c => c.checkin_date)
  )
  if (qualifiedDates.size === 0) return 0

  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  let startOffset = 0
  if (!qualifiedDates.has(today)) {
    if (!qualifiedDates.has(yesterday)) return 0
    startOffset = 1
  }

  let streak = 0
  for (let i = startOffset; i < 365; i++) {
    const dateStr = format(subDays(new Date(), i), 'yyyy-MM-dd')
    if (qualifiedDates.has(dateStr)) streak++
    else break
  }
  return streak
}

export function initWorkoutItems(
  checkin: DailyCheckin | null,
  exercises: { exercise_id: string; exercise_name_zh: string }[]
): WorkoutCheckinItem[] {
  if (checkin?.workout_items?.length) return checkin.workout_items
  return exercises.map(ex => ({
    exercise_id: ex.exercise_id,
    exercise_name: ex.exercise_name_zh,
    completed: false,
  }))
}

export function customEatOutFromCheckin(checkin: DailyCheckin | null): Partial<Record<MealType, CustomEatOutSelection[]>> {
  return parseCheckinMeta(checkin).custom_eat_out ?? {}
}

export function mealSuggestFromCheckin(checkin: DailyCheckin | null): Partial<Record<MealType, MealSuggestState>> {
  return parseCheckinMeta(checkin).meal_suggest ?? {}
}

export function dailyRollsFromCheckin(checkin: DailyCheckin | null): DailyRollState {
  const meta = parseCheckinMeta(checkin)
  if (meta.daily_rolls) return meta.daily_rolls
  // 向後相容：舊版每餐 rolls 加總
  const legacy = meta.meal_suggest ?? {}
  const daily_rolls_used = Object.values(legacy).reduce((sum, s) => sum + ((s as { rolls_used?: number }).rolls_used ?? 0), 0)
  const seen = new Set<string>()
  for (const s of Object.values(legacy)) {
    for (const id of (s as { seen_suggestion_ids?: string[] }).seen_suggestion_ids ?? []) {
      seen.add(id)
    }
  }
  return { daily_rolls_used, seen_suggestion_ids: [...seen] }
}

export function rollsForMeal(rolls: DailyRollState, mealType: MealType): number {
  return rolls.rolls_by_meal?.[mealType] ?? 0
}

export function sumMealRolls(rolls_by_meal?: Partial<Record<MealType, number>>): number {
  return MEAL_TYPES.reduce((sum, mt) => sum + (rolls_by_meal?.[mt] ?? 0), 0)
}

export function recordMealRoll(
  rolls: DailyRollState,
  mealType: MealType,
  suggestionId?: string
): DailyRollState {
  const prev = seenIdsForMeal(rolls, mealType)
  const mealRolls = rollsForMeal(rolls, mealType) + 1
  const rolls_by_meal = { ...rolls.rolls_by_meal, [mealType]: mealRolls }
  const seen_by_meal = suggestionId
    ? { ...rolls.seen_by_meal, [mealType]: [...prev, suggestionId] }
    : rolls.seen_by_meal
  const allSeen = new Set([
    ...rolls.seen_suggestion_ids,
    ...Object.values(seen_by_meal ?? {}).flat(),
  ])
  return {
    daily_rolls_used: sumMealRolls(rolls_by_meal),
    rolls_by_meal,
    seen_by_meal,
    seen_suggestion_ids: [...allSeen],
  }
}

export function seenIdsForMeal(rolls: DailyRollState, mealType: MealType): string[] {
  return rolls.seen_by_meal?.[mealType] ?? []
}

export function appendSeenForMeal(
  rolls: DailyRollState,
  mealType: MealType,
  suggestionId: string
): DailyRollState {
  return recordMealRoll(rolls, mealType, suggestionId)
}

export function userMemoryFromCheckin(checkin: DailyCheckin | null): UserMemoryMeta {
  return parseCheckinMeta(checkin).user_memory ?? {}
}

export function buildCheckinPayload(
  state: {
    dietItems: DietCheckinItem[]
    workoutItems: WorkoutCheckinItem[]
    waterMl: number
    mealModes: MealModes
    customEatOut?: Partial<Record<MealType, CustomEatOutSelection[]>>
    dailyRolls?: DailyRollState
    mealSuggest?: Partial<Record<MealType, MealSuggestState>>
    userMemory?: UserMemoryMeta
  },
  weeklyPlanId: string | null
) {
  const notes = JSON.stringify({
    meal_modes: state.mealModes,
    custom_eat_out: state.customEatOut,
    daily_rolls: state.dailyRolls,
    meal_suggest: state.mealSuggest,
    user_memory: state.userMemory,
  })
  return {
    weekly_plan_id: weeklyPlanId,
    diet_items: state.dietItems,
    workout_items: state.workoutItems,
    water_ml: state.waterMl,
    notes,
  }
}

export function initDietItems(checkin: DailyCheckin | null): DietCheckinItem[] {
  if (checkin?.diet_items?.length) return checkin.diet_items
  return MEAL_TYPES.map(mt => ({
    meal_id: mt,
    meal_type: mt,
    completed: false,
  }))
}

export function dietCompletedSet(dietItems: DietCheckinItem[]): Set<string> {
  return new Set(dietItems.filter(d => d.completed).map(d => d.meal_id))
}

export function calcTodayCompletion(
  dietItems: DietCheckinItem[],
  workoutItems: WorkoutCheckinItem[],
  waterMl: number,
  waterTarget: number
): number {
  const mealTotal = MEAL_TYPES.length
  const mealsDone = dietItems.filter(d => d.completed).length
  const workoutTotal = workoutItems.length
  const workoutDone = workoutItems.filter(w => w.completed).length
  const waterDone = waterMl >= waterTarget ? 1 : 0

  const mealsComplete = mealsDone >= mealTotal
  const workoutComplete = workoutTotal === 0 || workoutDone >= workoutTotal
  if (mealsComplete && workoutComplete && waterDone) return 100

  const total = mealTotal + (workoutTotal > 0 ? workoutTotal : 0) + 1
  const done = mealsDone + workoutDone + waterDone
  return Math.round((done / total) * 100)
}
