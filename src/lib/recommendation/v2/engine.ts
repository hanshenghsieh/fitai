import type { FoodLogEntry } from '@/lib/banks/types'
import type { MealType } from '@/lib/checkin-utils'
import type { TodayMealState } from '@/lib/engines/next-meal-engine'
import type { MealTargets } from '@/lib/meal-engine-types'
import type { MealSuggestion } from '@/lib/meal-engine-types'
import { recommendationResultToMealSuggestion } from './adapter'
import { getRecommendationFoodsV2, getV2AddonItems, getV2MainPool } from './food-data'
import {
  advanceQueue,
  buildRecommendationQueue,
  peekQueueItemId,
  shouldRegenerateQueue,
} from './queue'
import { buildUserNutritionState, pickRecommendationWithFallback } from './reason-copy'
import type { RecommendationFoodV2, RecommendationQueueState, UserNutritionState } from './types'

export const USE_RECOMMENDATION_V2 = true

export function fitAdjustablePortionsToBudget(
  items: RecommendationFoodV2[],
  state: UserNutritionState
): RecommendationFoodV2[] {
  return items.map(item => {
    if (item.calories <= state.remainingCalories) return item
    if (
      item.item_type !== 'single' ||
      item.portion_type !== 'single_main' ||
      state.remainingCalories <= 0
    ) {
      return item
    }

    const rawRatio = state.remainingCalories / item.calories
    const ratio = Math.floor(rawRatio * 20) / 20
    if (ratio < 0.5 || ratio >= 1) return item

    const percent = Math.round(ratio * 100)
    const scale = (value: number) => Math.max(0, Math.round(value * ratio))
    return {
      ...item,
      id: `${item.id}:portion-${percent}`,
      name: `${item.name}（建議 ${percent}% 份量）`,
      calories: scale(item.calories),
      protein: scale(item.protein),
      fat: scale(item.fat),
      carbs: scale(item.carbs),
      source_note: `${item.source_note}；建議食用 ${percent}% 份量`,
    }
  })
}

export function rollRecommendationV2(params: {
  meal_type: MealType
  daily_targets: MealTargets
  day_state: TodayMealState
  today_food_logs: FoodLogEntry[]
  queue_state?: RecommendationQueueState | null
  exclude_names?: string[]
  seed?: number
}): {
  suggestion: MealSuggestion | null
  queue_state: RecommendationQueueState | null
  pool_exhausted: boolean
} {
  if (!params.day_state.allowDiceAndSuggest) {
    return { suggestion: null, queue_state: params.queue_state ?? null, pool_exhausted: true }
  }

  const state = buildUserNutritionState({
    dayState: params.day_state,
    dailyTargets: params.daily_targets,
    todayFoodLogs: params.today_food_logs,
    mealTime: params.meal_type,
  })
  const items = fitAdjustablePortionsToBudget(getRecommendationFoodsV2(), state)
  const blockedNames = new Set(params.exclude_names ?? [])
  const pool = blockedNames.size
    ? items.filter(item => !blockedNames.has(item.name))
    : items

  let queue = params.queue_state ?? null
  const recentlyShown = queue?.recentlyShownIds ?? []

  if (shouldRegenerateQueue(queue, state)) {
    queue = buildRecommendationQueue(pool, state, recentlyShown, params.seed ?? Date.now())
  }

  const nextId = peekQueueItemId(queue)
  let result = pickRecommendationWithFallback(pool, state, queue.recentlyShownIds, nextId)

  if (!result && getV2MainPool(params.meal_type).length > 0) {
    result = pickRecommendationWithFallback(pool, state, [], null)
    queue = buildRecommendationQueue(pool, state, [], (params.seed ?? Date.now()) + 17)
  }

  if (!result) {
    return { suggestion: null, queue_state: queue, pool_exhausted: true }
  }

  const suggestion = recommendationResultToMealSuggestion(result, params.meal_type)
  const nextQueue = advanceQueue(queue)

  return {
    suggestion,
    queue_state: nextQueue,
    pool_exhausted: nextQueue.cursor >= nextQueue.itemIds.length && nextQueue.itemIds.length === 0,
  }
}

export { getV2AddonItems, getV2MainPool, getRecommendationFoodsV2 }
