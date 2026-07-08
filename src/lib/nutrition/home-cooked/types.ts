/** Home-cooked / decomposed meal nutrition — types (BetterBit XLSX model) */

export type WholeFoodCategory = 'protein' | 'carb' | 'veg' | 'fat' | 'sauce' | 'other'

export type MealCookingMethod = 'boiled' | 'steamed' | 'grilled' | 'stir_fried' | 'deep_fried'

/** Maps to Excel Oil_Rules: 無油 / 少油 / 一般 / 多油 */
export type MealOilLevel = 'none' | 'light' | 'normal' | 'heavy'

/** Maps to Excel Sauce_Rules: 無 / 少 / 正常 / 多 */
export type SauceLevel = 'none' | 'light' | 'normal' | 'heavy'

export type PortionUnit = 'g' | 'ml' | 'piece'

/** Per-100g reference — from IngredientDB sheet */
export interface WholeFoodReference {
  id: string
  food_id: string
  name_zh: string
  category: WholeFoodCategory
  excel_category?: string
  state?: string
  aliases: string[]
  calories_per_100: number
  protein_g_per_100: number
  carbs_g_per_100: number
  fat_g_per_100: number
  fiber_g_per_100?: number
  sodium_mg_per_100?: number
  default_unit: PortionUnit
  grams_per_piece?: number
  vegan?: boolean
  source?: string
  note?: string
}

export interface OilRule {
  lookup_key: string
  cooking_method: string
  oil_level: string
  oil_g_per_meal: number
  note?: string
}

export interface SauceRule {
  sauce_level: string
  kcal: number
  protein_g: number
  fat_g: number
  carb_g: number
  sodium_mg: number
  note?: string
}

export interface DetectedIngredientLine {
  raw_label: string
  food_id: string | null
  name_zh: string
  category: WholeFoodCategory
  confidence: 'high' | 'medium' | 'low' | 'unmatched'
  amount: number | null
  unit: PortionUnit
}

export interface IngredientPortionResult {
  food_id: string | null
  name_zh: string
  amount: number
  unit: PortionUnit
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number
  sodium_mg?: number
}

export interface HomeCookedMealDraft {
  meal_label: string
  ingredients: DetectedIngredientLine[]
  meal_cooking_method: MealCookingMethod
  meal_oil_level: MealOilLevel
  sauce_level: SauceLevel
  quick_adjust?: MealQuickAdjust
  ingredient_weights?: IngredientWeightMeta[]
}

export type MealPortionSize = 'small' | 'normal' | 'large'
export type QuickAmountLevel = 'less' | 'normal' | 'more'
export type EatenLevel = 'all' | 'half' | 'little_left'

export interface MealQuickAdjust {
  mealPortion: MealPortionSize
  riceLevel: QuickAmountLevel
  meatLevel: QuickAmountLevel
  sauceAmount: QuickAmountLevel
  eatenLevel: EatenLevel
}

export interface IngredientWeightMeta {
  raw_label: string
  food_id: string | null
  estimated_weight_g: number
  adjusted_weight_g: number
  confidence: 'high' | 'medium' | 'low' | 'unmatched'
  source: 'photo_estimate' | 'user_adjusted'
}

export interface HomeCookedMealTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number
  sodium_mg?: number
  meal_oil_g?: number
  items: IngredientPortionResult[]
}

export interface HomeCookedMeta {
  meal_label: string
  meal_cooking_method: MealCookingMethod
  meal_oil_level: MealOilLevel
  sauce_level: SauceLevel
  meal_oil_g?: number
  ingredients: Array<
    Pick<
      IngredientPortionResult,
      'food_id' | 'name_zh' | 'amount' | 'unit' | 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'
    > & Partial<Pick<IngredientWeightMeta, 'estimated_weight_g' | 'adjusted_weight_g' | 'confidence' | 'source'>>
  >
  quick_adjust?: MealQuickAdjust
  resolved_at: string
  source: 'home_cooked_portion'
  nutrition_model: 'BetterBit_whole_food_nutrition_model_expanded_5x'
}
