import type { MealLine, MealSuggestion, SuggestContext } from '@/lib/meal-engine-types'
import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import { hasCompleteNutrition } from './restaurant-menu-audit'
import {
  canonicalStoreName,
  getRestaurantMenuRegistry,
  menuItemExistsInRegistry,
  type RestaurantMenuRegistry,
} from './restaurant-menu-registry'
import {
  buildRecommendationDebugReason,
  computeNutritionGaps,
  passesNutritionGapFilter,
} from './nutrition-gap-filter'

export interface ValidationResult {
  valid: boolean
  reasons: string[]
}

function uniqueStores(lines: MealLine[]): string[] {
  return [...new Set(lines.map(l => l.item.store))]
}

export function validateMenuItem(item: ConvenienceItem, registry?: RestaurantMenuRegistry): ValidationResult {
  const reg = registry ?? getRestaurantMenuRegistry()
  const reasons: string[] = []
  const store = (item.store ?? '').trim()
  if (!store) reasons.push('缺少店家')
  if (!item.id) reasons.push('缺少 menu item id')
  if (!hasCompleteNutrition(item)) reasons.push('營養欄位不完整')
  if (store && store !== '自助餐組件') {
    const canonical = canonicalStoreName(store, reg.allowlistIndex)
    if (!canonical || !reg.allowlistedStores.has(canonical)) {
      reasons.push(`店家不在 600 餐廳清單：${store}`)
    }
    const storeItems = reg.itemsByStore.get(store) ?? []
    if (!storeItems.some(hasCompleteNutrition)) {
      reasons.push(`店家無有效菜單：${store}`)
    }
  }
  if (!menuItemExistsInRegistry(item, reg)) {
    reasons.push(`菜單品項不存在或未匹配：${item.id}`)
  }
  const registered = reg.itemsById.get(item.id)
  if (registered && registered.store !== item.store) {
    reasons.push(`餐點與店家不匹配：${item.name} @ ${item.store}`)
  }
  return { valid: reasons.length === 0, reasons }
}

export function validateMealLines(lines: MealLine[], ctx: SuggestContext): ValidationResult {
  if (!lines.length) return { valid: false, reasons: ['無餐點'] }
  const reasons: string[] = []
  const stores = uniqueStores(lines)
  const nonCafeteria = stores.filter(s => s !== '自助餐組件')
  if (nonCafeteria.length > 1) reasons.push('不可跨店混搭')
  for (const line of lines) {
    const result = validateMenuItem(line.item)
    if (!result.valid) reasons.push(...result.reasons)
  }
  const totals = lines.reduce(
    (acc, l) => ({
      calories: acc.calories + (l.item.calories ?? 0),
      protein_g: acc.protein_g + (l.item.protein_g ?? 0),
      carbs_g: acc.carbs_g + (l.item.carbs_g ?? 0),
      fat_g: acc.fat_g + (l.item.fat_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )
  const gaps = computeNutritionGaps(ctx)
  const gapCheck = passesNutritionGapFilter(totals, gaps, ctx)
  if (!gapCheck.pass) reasons.push(...gapCheck.reasons)
  return { valid: reasons.length === 0, reasons }
}

export function validateMealSuggestion(suggestion: MealSuggestion, ctx: SuggestContext): ValidationResult {
  return validateMealLines(suggestion.lines, ctx)
}

export function attachRecommendationDebugReason(
  suggestion: MealSuggestion,
  ctx: SuggestContext
): MealSuggestion {
  const gaps = computeNutritionGaps(ctx)
  const gapCheck = passesNutritionGapFilter(suggestion.totals, gaps, ctx)
  const items = suggestion.lines.map(l => l.item)
  return {
    ...suggestion,
    recommendation_debug_reason: buildRecommendationDebugReason(
      suggestion.totals,
      gaps,
      items,
      gapCheck.reasons
    ),
  }
}

export function filterValidSuggestions(candidates: MealSuggestion[], ctx: SuggestContext): MealSuggestion[] {
  return candidates.filter(c => validateMealSuggestion(c, ctx).valid)
}
