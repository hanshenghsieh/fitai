export type FoodType = 'meal' | 'ingredient' | 'staple' | 'sauce' | 'drink' | 'snack'

export type FoodSourceType = 'official' | 'database_estimate' | 'manual' | 'user_custom'

export interface ServingOption {
  label: string
  amount: number | null
  unit: string
}

export interface CommonFoodItem {
  id: string
  name: string
  category: string
  foodType: FoodType
  sourceType: FoodSourceType
  aliases: string[]
  tags: string[]
  brand?: string
  defaultServing: { amount: number; unit: string }
  servingOptions: ServingOption[]
  baseAmount: number
  baseUnit: string
  kcalBase: number
  proteinBase_g: number
  fatBase_g: number
  carbsBase_g: number
  sodiumBase_mg: number
  smallAmount: number
  normalAmount: number
  largeAmount: number
  defaultUnit: string
  kcalDefault: number
  proteinDefault_g: number
  fatDefault_g: number
  carbsDefault_g: number
  sodiumDefault_mg: number
  supportsOilOptions: boolean
  supportsCookingMethod: boolean
  supportsSauce: boolean
  supportsRiceAmount: boolean
  supportsSugarLevel: boolean
  supportsToppings: boolean
}

export type PortionPresetId = 'small' | 'normal' | 'large' | 'custom'

export type RiceAmount = 'less' | 'normal' | 'extra'

export type SugarLevel = 'none' | 'light' | 'half' | 'full'

export interface FoodRecordDraft {
  p0_food_id: string
  foodType: FoodType
  sourceType: FoodSourceType
  portionPreset: PortionPresetId
  amount: number
  unit: string
  oilLevel?: 'none' | 'light' | 'normal' | 'heavy'
  cookingMethod?: 'boiled' | 'steamed' | 'grilled' | 'stir_fried' | 'deep_fried'
  sauceLevel?: 'none' | 'light' | 'normal' | 'heavy'
  riceAmount?: RiceAmount
  sugarLevel?: SugarLevel
  toppings?: string[]
  manualOverride?: {
    calories?: number | null
    protein_g?: number | null
    carbs_g?: number | null
    fat_g?: number | null
    sodium_mg?: number | null
  }
}

export interface FoodRecordNutrition {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  sodium_mg: number
}

export interface P0SearchHit {
  item: CommonFoodItem
  score: number
}

/** Raw row shape from BetterBit P0 seed JSON */
export interface P0SeedRow {
  food_id: string
  name: string
  primary_category: string
  all_categories?: string
  foodType: FoodType
  sourceType: FoodSourceType
  defaultAmount: number
  defaultUnit: string
  smallAmount: number
  normalAmount: number
  largeAmount: number
  baseAmount: number
  baseUnit: string
  kcalBase: number
  proteinBase_g: number
  fatBase_g: number
  carbsBase_g: number
  sodiumBase_mg: number
  kcalDefault: number
  proteinDefault_g: number
  fatDefault_g: number
  carbsDefault_g: number
  sodiumDefault_mg: number
  aliases?: string
  tags?: string
  brand?: string
  supportsOil?: boolean
  supportsCookingMethod?: boolean
  supportsSauce?: boolean
  supportsRiceAmount?: boolean
  supportsSugarLevel?: boolean
  supportsToppings?: boolean
}
