/** Food Intelligence Layer — staging-only derived fields (never mutates nutrition). */

export type DietTag =
  | 'high_protein'
  | 'low_calorie'
  | 'low_fat'
  | 'low_sugar'
  | 'high_fiber'
  | 'weight_loss'
  | 'post_workout'
  | 'pre_workout'
  | 'vegetarian'
  | 'high_satiety'
  | 'drink'
  | 'dessert'
  | 'fried'
  | 'processed'
  | 'high_sodium'

export type FoodCategory =
  | '主餐'
  | '副餐'
  | '飲料'
  | '甜點'
  | '配菜'
  | '早餐'
  | '火鍋料'
  | '便利商店商品'
  | '手搖飲'

export type ProcessingLevel = 'whole_food' | 'lightly_processed' | 'processed' | 'ultra_processed'

export type MealContextSlot = 'breakfast' | 'lunch' | 'dinner' | 'late_night' | 'snack'

export type RecommendationRule =
  | 'protein_gap_good'
  | 'protein_gap_poor'
  | 'fat_limit_good'
  | 'fat_limit_bad'
  | 'sugar_limit_good'
  | 'sugar_limit_bad'
  | 'calorie_limit_good'
  | 'calorie_limit_bad'
  | 'dinner_safe'
  | 'dinner_heavy'
  | 'breakfast_fit'
  | 'breakfast_poor'
  | 'late_night_safe'
  | 'late_night_heavy'
  | 'post_workout_good'
  | 'post_workout_poor'
  | 'pre_workout_good'
  | 'low_satiety_drink'
  | 'high_satiety_solid'
  | 'weight_loss_good'
  | 'weight_loss_poor'
  | 'fried_avoid'
  | 'runtime_blocked'

export type MealGraphEdgeType =
  | 'main_to_side'
  | 'main_to_drink'
  | 'main_to_replacement'
  | 'side_to_replacement'

export interface MealContextScores {
  breakfast: number
  lunch: number
  dinner: number
  late_night: number
  snack: number
}

export interface RecommendedAddon {
  item_id: string
  name: string
  reason: string
}

export interface RecommendedReplacement {
  item_id: string
  name: string
  reason: string
}

export interface MealGraphEdge {
  from_id: string
  to_id: string
  edge_type: MealGraphEdgeType
  weight: number
  explain: string
  /** false when source or target is confidence D — no runtime recommendation */
  runtime_safe: boolean
}

export interface FoodIntelligenceProfile {
  item_id: string
  version: string
  generated_at: string
  popularity_score: number
  meal_context: MealContextScores
  diet_tags: DietTag[]
  food_category: FoodCategory
  satiety_score: number
  processing_level: ProcessingLevel
  recommended_addons: RecommendedAddon[]
  recommended_replacements: RecommendedReplacement[]
  recommendation_rules: RecommendationRule[]
  meal_graph_edges: MealGraphEdge[]
  explain: string[]
}

export interface FoodIntelligenceItemInput {
  id: string
  name: string
  store: string
  source?: string
  category?: 'breakfast' | 'lunch' | 'dinner'
  role?: string
  tags?: string[]
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number
  sugar_g?: number
  sodium_mg?: number
  verification?: { confidence?: 'A' | 'B' | 'C' | 'D' }
  nutrition_trace?: { confidence?: 'A' | 'B' | 'C' | 'D' }
}

export interface FoodIntelligenceCatalog {
  items: FoodIntelligenceItemInput[]
  byId: Map<string, FoodIntelligenceItemInput>
  byStore: Map<string, FoodIntelligenceItemInput[]>
}

export interface FoodIntelligenceManifest {
  version: string
  generated_at: string
  policy: 'staging_intelligence_only'
  source_manifest: string
  item_count: number
  profiles: Record<string, FoodIntelligenceProfile>
}

export interface FoodIntelligenceReport {
  generated_at: string
  items_processed: number
  coverage_pct: number
  high_risk_count: number
  meal_graph_edges: number
  recommended_addons: number
  recommended_replacements: number
  by_category: Record<FoodCategory, number>
  by_processing: Record<ProcessingLevel, number>
  runtime_blocked_edges: number
}
