import type { MealType } from '@/lib/checkin-utils'
import {
  BLOCKED_MAIN_ROLES,
  MAIN_CONFIDENCE_LEVELS,
  MAIN_MEAL_ROLES,
  MAIN_PORTION_TYPES,
  type RecommendationFoodV2,
} from './types'

export function isMainRecommendableItem(item: RecommendationFoodV2): boolean {
  if (!item.is_recommendable) return false
  if (!MAIN_MEAL_ROLES.includes(item.meal_role)) return false
  if (!MAIN_PORTION_TYPES.includes(item.portion_type)) return false
  if (BLOCKED_MAIN_ROLES.includes(item.meal_role)) return false
  if (!MAIN_CONFIDENCE_LEVELS.includes(item.confidence_level)) return false
  return true
}

export function isAddonItem(item: RecommendationFoodV2): boolean {
  return item.portion_type === 'addon' && item.is_recommendable === false
}

export function mealTimeMatchesItem(mealTime: MealType, item: RecommendationFoodV2): boolean {
  if (item.meal_time.includes(mealTime as 'breakfast' | 'lunch' | 'dinner')) return true
  if (mealTime === 'dinner' && item.meal_time.includes('late_night')) return true
  if (mealTime === 'lunch' && item.meal_time.includes('late_night')) return true
  return false
}

export function filterMainRecommendablePool(
  items: RecommendationFoodV2[],
  mealTime: MealType
): RecommendationFoodV2[] {
  return items.filter(item => isMainRecommendableItem(item) && mealTimeMatchesItem(mealTime, item))
}

export function filterAddonPool(items: RecommendationFoodV2[]): RecommendationFoodV2[] {
  return items.filter(isAddonItem)
}
