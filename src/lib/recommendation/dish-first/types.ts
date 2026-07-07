import type { FoodType } from '@/lib/nutrition/p0-common-foods/types'

export type DishSourceType = 'official' | 'database_estimate' | 'manual' | 'user_custom'
export type DishConfidence = 'high' | 'medium' | 'low'

export interface MacroRange {
  min: number
  mid: number
  max: number
}

export interface ServingOption {
  label: string
  amount: number | null
  unit: string
  multiplier?: number
}

export interface DishTemplate {
  id: string
  name: string
  foodType: FoodType
  category: string
  aliases: string[]
  tags: string[]
  description?: string
  typicalCalories: MacroRange
  typicalProtein?: MacroRange
  typicalFat?: MacroRange
  typicalCarbs?: MacroRange
  sodium?: Partial<MacroRange>
  defaultServing?: { amount: number; unit: string }
  servingOptions?: ServingOption[]
  recommendedAdjustments?: string[]
  supportsRiceAmount?: boolean
  supportsSauce?: boolean
  supportsOilOptions?: boolean
  supportsCookingMethod?: boolean
  supportsSugarLevel?: boolean
  supportsToppings?: boolean
  sourceType: DishSourceType
  confidence: DishConfidence
  /** Broad categories (火鍋、滷味) must show a specific variant, not template name only */
  requiresVariant?: boolean
}

export interface DishVariant {
  id: string
  templateId: string
  name: string
  aliases: string[]
  tags: string[]
  typicalCalories: MacroRange
  typicalProtein?: MacroRange
  typicalFat?: MacroRange
  typicalCarbs?: MacroRange
  recommendedAdjustments?: string[]
  variantHint?: string
  sourceType: DishSourceType
  confidence: DishConfidence
}

export interface BrandItem {
  id: string
  brandName: string
  itemName: string
  templateId?: string
  variantId?: string
  aliases: string[]
  tags: string[]
  calories: number
  protein?: number
  fat?: number
  carbs?: number
  sodium?: number
  sourceType: DishSourceType
  confidence: DishConfidence
  sourceUrl?: string
  note?: string
}

export interface RecommendationScore {
  total: number
  calorieFit: number
  proteinFit: number
  fatPenalty: number
  adjustability: number
  confidence: number
  variantPenalty: number
}

export interface DishRecommendationResult {
  template: DishTemplate
  variant: DishVariant | null
  brandItems: BrandItem[]
  score: RecommendationScore
  reasons: Array<{ code: string; label: string }>
  benefitPoints: string[]
  eatingTips: string[]
  dataNote?: string
}

export type DishLogType = 'dish_template' | 'dish_variant' | 'brand_item' | 'manual'

export interface DishEstimateRange {
  caloriesMin?: number
  caloriesMax?: number
  proteinMin?: number
  proteinMax?: number
}

export interface DishLogMeta {
  logType: DishLogType
  dishTemplateId?: string
  dishVariantId?: string
  brandItemId?: string
  name: string
  estimateRange?: DishEstimateRange
  sourceType: DishSourceType
  servingLabel?: string
  servingMultiplier?: number
  riceAmount?: 'less' | 'normal' | 'extra'
  sauceAmount?: 'none' | 'less' | 'normal' | 'more'
}

export interface DishCatalogSeed {
  templates: DishTemplate[]
  variants: DishVariant[]
  brandItems: BrandItem[]
}

export type DishSearchHitKind = 'template' | 'variant' | 'brand'

export interface DishSearchHit {
  kind: DishSearchHitKind
  score: number
  template?: DishTemplate
  variant?: DishVariant
  brandItem?: BrandItem
  label: string
  subtitle?: string
}
