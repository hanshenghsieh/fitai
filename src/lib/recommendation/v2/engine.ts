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
import type { RecommendationQueueState } from './types'

export const USE_RECOMMENDATION_V2 = true

export function rollRecommendationV2(params: {
  meal_type: MealType
  daily_targets: MealTargets
  day_state: TodayMealState
  today_food_logs: FoodLogEntry[]
  queue_state?: RecommendationQueueState | null
  seed?: number
}): {
  suggestion: MealSuggestion | null
  queue_state: RecommendationQueueState | null
  pool_exhausted: boolean
} {
  if (!params.day_state.allowDiceAndSuggest) {
    return { suggestion: null, queue_state: params.queue_state ?? null, pool_exhausted: true }
  }

  const items = getRecommendationFoodsV2()
  const state = buildUserNutritionState({
    dayState: params.day_state,
    dailyTargets: params.daily_targets,
    todayFoodLogs: params.today_food_logs,
    mealTime: params.meal_type,
  })

  let queue = params.queue_state ?? null
  const recentlyShown = queue?.recentlyShownIds ?? []

  if (shouldRegenerateQueue(queue, state)) {
    queue = buildRecommendationQueue(items, state, recentlyShown, params.seed ?? Date.now())
  }

  const nextId = peekQueueItemId(queue)
  let result = pickRecommendationWithFallback(items, state, queue.recentlyShownIds, nextId)

  if (!result && getV2MainPool(params.meal_type).length > 0) {
    result = pickRecommendationWithFallback(items, state, [], null)
    queue = buildRecommendationQueue(items, state, [], (params.seed ?? Date.now()) + 17)
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
