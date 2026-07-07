import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import type { MealType } from '@/lib/checkin-utils'
import type { HighlightKey, MealLine, MealSuggestion } from '@/lib/meal-engine-types'
import { suggestionId } from '@/lib/meal-engine-types'
import type { DishRecommendationResult, DishVariant, BrandItem, DishTemplate } from './types'
import { sourceTypeLabel } from './reason-copy'
import { macrosSource, recommendationDisplayName } from './display'

function dishMacros(result: DishRecommendationResult) {
  const src = macrosSource(result.template, result.variant)
  return {
    calories: src.typicalCalories.mid,
    protein_g: src.typicalProtein?.mid ?? 0,
    fat_g: src.typicalFat?.mid ?? 0,
    carbs_g: src.typicalCarbs?.mid ?? 0,
  }
}

function dishToConvenienceItem(
  name: string,
  macros: ReturnType<typeof dishMacros>,
  mealTime: MealType
): ConvenienceItem {
  return {
    id: `dish-${name}`,
    name,
    store: '餐點推薦',
    source: 'chain',
    category: mealTime,
    role: 'combo',
    portionable: false,
    tags: [],
    calories: macros.calories,
    protein_g: macros.protein_g,
    carbs_g: macros.carbs_g,
    fat_g: macros.fat_g,
    price: 0,
    photo_url: '',
    description: '',
  }
}

function highlightKeyForDish(result: DishRecommendationResult): HighlightKey {
  const protein = result.variant?.typicalProtein ?? result.template.typicalProtein
  if (protein && protein.mid >= 30) return 'high_protein'
  if (result.template.typicalCalories.mid <= 450) return 'light_meal'
  return 'calorie_fit'
}

export function dishRecommendationToMealSuggestion(
  result: DishRecommendationResult,
  mealTime: MealType,
  selectedVariant?: DishVariant | null
): MealSuggestion {
  const variant = selectedVariant ?? result.variant
  const displayName = recommendationDisplayName(result.template, variant)
  const macros = dishMacros({ ...result, variant: variant ?? result.variant })
  const line: MealLine = {
    item: dishToConvenienceItem(displayName, macros, mealTime),
    portion: 'full',
  }

  return {
    id: suggestionId([line]),
    meal_type: mealTime,
    lines: [line],
    totals: {
      calories: macros.calories,
      protein_g: macros.protein_g,
      carbs_g: macros.carbs_g,
      fat_g: macros.fat_g,
      price: 0,
    },
    highlight: `推薦你吃 ${displayName}`,
    highlight_key: highlightKeyForDish(result),
    stores: [],
    nutrition_score: Math.round(result.score.total),
    recommendation_reason: result.reasons,
    recommendation_benefit_points: result.benefitPoints,
    confidence_level: result.template.sourceType === 'official' ? 'official' : 'estimated',
    dish_recommendation: {
      ...result,
      selectedVariantId: variant?.id ?? null,
      selectedBrandItemId: null,
    },
  }
}

export function formatBrandItemLine(item: BrandItem): string {
  return `${item.brandName}｜${item.itemName}`
}

export function formatCalorieRange(template: DishTemplate, variant?: DishVariant | null): string {
  const c = macrosSource(template, variant).typicalCalories
  return `${c.min}–${c.max} kcal`
}

export function formatProteinRange(template: DishTemplate, variant?: DishVariant | null): string | null {
  const p = macrosSource(template, variant).typicalProtein
  if (!p) return null
  return `約 ${p.min}–${p.max}g`
}

export function formatFatRange(template: DishTemplate, variant?: DishVariant | null): string | null {
  const f = macrosSource(template, variant).typicalFat
  if (!f) return null
  return `約 ${f.min}–${f.max}g`
}

export function brandSourceLabel(item: BrandItem): string {
  return sourceTypeLabel(item.sourceType)
}
