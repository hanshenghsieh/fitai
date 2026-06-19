import type { NutritionTargets } from '@/lib/plan-engine'
import type { WeeklyFeedback } from '@/types'

export interface FeedbackAdjustments {
  nutrition: NutritionTargets
  coachNoteExtra: string
  workoutModifier: 'easier' | 'harder' | null
}

export function applyWeeklyFeedback(
  nutrition: NutritionTargets,
  feedback: WeeklyFeedback | null
): FeedbackAdjustments {
  let dailyCalories = nutrition.dailyCalories
  let coachNoteExtra = ''
  let workoutModifier: 'easier' | 'harder' | null = null

  if (!feedback) {
    return { nutrition: { ...nutrition }, coachNoteExtra, workoutModifier }
  }

  if (feedback.workout_intensity === 'too_hard') {
    dailyCalories += 150
    workoutModifier = 'easier'
    coachNoteExtra = '上週回饋訓練太難，本週熱量略增、訓練強度下調。'
  } else if (feedback.workout_intensity === 'too_easy') {
    dailyCalories -= 75
    workoutModifier = 'harder'
    coachNoteExtra = '上週回饋訓練太輕鬆，本週略增強度。'
  }

  if (feedback.diet_satisfaction !== null && feedback.diet_satisfaction <= 2) {
    coachNoteExtra += coachNoteExtra ? ' ' : ''
    coachNoteExtra += '上週飲食滿意度偏低，已重新搭配菜單組合。'
  }

  if (feedback.had_sick_days || feedback.had_travel) {
    coachNoteExtra += coachNoteExtra ? ' ' : ''
    coachNoteExtra += '考慮到你上週有特殊狀況，本週計畫較溫和。'
    dailyCalories += 100
  }

  const proteinGrams = nutrition.proteinGrams
  const fatGrams = nutrition.fatGrams
  const carbsGrams = Math.round((dailyCalories - proteinGrams * 4 - fatGrams * 9) / 4)

  return {
    nutrition: { dailyCalories, proteinGrams, carbsGrams, fatGrams },
    coachNoteExtra,
    workoutModifier,
  }
}
