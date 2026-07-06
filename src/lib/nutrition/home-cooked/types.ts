/** Home-cooked / decomposed meal nutrition — types */

export type WholeFoodCategory = 'protein' | 'carb' | 'veg' | 'fat' | 'sauce' | 'other'

/** How the ingredient was prepared — only shown when it materially changes macros. */
export type IngredientPrepMethod =
  | 'raw'
  | 'boiled'
  | 'steamed'
  | 'grilled'
  | 'pan_fried'
  | 'deep_fried'
  | 'stir_fried'

/** Meal-level oil use for mixed dishes (curry, stir-fry). Simpler than per-item prep. */
export type MealOilLevel = 'light' | 'normal' | 'heavy'

export type PortionUnit = 'g' | 'ml' | 'piece'

/** Per-100g (or per-100ml) reference nutrition — DB row shape. */
export interface WholeFoodReference {
  id: string
  name_zh: string
  name_en?: string
  category: WholeFoodCategory
  /** Aliases for AI / user text matching */
  aliases: string[]
  calories_per_100: number
  protein_g_per_100: number
  carbs_g_per_100: number
  fat_g_per_100: number
  fiber_g_per_100?: number
  sodium_mg_per_100?: number
  default_unit: PortionUnit
  /** For piece-based foods (egg, toast slice) */
  grams_per_piece?: number
  vegan?: boolean
  source?: 'tfda' | 'usda' | 'manual' | 'home_ingredient_db'
}

/** AI or user label before DB match */
export interface DetectedIngredientLine {
  /** Raw label from photo AI or user text, e.g. 「鮭魚塊」 */
  raw_label: string
  /** Matched whole_foods.id — null until resolved */
  food_id: string | null
  /** Display name after match */
  name_zh: string
  category: WholeFoodCategory
  confidence: 'high' | 'medium' | 'low' | 'unmatched'
  /** User-entered amount */
  amount: number | null
  unit: PortionUnit
  /** Only for protein / sauce when user opts in */
  prep_method?: IngredientPrepMethod
}

/** User fills weights → engine produces this */
export interface IngredientPortionResult {
  food_id: string | null
  name_zh: string
  amount: number
  unit: PortionUnit
  prep_method?: IngredientPrepMethod
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number
  sodium_mg?: number
}

export interface HomeCookedMealDraft {
  /** Original composite label, e.g. 「鮭魚+豆腐+高麗菜…」 */
  meal_label: string
  ingredients: DetectedIngredientLine[]
  meal_oil_level: MealOilLevel
  /** Meal-level prep applied to protein / fat items */
  meal_prep_method?: IngredientPrepMethod
  has_sauce: boolean
  sauce_amount_ml: number | null
}

export interface HomeCookedMealTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number
  sodium_mg?: number
  items: IngredientPortionResult[]
}

/** Stored on FoodLogEntry when resolved via weight-based home cooking flow */
export interface HomeCookedMeta {
  meal_label: string
  meal_oil_level: MealOilLevel
  meal_prep_method?: IngredientPrepMethod
  has_sauce: boolean
  sauce_amount_ml?: number | null
  ingredients: Array<
    Pick<
      IngredientPortionResult,
      'food_id' | 'name_zh' | 'amount' | 'unit' | 'prep_method' | 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'
    >
  >
  resolved_at: string
  source: 'home_cooked_portion'
}
