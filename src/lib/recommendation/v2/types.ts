import type { MealType } from '@/lib/checkin-utils'

export type ItemType = 'single' | 'combo'

export type MealRole =
  | 'main_meal'
  | 'light_meal'
  | 'side'
  | 'soup'
  | 'drink'
  | 'snack'
  | 'dessert'

export type PortionType = 'single_main' | 'combo' | 'addon' | 'drink_only'

export type MealTimeSlot = 'breakfast' | 'lunch' | 'dinner' | 'late_night'

export type VenueType =
  | 'convenience_store'
  | 'chain_restaurant'
  | 'breakfast_shop'
  | 'bento'
  | 'buffet'
  | 'street_food'
  | 'healthy_box'
  | 'custom'

export type ConfidenceLevel = 'official' | 'estimated' | 'low_estimate' | 'manual'

export type SourceType = 'official' | 'standard_estimate' | 'photo_estimate' | 'user_manual'

export type SauceLevel = 'none' | 'light' | 'normal' | 'heavy'

export interface EstimateBasis {
  rice_g?: number
  main_protein?: string
  vegetable_servings?: number
  cooking_method?: string
  sauce_level?: SauceLevel
  portion_note?: string
}

export interface RecommendationCopy {
  short_reason: string
  benefit_points: string[]
}

export interface RecommendationFoodV2 {
  id: string
  brand: string
  name: string
  item_type: ItemType
  calories: number
  protein: number
  fat: number
  carbs: number
  meal_role: MealRole
  portion_type: PortionType
  meal_time: MealTimeSlot[]
  venue_type: VenueType
  is_recommendable: boolean
  confidence_level: ConfidenceLevel
  source_type: SourceType
  source_url?: string
  source_note: string
  estimate_basis?: EstimateBasis
  tags: string[]
  recommendation_copy?: RecommendationCopy
}

export interface RecommendationFoodsV2File {
  version: string
  updated_at: string
  description: string
  items: RecommendationFoodV2[]
}

export interface UserNutritionState {
  remainingCalories: number
  proteinGap: number
  remainingFat: number
  remainingCarbs: number
  mealTime: MealType
  effectiveMealCalTarget: number
}

export interface ScoreMealInput {
  item: RecommendationFoodV2
  remainingCalories: number
  proteinGap: number
  remainingFat: number
  remainingCarbs: number
  mealTime: MealType
  recentlyShownIds: string[]
  effectiveMealCalTarget?: number
  brandCountsInQueue?: Record<string, number>
}

export interface ScoredMeal {
  item: RecommendationFoodV2
  score: number
  tier: number
  excluded?: boolean
  excludeReason?: string
}

export interface RecommendationQueueState {
  contextKey: string
  itemIds: string[]
  cursor: number
  recentlyShownIds: string[]
}

export interface RecommendationResultV2 {
  primary: RecommendationFoodV2
  addons: RecommendationFoodV2[]
  tier: number
  score: number
  reasons: Array<{ code: string; label: string }>
  benefitPoints: string[]
  confidenceLevel: ConfidenceLevel
  fallbackNote?: string
}

export const MAIN_MEAL_ROLES: MealRole[] = ['main_meal', 'light_meal']
export const MAIN_PORTION_TYPES: PortionType[] = ['single_main', 'combo']
export const MAIN_CONFIDENCE_LEVELS: ConfidenceLevel[] = ['official', 'estimated']
export const BLOCKED_MAIN_ROLES: MealRole[] = ['soup', 'drink', 'side', 'snack', 'dessert']

export const QUEUE_MAX_SIZE = 20
export const RECENTLY_SHOWN_BLOCK = 10
export const MAX_BRAND_PER_QUEUE = 3

export const OFFICIAL_TRUST_BONUS = 10
export const LOW_ESTIMATE_PENALTY = 30
