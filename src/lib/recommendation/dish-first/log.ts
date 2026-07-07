import type { FoodLogEntry } from '@/lib/banks/types'
import type { DishRecommendationResult, DishLogMeta, DishVariant, BrandItem } from './types'

export function buildDishLogMeta(params: {
  result: DishRecommendationResult
  selectedVariant?: DishVariant | null
  selectedBrandItem?: BrandItem | null
}): DishLogMeta {
  const { result, selectedVariant, selectedBrandItem } = params
  const variant = selectedVariant ?? result.variant
  const calories = selectedBrandItem
    ? { min: selectedBrandItem.calories, mid: selectedBrandItem.calories, max: selectedBrandItem.calories }
    : variant?.typicalCalories ?? result.template.typicalCalories
  const protein = selectedBrandItem?.protein
    ? { min: selectedBrandItem.protein, mid: selectedBrandItem.protein, max: selectedBrandItem.protein }
    : variant?.typicalProtein ?? result.template.typicalProtein

  const logType = selectedBrandItem ? 'brand_item' : variant ? 'dish_variant' : 'dish_template'
  const sourceType = selectedBrandItem?.sourceType ?? variant?.sourceType ?? result.template.sourceType

  return {
    logType,
    dishTemplateId: result.template.id,
    dishVariantId: variant?.id,
    brandItemId: selectedBrandItem?.id,
    name: selectedBrandItem ? `${selectedBrandItem.brandName} ${selectedBrandItem.itemName}` : variant?.name ?? result.template.name,
    sourceType,
    estimateRange: {
      caloriesMin: calories.min,
      caloriesMax: calories.max,
      proteinMin: protein?.min,
      proteinMax: protein?.max,
    },
  }
}

export function buildFoodLogFromDishRecommendation(params: {
  result: DishRecommendationResult
  selectedVariant?: DishVariant | null
  selectedBrandItem?: BrandItem | null
  slot?: FoodLogEntry['slot']
  id?: string
}): FoodLogEntry {
  const { result, selectedVariant, selectedBrandItem, slot } = params
  const meta = buildDishLogMeta({ result, selectedVariant, selectedBrandItem })
  const calories = selectedBrandItem?.calories ?? (selectedVariant ?? result.variant)?.typicalCalories.mid ?? result.template.typicalCalories.mid
  const protein =
    selectedBrandItem?.protein ?? (selectedVariant ?? result.variant)?.typicalProtein?.mid ?? result.template.typicalProtein?.mid ?? null
  const fat = selectedBrandItem?.fat ?? (selectedVariant ?? result.variant)?.typicalFat?.mid ?? result.template.typicalFat?.mid
  const carbs = selectedBrandItem?.carbs ?? (selectedVariant ?? result.variant)?.typicalCarbs?.mid ?? result.template.typicalCarbs?.mid

  return {
    id: params.id ?? `dish-${result.template.id}-${Date.now()}`,
    name: meta.name,
    display_label: meta.name,
    store: selectedBrandItem?.brandName,
    calories,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
    slot,
    logged_at: new Date().toISOString(),
    user_declared: true,
    source: 'dice',
    nutrition_status: sourceTypeToNutritionStatus(meta.sourceType),
    nutrition_confidence: meta.sourceType === 'official' ? 'A' : 'B',
    capture_status: 'resolved',
    dish_log_meta: meta,
  }
}

function sourceTypeToNutritionStatus(sourceType: DishLogMeta['sourceType']): FoodLogEntry['nutrition_status'] {
  if (sourceType === 'official') return 'official'
  return 'estimated'
}
