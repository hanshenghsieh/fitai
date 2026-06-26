import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import { isPlausibleBrandItem } from '@/lib/store-menu-plausibility'
import { hasCompleteNutrition } from './restaurant-menu-audit'
import {
  canonicalStoreName,
  getRestaurantMenuRegistry,
  menuItemExistsInRegistry,
  type RestaurantMenuRegistry,
} from './restaurant-menu-registry'
import { classifyDishBand, macroInBand } from './recommendation-qa/macro-bands'
import type { AllowlistEntryMeta, QaConfidenceGrade } from './recommendation-qa/types'
import {
  energyBalanceOk,
  gradeMenuConfidence,
  inferNutritionSource,
  isPlaceholderMenuItem,
  portionPlausible,
} from './menu-confidence-core'
import allowlistJson from '../../../data/food-kb/food-source-allowlist.json'

export type MenuAccessMode = 'recommend' | 'search'

export { isPlaceholderMenuItem } from './menu-confidence-core'

export function buildAllowlistMetaMap(
  allowlist: typeof allowlistJson = allowlistJson
): Map<string, AllowlistEntryMeta> {
  const map = new Map<string, AllowlistEntryMeta>()
  for (const entry of allowlist.entries) {
    map.set(entry.canonical_name, {
      canonical_name: entry.canonical_name,
      confidence_level: entry.confidence_level,
      source_type: entry.source_type,
      needs_cross_validation: entry.needs_cross_validation,
    })
  }
  return map
}

let allowlistMetaCache: Map<string, AllowlistEntryMeta> | null = null
function getAllowlistMeta(): Map<string, AllowlistEntryMeta> {
  if (!allowlistMetaCache) allowlistMetaCache = buildAllowlistMetaMap()
  return allowlistMetaCache
}

const gradeCache = new Map<string, QaConfidenceGrade>()

export function evaluateMenuItemConfidence(
  item: ConvenienceItem,
  registry?: RestaurantMenuRegistry,
  allowlistMeta?: Map<string, AllowlistEntryMeta>
): QaConfidenceGrade {
  const cached = gradeCache.get(item.id)
  if (cached) return cached

  const reg = registry ?? getRestaurantMenuRegistry()
  const metaMap = allowlistMeta ?? getAllowlistMeta()
  const store = (item.store ?? '').trim()
  const canonical = store ? canonicalStoreName(store, reg.allowlistIndex) : null
  const meta = canonical ? metaMap.get(canonical) : undefined

  const restaurant_exists = Boolean(canonical && reg.allowlistedStores.has(canonical)) || store === '自助餐組件'
  const menu_exists = store === '自助餐組件' || menuItemExistsInRegistry(item, reg)
  const placeholder_menu = isPlaceholderMenuItem(item)
  const nutrition_complete = hasCompleteNutrition(item)

  const energy_balance_ok = nutrition_complete
    ? energyBalanceOk(item.calories, item.protein_g, item.carbs_g, item.fat_g)
    : false
  const portion_plausible = nutrition_complete
    ? portionPlausible(item.calories, item.protein_g, item.carbs_g, item.fat_g)
    : false
  const bandId = classifyDishBand(item.name, item.tags ?? [], item.role)
  const macro_in_range = nutrition_complete
    ? macroInBand(bandId, {
        calories: item.calories,
        protein_g: item.protein_g,
        fat_g: item.fat_g,
        carbs_g: item.carbs_g,
      })
    : false

  const grade = gradeMenuConfidence({
    restaurant_exists,
    menu_exists,
    placeholder: placeholder_menu,
    nutrition_complete,
    energy_ok: energy_balance_ok,
    portion_ok: portion_plausible,
    macro_ok: macro_in_range,
    source: inferNutritionSource(item),
    allowlist_confidence: meta?.confidence_level,
  })

  gradeCache.set(item.id, grade)
  return grade
}

export function clearMenuConfidenceCache(): void {
  gradeCache.clear()
}

export function isRuntimeRecommendable(item: ConvenienceItem): boolean {
  const grade = evaluateMenuItemConfidence(item)
  return grade === 'A' || grade === 'B'
}

export function isRuntimeSearchable(item: ConvenienceItem): boolean {
  return evaluateMenuItemConfidence(item) !== 'D'
}

export function passesMenuAccessGate(item: ConvenienceItem, mode: MenuAccessMode): boolean {
  return mode === 'recommend' ? isRuntimeRecommendable(item) : isRuntimeSearchable(item)
}
