import type { MealSuggestion } from '@/lib/meal-engine-types'
import type { FoodLogEntry } from '@/lib/banks/types'
import { resolveDishByLabel, getDishTemplateById, getBrandItemsForTemplate } from './catalog'
import type { BrandItem, DishLogMeta, DishRecommendationResult, DishTemplate } from './types'
import { dishRecommendationToMealSuggestion } from './adapter'
import type { MealType } from '@/lib/checkin-utils'

export function normalizeLegacyFoodItemToDishRecommendation(params: {
  store?: string
  name: string
  calories?: number | null
  protein_g?: number | null
  meal_type: MealType
}): DishRecommendationResult | null {
  const resolved = resolveDishByLabel(params.name)
  if (resolved.template) {
    const template = resolved.template
    const brandItems = getBrandItemsForTemplate(template.id)
    const legacyBrand: BrandItem | null =
      params.store && params.store !== '餐點推薦'
        ? {
            id: `legacy-brand-${params.store}-${params.name}`,
            brandName: params.store,
            itemName: params.name,
            templateId: template.id,
            aliases: [],
            tags: [],
            calories: params.calories ?? template.typicalCalories.mid,
            protein: params.protein_g ?? template.typicalProtein?.mid,
            sourceType: 'database_estimate',
            confidence: 'medium',
          }
        : null

    return {
      template,
      variant: resolved.variant ?? null,
      brandItems: legacyBrand ? [legacyBrand, ...brandItems] : brandItems,
      score: { total: 0, calorieFit: 0, proteinFit: 0, fatPenalty: 0, adjustability: 0, confidence: 0, variantPenalty: 0 },
      reasons: [{ code: 'legacy', label: '依你之前的選擇整理成餐點建議' }],
      benefitPoints: [],
      eatingTips: template.recommendedAdjustments ?? [],
    }
  }

  if (!params.name) return null
  const fallbackTemplate: DishTemplate = {
    id: `legacy-template-${params.name}`,
    name: params.name,
    foodType: 'meal',
    category: '外食',
    aliases: [params.name],
    tags: [],
    typicalCalories: {
      min: Math.max(200, (params.calories ?? 600) - 100),
      mid: params.calories ?? 600,
      max: (params.calories ?? 600) + 100,
    },
    typicalProtein: params.protein_g
      ? { min: Math.max(0, params.protein_g - 8), mid: params.protein_g, max: params.protein_g + 8 }
      : undefined,
    sourceType: 'database_estimate',
    confidence: 'low',
  }
  const legacyBrand: BrandItem | null =
    params.store
      ? {
          id: `legacy-brand-${params.store}-${params.name}`,
          brandName: params.store,
          itemName: params.name,
          templateId: fallbackTemplate.id,
          aliases: [],
          tags: [],
          calories: params.calories ?? fallbackTemplate.typicalCalories.mid,
          protein: params.protein_g ?? undefined,
          sourceType: 'database_estimate',
          confidence: 'medium',
        }
      : null

  return {
    template: fallbackTemplate,
    variant: null,
    brandItems: legacyBrand ? [legacyBrand] : [],
    score: { total: 0, calorieFit: 0, proteinFit: 0, fatPenalty: 0, adjustability: 0, confidence: 0, variantPenalty: 0 },
    reasons: [{ code: 'legacy_fallback', label: '先用常見外食資料幫你估算' }],
    benefitPoints: [],
    eatingTips: [],
    dataNote: '實際熱量會因店家、份量、醬汁而不同。',
  }
}

export function normalizeLegacyRecommendation(
  suggestion: MealSuggestion,
  mealType: MealType
): MealSuggestion {
  if (suggestion.dish_recommendation) return suggestion
  const primary = suggestion.lines[0]?.item
  if (!primary) return suggestion
  const dish = normalizeLegacyFoodItemToDishRecommendation({
    store: primary.store,
    name: primary.name,
    calories: primary.calories,
    protein_g: primary.protein_g,
    meal_type: mealType,
  })
  if (!dish) return suggestion
  return dishRecommendationToMealSuggestion(dish, mealType)
}

export function normalizeMealLog(log: FoodLogEntry): FoodLogEntry {
  if (log.dish_log_meta) return log
  const label = log.display_label ?? log.name
  const resolved = resolveDishByLabel(label)
  if (!resolved.template && !log.store) return log
  const template = resolved.template ?? getDishTemplateById(`legacy-template-${label}`)
  if (!template) return log

  const meta: DishLogMeta = {
    logType: resolved.brandItem ? 'brand_item' : resolved.variant ? 'dish_variant' : 'dish_template',
    dishTemplateId: template.id,
    dishVariantId: resolved.variant?.id,
    brandItemId: resolved.brandItem?.id,
    name: label,
    sourceType: 'database_estimate',
    estimateRange: {
      caloriesMin: template.typicalCalories.min,
      caloriesMax: template.typicalCalories.max,
      proteinMin: template.typicalProtein?.min,
      proteinMax: template.typicalProtein?.max,
    },
  }
  return { ...log, dish_log_meta: meta }
}
