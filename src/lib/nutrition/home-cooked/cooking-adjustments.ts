import oilRulesJson from '@/lib/nutrition/home-cooked/data/oil-rules.json'
import sauceRulesJson from '@/lib/nutrition/home-cooked/data/sauce-rules.json'
import type {
  MealCookingMethod,
  MealOilLevel,
  OilRule,
  SauceLevel,
  SauceRule,
  WholeFoodCategory,
} from '@/lib/nutrition/home-cooked/types'

export interface MacroSnapshot {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  sodium_mg?: number
}

const OIL_RULES = oilRulesJson as OilRule[]
const SAUCE_RULES = sauceRulesJson as SauceRule[]

const COOKING_ZH: Record<MealCookingMethod, string> = {
  boiled: '水煮',
  steamed: '蒸',
  grilled: '烤',
  stir_fried: '炒',
  deep_fried: '炸',
}

const OIL_ZH: Record<MealOilLevel, string> = {
  none: '無油',
  light: '少油',
  normal: '一般',
  heavy: '多油',
}

const SAUCE_ZH: Record<SauceLevel, string> = {
  none: '無',
  light: '少',
  normal: '正常',
  heavy: '多',
}

const oilLookup = new Map(OIL_RULES.map(r => [r.lookup_key, r.oil_g_per_meal]))
const sauceLookup = new Map(
  SAUCE_RULES.map(r => [r.sauce_level, r])
)

export function lookupMealOilGrams(
  cooking: MealCookingMethod,
  oilLevel: MealOilLevel
): number {
  const key = `${COOKING_ZH[cooking]}|${OIL_ZH[oilLevel]}`
  return oilLookup.get(key) ?? 0
}

export function applyMealOilGrams(totals: MacroSnapshot, oilG: number): MacroSnapshot {
  if (oilG <= 0) return totals
  return {
    ...totals,
    calories: totals.calories + Math.round(oilG * 9),
    fat_g: Math.round((totals.fat_g + oilG) * 10) / 10,
  }
}

export function applySauceLevel(totals: MacroSnapshot, level: SauceLevel): MacroSnapshot {
  if (level === 'none') return totals
  const rule = sauceLookup.get(SAUCE_ZH[level])
  if (!rule) return totals
  return {
    calories: totals.calories + rule.kcal,
    protein_g: Math.round((totals.protein_g + rule.protein_g) * 10) / 10,
    carbs_g: Math.round((totals.carbs_g + rule.carb_g) * 10) / 10,
    fat_g: Math.round((totals.fat_g + rule.fat_g) * 10) / 10,
    sodium_mg: (totals.sodium_mg ?? 0) + rule.sodium_mg,
  }
}

export function defaultAmountForCategory(category: WholeFoodCategory): number {
  switch (category) {
    case 'protein':
      return 100
    case 'carb':
      return 150
    case 'veg':
      return 100
    case 'fat':
      return 10
    default:
      return 100
  }
}

export { COOKING_ZH, OIL_ZH, SAUCE_ZH }
