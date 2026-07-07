import type { DishRecommendationResult, DishTemplate, DishVariant } from './types'

const RICE_PORTION_VARIANT_RE = /^(半飯|少飯|正常飯|不飯)$/

export function isRicePortionVariantName(name: string): boolean {
  return RICE_PORTION_VARIANT_RE.test(name.trim())
}

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
    if (template.supportsRiceAmount && isRicePortionVariantName(variant.name)) {
      return `${template.name} · ${variant.name}`
    }
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
  if (template.supportsRiceAmount && isRicePortionVariantName(variant.name)) {
    return '整份便當估算（含主菜＋配菜；飯量選項指米飯份量）'
  }
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
