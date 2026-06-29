import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import type { MealType } from '@/lib/checkin-utils'
import type { HighlightKey, MealLine, MealSuggestion } from '@/lib/meal-engine-types'
import { suggestionId } from '@/lib/meal-engine-types'
import type { RecommendationFoodV2, RecommendationResultV2 } from './types'

function venueToSource(venue: RecommendationFoodV2['venue_type']): ConvenienceItem['source'] {
  if (venue === 'convenience_store') return 'convenience'
  if (venue === 'street_food') return 'delivery'
  return 'chain'
}

function mealTimeToCategory(mealTime: MealType): ConvenienceItem['category'] {
  return mealTime
}

export function v2FoodToConvenienceItem(
  item: RecommendationFoodV2,
  mealTime: MealType
): ConvenienceItem {
  return {
    id: item.id,
    name: item.name,
    store: item.brand,
    source: venueToSource(item.venue_type),
    category: mealTimeToCategory(mealTime),
    role: 'combo',
    portionable: false,
    tags: item.tags,
    calories: item.calories,
    protein_g: item.protein,
    carbs_g: item.carbs,
    fat_g: item.fat,
    price: 0,
    photo_url: '',
    description: item.source_note,
  }
}

function highlightKeyForResult(result: RecommendationResultV2): HighlightKey {
  if (result.primary.tags.includes('高蛋白')) return 'high_protein'
  if (result.primary.meal_role === 'light_meal') return 'light_meal'
  if (result.tier <= 2) return 'calorie_fit'
  return 'balanced'
}

export function recommendationResultToMealSuggestion(
  result: RecommendationResultV2,
  mealTime: MealType
): MealSuggestion {
  const lines: MealLine[] = [result.primary, ...result.addons].map(item => ({
    item: v2FoodToConvenienceItem(item, mealTime),
    portion: 'full' as const,
  }))

  const totals = lines.reduce(
    (acc, line) => ({
      calories: acc.calories + line.item.calories,
      protein_g: acc.protein_g + line.item.protein_g,
      carbs_g: acc.carbs_g + line.item.carbs_g,
      fat_g: acc.fat_g + line.item.fat_g,
      price: acc.price + line.item.price,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, price: 0 }
  )

  const highlightKey = highlightKeyForResult(result)
  const copyTitle =
    result.primary.recommendation_copy?.short_reason ??
    (result.tier >= 5 ? '最接近你今天狀態的選擇' : '照今天剩餘熱量與蛋白質挑的')

  return {
    id: suggestionId(lines),
    meal_type: mealTime,
    lines,
    totals,
    highlight: copyTitle,
    highlight_key: highlightKey,
    stores: [...new Set(lines.map(l => l.item.store))],
    nutrition_score: Math.round(result.score),
    recommendation_reason: result.reasons,
    recommendation_debug_reason: [
      `v2 tier=${result.tier}`,
      `score=${Math.round(result.score)}`,
      `confidence=${result.confidenceLevel}`,
      result.fallbackNote ?? '',
    ]
      .filter(Boolean)
      .join(' · '),
    confidence_level: result.confidenceLevel,
    recommendation_benefit_points: result.benefitPoints,
    fallback_tier: result.tier,
  }
}
