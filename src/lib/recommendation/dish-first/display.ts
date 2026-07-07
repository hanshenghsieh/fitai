import type { DishRecommendationResult, DishTemplate, DishVariant } from './types'

export function templateRequiresSpecificVariant(template: DishTemplate): boolean {
  if (template.requiresVariant) return true
  const calSpan = template.typicalCalories.max - template.typicalCalories.min
  return template.confidence === 'low' && calSpan >= 300
}

export function recommendationDisplayName(
  template: DishTemplate,
  variant: DishVariant | null | undefined
): string {
  if (variant && (templateRequiresSpecificVariant(template) || variant.name !== template.name)) {
    return variant.name
  }
  return template.name
}

export function recommendationCategoryLine(
  template: DishTemplate,
  variant: DishVariant | null | undefined
): string | null {
  if (!variant || !templateRequiresSpecificVariant(template)) return null
  if (variant.name === template.name) return null
  return template.name
}

export function macrosSource(
  template: DishTemplate,
  variant: DishVariant | null | undefined
): Pick<DishVariant, 'typicalCalories' | 'typicalProtein' | 'typicalFat' | 'typicalCarbs'> {
  if (variant) {
    return {
      typicalCalories: variant.typicalCalories,
      typicalProtein: variant.typicalProtein ?? template.typicalProtein,
      typicalFat: variant.typicalFat ?? template.typicalFat,
      typicalCarbs: variant.typicalCarbs ?? template.typicalCarbs,
    }
  }
  return template
}

export function eatingTipsForRecommendation(result: DishRecommendationResult): string[] {
  const { template, variant } = result
  if (variant?.recommendedAdjustments?.length) return variant.recommendedAdjustments.slice(0, 3)
  if (result.eatingTips.length) return result.eatingTips
  return template.recommendedAdjustments ?? []
}
