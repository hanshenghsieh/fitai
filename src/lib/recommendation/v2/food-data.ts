import type { MealType } from '@/lib/checkin-utils'
import foodsFile from '../../../../data/food-kb/recommendation-foods-v2.json'
import { filterAddonPool, filterMainRecommendablePool } from './pool-rules'
import type { RecommendationFoodV2, RecommendationFoodsV2File } from './types'

const parsed = foodsFile as RecommendationFoodsV2File

let cache: RecommendationFoodV2[] | null = null

export function getRecommendationFoodsV2(): RecommendationFoodV2[] {
  if (!cache) cache = parsed.items
  return cache
}

export function getV2MainPool(mealTime: MealType): RecommendationFoodV2[] {
  return filterMainRecommendablePool(getRecommendationFoodsV2(), mealTime)
}

export function getV2AddonItems(): RecommendationFoodV2[] {
  return filterAddonPool(getRecommendationFoodsV2())
}

export function getRecommendationFoodsV2Meta(): Pick<
  RecommendationFoodsV2File,
  'version' | 'updated_at' | 'description'
> {
  return {
    version: parsed.version,
    updated_at: parsed.updated_at,
    description: parsed.description,
  }
}

export function countV2FoodsByConfidence(): { official: number; estimated: number; manual: number; total: number } {
  const items = getRecommendationFoodsV2()
  return {
    official: items.filter(i => i.confidence_level === 'official').length,
    estimated: items.filter(i => i.confidence_level === 'estimated').length,
    manual: items.filter(i => i.confidence_level === 'manual').length,
    total: items.length,
  }
}
