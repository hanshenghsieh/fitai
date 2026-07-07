import type { TodayMealState } from '@/lib/engines/next-meal-engine'
import type { DishTemplate, DishVariant, RecommendationScore } from './types'

const SOURCE_CONFIDENCE: Record<DishTemplate['sourceType'], number> = {
  official: 12,
  database_estimate: 6,
  manual: 3,
  user_custom: 1,
}

export function scoreDishTemplateForUserDay(
  template: DishTemplate,
  day: TodayMealState,
  variant?: DishVariant | null
): RecommendationScore {
  const calories = variant?.typicalCalories ?? template.typicalCalories
  const protein = variant?.typicalProtein ?? template.typicalProtein
  const fat = variant?.typicalFat ?? template.typicalFat
  const remaining = day.remainingCalories

  let calorieFit = 0
  if (calories.mid <= remaining + 150) calorieFit += 28
  else if (calories.min <= remaining + 150) calorieFit += 14
  if (calories.min > remaining + 300) calorieFit -= 35
  if (remaining <= 80 && calories.mid <= remaining + 80) calorieFit += 10

  let proteinFit = 0
  if (day.proteinGap > 12 && protein && protein.mid >= 25) proteinFit += 24
  else if (day.proteinGap > 0 && protein && protein.mid >= 18) proteinFit += 12
  if (day.highProteinPriority && protein && protein.mid >= 30) proteinFit += 8
  if (day.proteinGap > 20 && protein && protein.mid >= 38) proteinFit += 12
  if (template.tags.includes('高蛋白')) proteinFit += 4

  let fatPenalty = 0
  if (fat && fat.mid >= 32 && remaining > 0) fatPenalty -= 10
  if (fat && fat.mid >= 40) fatPenalty -= 8

  let adjustability = 0
  if (template.supportsRiceAmount || template.supportsSauce) adjustability += 8
  if ((template.recommendedAdjustments?.length ?? 0) > 0) adjustability += 6

  let variantPenalty = 0
  if (variant) {
    if (variant.tags.includes('炸') || variant.name.includes('炸')) {
      if (remaining < 250) variantPenalty -= 30
      if (fat && fat.mid >= 40) variantPenalty -= 12
    }
  }

  const confidence = SOURCE_CONFIDENCE[template.sourceType] ?? 0
  const total = calorieFit + proteinFit + fatPenalty + adjustability + confidence + variantPenalty

  return {
    total,
    calorieFit,
    proteinFit,
    fatPenalty,
    adjustability,
    confidence,
    variantPenalty,
  }
}

export function scoreDishVariantForUserDay(
  variant: DishVariant,
  template: DishTemplate,
  day: TodayMealState
): RecommendationScore {
  const base = scoreDishTemplateForUserDay(template, day, variant)
  let extra = 0

  const highCalLabel = /牛奶|麻辣|炸|控肉|壽喜|王子麵|甜不辣|大碗|雙主菜|培根|起司|凱薩/
  const lowCalLabel = /小份|半飯|少飯|清湯|昆布|沙拉|豆腐|青菜|雞胸|地瓜|茶葉蛋|小飯糰|小地瓜/
  const highProteinLabel = /雞胸|牛肉|海鮮|雞腿|雙倍肉|高蛋白|茶葉蛋/

  if (day.remainingCalories <= 350) {
    if (highCalLabel.test(variant.name)) extra -= 28
    if (lowCalLabel.test(variant.name)) extra += 18
  }
  if (day.proteinGap > 15 && highProteinLabel.test(variant.name)) extra += 14
  if (variant.tags.includes('減脂友善') && day.remainingCalories <= 500) extra += 10
  if (variant.tags.includes('炸') && day.remainingCalories < 400) extra -= 20
  if (/飯糰|王子麵|炒飯/.test(variant.name) && day.remainingCalories <= 400) extra -= 12

  return { ...base, total: base.total + extra, variantPenalty: (base.variantPenalty ?? 0) + extra }
}

export function pickBestVariantForDay(
  variants: DishVariant[],
  template: DishTemplate,
  day: TodayMealState
): DishVariant | null {
  if (!variants.length) return null

  const ranked = [...variants].sort(
    (a, b) => scoreDishVariantForUserDay(b, template, day).total - scoreDishVariantForUserDay(a, template, day).total
  )
  return ranked[0] ?? null
}

export function sortBrandItemsByTrust<T extends { sourceType: DishTemplate['sourceType']; confidence: DishTemplate['confidence'] }>(
  items: T[]
): T[] {
  const rank = (item: T) => {
    const source = item.sourceType === 'official' ? 100 : item.sourceType === 'database_estimate' ? 60 : 20
    const conf = item.confidence === 'high' ? 12 : item.confidence === 'medium' ? 6 : 0
    return source + conf
  }
  return [...items].sort((a, b) => rank(b) - rank(a))
}
