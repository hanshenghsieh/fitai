import seedRows from '../../../../data/nutrition/p0-common-foods-seed.json'
import { P0_ITEM_OVERRIDES, applyStapleCategoryHeuristic } from './p0-alias-overrides'
import { dedupeKey, normalizeP0Name, seedRowToCommonFood } from './normalize'
import type { CommonFoodItem, P0SeedRow } from './types'
import { WHITE_RICE_DEPRECATED_VARIANT_IDS } from '@/lib/nutrition/rice-portion-profile'

function applyItemOverrides(item: CommonFoodItem): CommonFoodItem {
  const ov = P0_ITEM_OVERRIDES[item.id]
  if (!ov) return item

  const aliases = [...new Set([...item.aliases, ...(ov.aliases ?? [])])]
  const next: CommonFoodItem = {
    ...item,
    ...ov,
    aliases,
  }

  if (ov.kcalBase != null && ov.kcalDefault == null) {
    const ratio =
      (ov.normalAmount ?? item.normalAmount) / (ov.baseAmount ?? item.baseAmount ?? 100)
    next.kcalDefault = Math.round(ov.kcalBase * ratio)
    next.proteinDefault_g = Math.round((ov.proteinBase_g ?? item.proteinBase_g) * ratio * 10) / 10
    next.fatDefault_g = Math.round((ov.fatBase_g ?? item.fatBase_g) * ratio * 10) / 10
    next.carbsDefault_g = Math.round((ov.carbsBase_g ?? item.carbsBase_g) * ratio * 10) / 10
    next.sodiumDefault_mg = Math.round((ov.sodiumBase_mg ?? item.sodiumBase_mg) * ratio)
  }

  if (ov.defaultServing) next.defaultServing = ov.defaultServing
  if (ov.servingOptions) next.servingOptions = ov.servingOptions

  return applyStapleCategoryHeuristic(next)
}

function buildCatalog(): {
  byId: Map<string, CommonFoodItem>
  byNormalizedLabel: Map<string, CommonFoodItem>
  items: CommonFoodItem[]
} {
  const byId = new Map<string, CommonFoodItem>()
  const seen = new Set<string>()

  for (const row of seedRows as P0SeedRow[]) {
    if (WHITE_RICE_DEPRECATED_VARIANT_IDS.has(row.food_id)) continue
    let item = applyItemOverrides(seedRowToCommonFood(row))
    if (!P0_ITEM_OVERRIDES[row.food_id]) {
      item = applyStapleCategoryHeuristic(item)
    }
    const key = dedupeKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    byId.set(item.id, item)
  }

  const byNormalizedLabel = new Map<string, CommonFoodItem>()
  for (const item of byId.values()) {
    for (const label of item.aliases) {
      if (label === item.name) continue
      const norm = normalizeP0Name(label)
      if (!norm || byNormalizedLabel.has(norm)) continue
      byNormalizedLabel.set(norm, item)
    }
  }
  for (const item of byId.values()) {
    const nameNorm = normalizeP0Name(item.name)
    if (nameNorm) byNormalizedLabel.set(nameNorm, item)
  }

  const items = [...byId.values()]
  return { byId, byNormalizedLabel, items }
}

const catalog = buildCatalog()

export function getP0Catalog(): CommonFoodItem[] {
  return catalog.items
}

export function getP0FoodById(id: string): CommonFoodItem | null {
  return catalog.byId.get(id) ?? null
}

export function getP0FoodByNormalizedLabel(label: string): CommonFoodItem | null {
  const norm = normalizeP0Name(label)
  if (!norm) return null
  return catalog.byNormalizedLabel.get(norm) ?? null
}

export function getP0FoodBySearchId(searchId: string): CommonFoodItem | null {
  if (searchId.startsWith('p0-')) {
    return getP0FoodById(searchId.slice(3))
  }
  return getP0FoodById(searchId)
}
