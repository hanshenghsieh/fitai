import type {
  IngredientPrepMethod,
  MealOilLevel,
  WholeFoodCategory,
} from '@/lib/nutrition/home-cooked/types'

export interface MacroSnapshot {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

/** Extra fat (g) added per 100g edible portion for protein-heavy items. */
const PREP_FAT_DELTA_PER_100G: Record<IngredientPrepMethod, number> = {
  raw: 0,
  boiled: 0,
  steamed: 0,
  grilled: 1.5,
  pan_fried: 6,
  stir_fried: 5,
  deep_fried: 12,
}

/** Meal-level multiplier on fat grams for mixed dishes. */
const MEAL_OIL_FAT_MULT: Record<MealOilLevel, number> = {
  light: 0.85,
  normal: 1,
  heavy: 1.2,
}

/** Whether to show prep picker for this category in UI. */
export function shouldOfferPrepMethod(category: WholeFoodCategory): boolean {
  return category === 'protein' || category === 'fat'
}

/** Default unit hint for UI placeholders. */
export function defaultAmountForCategory(category: WholeFoodCategory): number {
  switch (category) {
    case 'protein':
      return 100
    case 'carb':
      return 150
    case 'veg':
      return 100
    case 'sauce':
      return 30
    case 'fat':
      return 10
    default:
      return 100
  }
}

export function applyPrepMethodAdjust(
  base: MacroSnapshot,
  category: WholeFoodCategory,
  amountGrams: number,
  prep?: IngredientPrepMethod
): MacroSnapshot {
  if (!prep || prep === 'raw' || prep === 'boiled' || prep === 'steamed') return base
  if (category !== 'protein' && category !== 'fat') return base

  const deltaFat = (PREP_FAT_DELTA_PER_100G[prep] * amountGrams) / 100
  const fat_g = Math.round((base.fat_g + deltaFat) * 10) / 10
  const calories = Math.round(base.calories + deltaFat * 9)
  return { ...base, fat_g, calories }
}

export function applyMealOilLevel(totals: MacroSnapshot, level: MealOilLevel): MacroSnapshot {
  if (level === 'normal') return totals
  const mult = MEAL_OIL_FAT_MULT[level]
  const fat_g = Math.round(totals.fat_g * mult * 10) / 10
  const fatDelta = fat_g - totals.fat_g
  const calories = Math.round(totals.calories + fatDelta * 9)
  return { ...totals, fat_g, calories }
}
