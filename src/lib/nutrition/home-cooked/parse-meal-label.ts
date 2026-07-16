import { resolveWholeFoodLabel } from '@/lib/nutrition/home-cooked/whole-food-registry'
import type { DetectedIngredientLine, HomeCookedMealDraft, SauceLevel } from '@/lib/nutrition/home-cooked/types'

export const COMPOSITE_MEAL_SPLIT_RE = /[+＋、,，/／|｜\n]+/

/** Multi-ingredient labels (咖哩飯、便當配菜) must not resolve as a single P0 staple. */
export function isCompositeMealLabel(mealLabel: string): boolean {
  const parts = mealLabel
    .split(COMPOSITE_MEAL_SPLIT_RE)
    .map(s => s.trim())
    .filter(Boolean)
  return parts.length > 1
}

function inferSauceLevel(mealLabel: string, ingredients: DetectedIngredientLine[]): SauceLevel {
  const text = `${mealLabel} ${ingredients.map(i => i.raw_label).join(' ')}`
  if (/醬|滷|咖哩|咖喱|勾芡|調味/.test(text)) return 'normal'
  return 'none'
}

/** Parse composite meal label into ingredient lines with IngredientDB matches. */
export function parseMealLabelToDraft(mealLabel: string): HomeCookedMealDraft {
  const parts = mealLabel
    .split(COMPOSITE_MEAL_SPLIT_RE)
    .map(s => s.trim())
    .filter(Boolean)

  const ingredients: DetectedIngredientLine[] = (parts.length > 0 ? parts : [mealLabel.trim()])
    .filter(Boolean)
    .map(raw_label => {
      const { food, confidence } = resolveWholeFoodLabel(raw_label)
      const category = food?.category ?? 'other'
      return {
        raw_label,
        food_id: food?.id ?? null,
        name_zh: food?.name_zh ?? raw_label,
        category,
        confidence,
        amount: null,
        unit: food?.default_unit ?? 'g',
      }
    })

  return {
    meal_label: mealLabel,
    ingredients,
    meal_cooking_method: 'stir_fried',
    meal_oil_level: 'normal',
    sauce_level: inferSauceLevel(mealLabel, ingredients),
  }
}
