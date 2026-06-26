import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import { computeBetterBitFoodScore } from '@/lib/betterbit-food-score'
import { calculateDietScore } from '@/lib/nutrition/diet-score'
import { hasCompleteNutrition } from '@/lib/nutrition/restaurant-menu-audit'
import {
  canonicalStoreName,
  menuItemExistsInRegistry,
  type RestaurantMenuRegistry,
} from '@/lib/nutrition/restaurant-menu-registry'
import { classifyDishBand, macroInBand } from './macro-bands'
import type { AllowlistEntryMeta, MenuItemQaResult, NutritionSourceTier } from './types'
import {
  energyBalanceOk,
  gradeMenuConfidence,
  inferNutritionSource,
  isPlaceholderMenuItem,
  portionPlausible,
  sourcePriorityRank,
} from '@/lib/nutrition/menu-confidence-core'

export {
  energyBalanceOk,
  inferNutritionSource,
  portionPlausible,
  impliedCaloriesFromMacros,
} from '@/lib/nutrition/menu-confidence-core'
export { sourcePriorityRank }

export function auditMenuItem(
  item: ConvenienceItem,
  registry: RestaurantMenuRegistry,
  allowlistMeta: Map<string, AllowlistEntryMeta>
): MenuItemQaResult {
  const issues: string[] = []
  const store = (item.store ?? '').trim()
  const canonical = store ? canonicalStoreName(store, registry.allowlistIndex) : null
  const meta = canonical ? allowlistMeta.get(canonical) : undefined

  const restaurant_exists = Boolean(canonical && registry.allowlistedStores.has(canonical))
  if (!restaurant_exists && store !== '自助餐組件') {
    issues.push(`店家不在 600 餐廳清單：${store}`)
  }

  const menu_exists = store === '自助餐組件' || menuItemExistsInRegistry(item, registry)
  if (!menu_exists) issues.push('菜單品項不存在於 registry')

  const placeholder_menu = isPlaceholderMenuItem(item)
  if (placeholder_menu) issues.push('疑似模板/placeholder 菜名或待驗證營養')

  const nutrition_complete = hasCompleteNutrition(item)
  if (!nutrition_complete) issues.push('營養欄位不完整')

  const energy_balance_ok = nutrition_complete
    ? energyBalanceOk(item.calories, item.protein_g, item.carbs_g, item.fat_g)
    : false
  if (nutrition_complete && !energy_balance_ok) {
    issues.push('熱量與三大營養素不一致')
  }

  const portion_plausible = nutrition_complete
    ? portionPlausible(item.calories, item.protein_g, item.carbs_g, item.fat_g)
    : false
  if (nutrition_complete && !portion_plausible) {
    issues.push('份量/巨量營養不合理（如蛋白質過高但熱量過低）')
  }

  const bandId = classifyDishBand(item.name, item.tags ?? [], item.role)
  const macro_in_range = nutrition_complete
    ? macroInBand(bandId, {
        calories: item.calories,
        protein_g: item.protein_g,
        fat_g: item.fat_g,
        carbs_g: item.carbs_g,
      })
    : false
  const nutrition_outlier = nutrition_complete && (!macro_in_range || !portion_plausible || !energy_balance_ok)
  if (nutrition_complete && !macro_in_range) {
    issues.push(`超出 ${bandId} 合理區間`)
  }

  const nutrition_source = inferNutritionSource(item)
  const confidence = gradeMenuConfidence({
    restaurant_exists: restaurant_exists || store === '自助餐組件',
    menu_exists,
    placeholder: placeholder_menu,
    nutrition_complete,
    energy_ok: energy_balance_ok,
    portion_ok: portion_plausible,
    macro_ok: macro_in_range,
    source: nutrition_source,
    allowlist_confidence: meta?.confidence_level,
  })

  const diet = calculateDietScore({
    name: item.name,
    calories: item.calories,
    protein_g: item.protein_g,
    carbs_g: item.carbs_g,
    fat_g: item.fat_g,
  })
  const foodScore = computeBetterBitFoodScore({
    name: item.name,
    calories: item.calories,
    protein_g: item.protein_g,
    carbs_g: item.carbs_g,
    fat_g: item.fat_g,
    tags: item.tags,
    role: item.role,
  })

  const restaurant_score = restaurant_exists ? (meta?.confidence_level === 'A' ? 95 : 80) : 20
  const nutrition_score = Math.round(
    (energy_balance_ok ? 30 : 0) +
      (macro_in_range ? 30 : 0) +
      (portion_plausible ? 20 : 0) +
      (nutrition_complete ? 20 : 0)
  )

  return {
    item_id: item.id,
    name: item.name,
    store,
    restaurant_exists: restaurant_exists || store === '自助餐組件',
    menu_exists,
    placeholder_menu,
    nutrition_complete,
    energy_balance_ok,
    portion_plausible,
    macro_in_range,
    nutrition_outlier,
    nutrition_source,
    confidence,
    recommendable: confidence === 'A' || confidence === 'B',
    issues,
    scores: {
      diet_score: diet.score,
      nutrition_score,
      restaurant_score,
    },
    macro_band: bandId,
  }
}
