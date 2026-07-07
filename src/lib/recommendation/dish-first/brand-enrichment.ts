import { getRecommendationFoodsV2 } from '@/lib/recommendation/v2/food-data'
import type { RecommendationFoodV2 } from '@/lib/recommendation/v2/types'
import { inferVariantIdForBrand } from './brand-display'
import { getVariantsForTemplate, normalizeDishLabel } from './catalog'
import type { BrandItem, DishTemplate } from './types'

const MAX_BRANDS_PER_TEMPLATE = 8

function v2SourceType(item: RecommendationFoodV2): BrandItem['sourceType'] {
  if (item.source_type === 'official' || item.confidence_level === 'official') return 'official'
  if (item.source_type === 'manual') return 'manual'
  return 'database_estimate'
}

function v2Confidence(item: RecommendationFoodV2): BrandItem['confidence'] {
  if (item.confidence_level === 'official') return 'high'
  if (item.confidence_level === 'low_estimate') return 'low'
  return 'medium'
}

function matchesDishTemplate(item: RecommendationFoodV2, template: DishTemplate): boolean {
  if (item.portion_type !== 'single_main' || item.item_type !== 'single') return false
  const itemNorm = normalizeDishLabel(item.name)
  if (!itemNorm) return false

  const labels = [template.name, ...template.aliases].map(normalizeDishLabel).filter(Boolean)
  for (const label of labels) {
    if (itemNorm === label) return true
    if (label.length >= 3 && itemNorm.includes(label)) return true
    if (label.length >= 3 && label.includes(itemNorm)) return true
  }
  return false
}

function v2ToBrandItem(item: RecommendationFoodV2, templateId: string, template: DishTemplate): BrandItem {
  const variants = getVariantsForTemplate(templateId)
  const itemName = item.name
  const variantId = inferVariantIdForBrand(itemName, item.brand, variants)
  return {
    id: `v2-brand-${item.id}`,
    brandName: item.brand,
    itemName,
    templateId,
    variantId,
    aliases: [`${item.brand}${itemName}`],
    tags: item.tags,
    calories: item.calories,
    protein: item.protein,
    fat: item.fat,
    carbs: item.carbs,
    sourceType: v2SourceType(item),
    confidence: v2Confidence(item),
    sourceUrl: item.source_url,
    note: item.source_note,
  }
}

function brandKey(item: Pick<BrandItem, 'brandName' | 'itemName'>): string {
  return `${normalizeDishLabel(item.brandName)}::${normalizeDishLabel(item.itemName)}`
}

/** 若 calories 低於宏量營養推算值，以宏量校正（修正 V2 便當估算 bug） */
function reconcileBrandCalories(brand: BrandItem): BrandItem {
  const { protein, fat, carbs, calories } = brand
  if (protein == null && fat == null && carbs == null) return brand
  const fromMacros = Math.round((protein ?? 0) * 4 + (carbs ?? 0) * 4 + (fat ?? 0) * 9)
  if (fromMacros <= 0) return brand
  if (calories >= fromMacros * 0.85) return brand
  return {
    ...brand,
    calories: fromMacros,
    note: brand.note ? `${brand.note}；熱量已由營養素校正` : '熱量已由營養素校正',
  }
}

/** Merge seed brand rows with official / estimated items from recommendation-foods-v2. */
export function enrichBrandItemsForTemplate(
  template: DishTemplate,
  seedBrands: BrandItem[]
): BrandItem[] {
  const seen = new Set(seedBrands.map(brandKey))
  const merged = [...seedBrands]

  const v2Hits = getRecommendationFoodsV2()
    .filter(item => item.is_recommendable && matchesDishTemplate(item, template))
    .sort((a, b) => {
      const rank = (x: RecommendationFoodV2) =>
        (x.confidence_level === 'official' ? 100 : 40) + (x.protein ?? 0) * 0.1
      return rank(b) - rank(a)
    })

  for (const item of v2Hits) {
    const brand = v2ToBrandItem(item, template.id, template)
    const key = brandKey(brand)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(brand)
    if (merged.length >= MAX_BRANDS_PER_TEMPLATE) break
  }

  const variants = getVariantsForTemplate(template.id)
  return merged
    .map(b =>
      b.variantId ? b : { ...b, variantId: inferVariantIdForBrand(b.itemName, b.brandName, variants) }
    )
    .map(reconcileBrandCalories)
}
