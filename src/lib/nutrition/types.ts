/** BetterBit Nutrition Accuracy — canonical types */

export type NutritionSourceType =
  | 'official'
  | 'barcode'
  | 'verified_brand_menu'
  | 'betterbit_template'
  | 'user_confirmed_estimate'
  | 'ai_photo_only'

export type AccuracyLevel = 'A' | 'B' | 'C' | 'D'

export type MealSceneCategory =
  | 'convenience_store'
  | 'supermarket'
  | 'warehouse_club'
  | 'fast_food'
  | 'drink_shop'
  | 'cafe'
  | 'bento_shop'
  | 'breakfast_shop'
  | 'hot_pot'
  | 'bbq'
  | 'japanese'
  | 'korean'
  | 'noodle_shop'
  | 'braised_snack'
  | 'fried_chicken'
  | 'night_market'
  | 'mall_food_court'
  | 'healthy_meal_box'
  | 'local_snack'
  | 'independent_restaurant'
  | 'unknown'

export type HighRiskTag =
  | 'bento'
  | 'hot_pot'
  | 'braised_snack'
  | 'fried_chicken'
  | 'bbq'
  | 'buffet'
  | 'night_market'
  | 'bubble_tea'
  | 'salad_dressing'
  | 'pasta'
  | 'curry_rice'
  | 'fried_rice'
  | 'fried_noodle'
  | 'beef_noodle'
  | 'teppanyaki'
  | 'donburi'
  | 'fried_platter'
  | 'combo_meal'
  | 'all_you_can_eat'

export type ConfirmationQuestionId = 'rice_portion' | 'cooking_method' | 'drink_sugar' | 'sauce_level' | 'portion_size'

export interface ConfirmationOption {
  id: string
  label: string
}

export interface ConfirmationQuestion {
  id: ConfirmationQuestionId
  prompt: string
  options: ConfirmationOption[]
  max_choices?: number
}

export interface MealScene {
  category: MealSceneCategory
  location_context?: string
  restaurant_name?: string
  is_high_risk: boolean
  high_risk_tags: HighRiskTag[]
  requires_confirmation: boolean
}

export interface FoodCandidate {
  id: string
  display_name: string
  canonical_food_name: string
  restaurant_name?: string
  confidence: number
  match_reason: string
}

export interface MacroNutrition {
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number
  sodium_mg?: number
}

export interface FoodDNATemplate extends MacroNutrition {
  template_id: string
  canonical_food_name: string
  category?: string
  portion_size: number
  portion_unit: string
  protein_density: number
  calorie_density: number
  portion_risk: 'low' | 'medium' | 'high'
  sauce_risk: 'low' | 'medium' | 'high'
  fried_risk: 'low' | 'medium' | 'high'
  sugar_risk: 'low' | 'medium' | 'high'
  satiety_score: number
  diet_score: number
  source_type: NutritionSourceType
  accuracy_level: AccuracyLevel
  requires_confirmation: boolean
  high_risk_tags: HighRiskTag[]
  add_on_options?: string[]
  substitution_options?: string[]
}

export interface PortionAdjustment {
  rice_portion?: 'less' | 'half' | 'normal' | 'extra'
  cooking_method?: 'fried' | 'braised' | 'grilled' | 'pan_fried' | 'steamed' | 'unknown'
  drink_sugar?: 'none' | 'light' | 'half' | 'full'
  sauce_level?: 'none' | 'less' | 'normal' | 'extra'
  portion_size?: 'small' | 'medium' | 'large' | 'half' | 'one' | 'two'
  add_on_ids?: string[]
  substitution_ids?: string[]
}

export interface AddOnDelta {
  id: string
  label: string
  kcal_delta: number
  protein_delta: number
  carbs_delta: number
  fat_delta: number
  diet_score_delta: number
}

export interface NutritionEstimateDraft {
  scene: MealScene
  candidate: FoodCandidate
  template: FoodDNATemplate
  adjustments: PortionAdjustment
  macros: MacroNutrition
  satiety_score: number
  diet_score: number
  source_type: NutritionSourceType
  accuracy_level: AccuracyLevel
  requires_confirmation: boolean
  confirmation_questions: ConfirmationQuestion[]
  can_quick_add: boolean
  can_write_log: boolean
  block_reason?: string
}

export interface UserConfirmationAnswers {
  rice_portion?: string
  cooking_method?: string
  drink_sugar?: string
  sauce_level?: string
  portion_size?: string
  user_confirmed: boolean
  selected_candidate_id?: string
}

export interface FinalNutritionEstimate {
  name: string
  store?: string
  location_context?: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number
  sodium_mg?: number
  source_type: NutritionSourceType
  accuracy_level: AccuracyLevel
  satiety_score: number
  diet_score: number
  template_id?: string
  user_confirmed: boolean
  ready_for_food_log: boolean
}

export interface AccuracyEngineInput {
  /** Raw AI or user label */
  label: string
  store?: string
  location_context?: string
  ai_confidence?: number
  source_type?: NutritionSourceType
  /** Known verified menu item — skips template guess */
  verified_menu?: Partial<FoodDNATemplate> & MacroNutrition
  barcode_hit?: boolean
  photo_parse?: boolean
}

export interface FoodLogWritePayload {
  id: string
  name: string
  store?: string
  calories: number
  protein_g: number
  carbs_g?: number
  fat_g?: number
  confidence?: 'high' | 'medium' | 'low'
  source: 'search' | 'dice' | 'plan' | 'free_text' | 'photo' | 'frequent'
  user_declared: true
  logged_at: string
}
