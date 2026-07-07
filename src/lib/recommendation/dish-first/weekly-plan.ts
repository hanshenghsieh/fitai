import type { MealType } from '@/lib/checkin-utils'
import { computeTodayMealState } from '@/lib/engines/next-meal-engine'
import { type NutritionTargets } from '@/lib/goal-calculator'
import type { ConvenienceMealCombination } from '@/types'
import type { MealSuggestion } from '@/lib/meal-engine-types'
import { dishRecommendationToMealSuggestion } from './adapter'
import { recommendationDisplayName } from './display'
import {
  rollDishFirstRecommendation,
  USE_DISH_FIRST_RECOMMENDATION,
  type DishRecommendationQueueState,
} from './engine'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
}

export function dishSuggestionToConvenienceMeal(
  mealType: MealType,
  suggestion: MealSuggestion
): ConvenienceMealCombination | null {
  const dish = suggestion.dish_recommendation
  if (!dish) return null

  const variant = dish.variant
  const displayName = recommendationDisplayName(dish.template, variant)
  const item = suggestion.lines[0]?.item
  if (!item) return null

  const reasonParts = [
    ...dish.reasons.map(r => r.label),
    ...dish.benefitPoints.slice(0, 1),
  ]

  return {
    meal_type: mealType,
    meal_type_zh: MEAL_LABELS[mealType],
    items: [
      {
        ...item,
        id: `dish-${dish.template.id}${variant ? `-${variant.id}` : ''}`,
        name: displayName,
        store: '餐點推薦',
        description: reasonParts[0] ?? '依本週目標配對的外食參考',
        dish_template_id: dish.template.id,
        dish_variant_id: variant?.id ?? null,
      },
    ],
    total_calories: suggestion.totals.calories,
    total_protein_g: suggestion.totals.protein_g,
    total_carbs_g: suggestion.totals.carbs_g,
    total_fat_g: suggestion.totals.fat_g,
    reasoning: reasonParts.join(' · ') || '依本週目標配對的外食參考',
  }
}

export interface BuildDishFirstMealsInput {
  nutrition: NutritionTargets
  dayIndex: number
  weekSeed?: number
}

export function buildDishFirstConvenienceMealsForDay(
  input: BuildDishFirstMealsInput
): ConvenienceMealCombination[] {
  if (!USE_DISH_FIRST_RECOMMENDATION) return []

  let queueState: DishRecommendationQueueState = { recentlyShownTemplateIds: [], cursor: 0 }
  const weekSeed = input.weekSeed ?? input.dayIndex
  const meals: ConvenienceMealCombination[] = []

  for (const mealType of ['breakfast', 'lunch', 'dinner'] as const) {
    const dayState = computeTodayMealState({
      todayFoodLogs: [],
      normalTargetKcal: input.nutrition.dailyCalories,
      proteinTargetG: input.nutrition.proteinGrams,
      mealSlot: mealType,
    })

    const roll = rollDishFirstRecommendation({
      meal_type: mealType,
      day_state: dayState,
      seed: weekSeed * 997 + mealType.charCodeAt(0) * 131 + input.dayIndex * 17,
      queue_state: queueState,
    })
    queueState = roll.queue_state

    if (!roll.result) continue

    const suggestion = dishRecommendationToMealSuggestion(roll.result, mealType)
    const saved = dishSuggestionToConvenienceMeal(mealType, suggestion)
    if (saved) meals.push(saved)
  }

  return meals
}

/** Pick a dish template name for weekly strategy hints (Progress / Week tabs). */
export function pickDishHintForMealSlot(params: {
  mealSlot: MealType
  dailyCalories: number
  proteinGrams: number
  proteinGap?: number
  remainingCalories?: number
  seed?: number
}): string | null {
  if (!USE_DISH_FIRST_RECOMMENDATION) return null

  const dayState = computeTodayMealState({
    todayFoodLogs: [],
    normalTargetKcal: params.dailyCalories,
    proteinTargetG: params.proteinGrams,
    mealSlot: params.mealSlot,
  })

  if ((params.proteinGap ?? 0) >= 10) {
    dayState.proteinGap = params.proteinGap!
    dayState.highProteinPriority = true
  }
  if (params.remainingCalories != null && params.remainingCalories < dayState.effectiveMealCalTarget) {
    dayState.remainingCalories = params.remainingCalories
    dayState.effectiveMealCalTarget = Math.max(200, params.remainingCalories)
  }

  const roll = rollDishFirstRecommendation({
    meal_type: params.mealSlot,
    day_state: dayState,
    seed: params.seed ?? params.mealSlot.charCodeAt(0) * 997,
  })

  if (!roll.result) return null
  return recommendationDisplayName(roll.result.template, roll.result.variant)
}
