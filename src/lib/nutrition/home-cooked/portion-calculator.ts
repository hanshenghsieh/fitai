import { getWholeFoodById } from '@/lib/nutrition/home-cooked/whole-food-registry'
import {
  applyMealOilLevel,
  applyPrepMethodAdjust,
} from '@/lib/nutrition/home-cooked/cooking-adjustments'
import type {
  DetectedIngredientLine,
  HomeCookedMealDraft,
  HomeCookedMealTotals,
  IngredientPortionResult,
  PortionUnit,
  WholeFoodReference,
} from '@/lib/nutrition/home-cooked/types'

function amountToGrams(amount: number, unit: PortionUnit, food: WholeFoodReference): number {
  if (unit === 'g' || unit === 'ml') return amount
  if (unit === 'piece') {
    const g = food.grams_per_piece ?? 50
    return amount * g
  }
  return amount
}

export function calculateIngredientPortion(input: {
  food: WholeFoodReference
  amount: number
  unit: PortionUnit
  prep_method?: DetectedIngredientLine['prep_method']
}): IngredientPortionResult {
  const { food, amount, unit, prep_method } = input
  const grams = amountToGrams(amount, unit, food)
  const factor = grams / 100

  const base = {
    calories: Math.round(food.calories_per_100 * factor),
    protein_g: Math.round(food.protein_g_per_100 * factor * 10) / 10,
    carbs_g: Math.round(food.carbs_g_per_100 * factor * 10) / 10,
    fat_g: Math.round(food.fat_g_per_100 * factor * 10) / 10,
  }

  const adjusted = applyPrepMethodAdjust(base, food.category, grams, prep_method)

  return {
    food_id: food.id,
    name_zh: food.name_zh,
    amount,
    unit,
    prep_method,
    calories: adjusted.calories,
    protein_g: adjusted.protein_g,
    carbs_g: adjusted.carbs_g,
    fat_g: adjusted.fat_g,
    fiber_g: food.fiber_g_per_100 != null ? Math.round(food.fiber_g_per_100 * factor * 10) / 10 : undefined,
    sodium_mg: food.sodium_mg_per_100 != null ? Math.round(food.sodium_mg_per_100 * factor) : undefined,
  }
}

export function calculateHomeCookedMeal(draft: HomeCookedMealDraft): HomeCookedMealTotals | null {
  const items: IngredientPortionResult[] = []
  const mealPrep = draft.meal_prep_method ?? 'boiled'

  for (const line of draft.ingredients) {
    if (line.amount == null || line.amount <= 0) continue
    const food = line.food_id ? getWholeFoodById(line.food_id) : null
    if (!food) continue
    if (food.category === 'sauce' && draft.has_sauce) continue
    const prep =
      line.prep_method ??
      (food.category === 'protein' || food.category === 'fat' ? mealPrep : undefined)
    items.push(
      calculateIngredientPortion({
        food,
        amount: line.amount,
        unit: line.unit,
        prep_method: prep,
      })
    )
  }

  if (draft.has_sauce) {
    const sauceMl = draft.sauce_amount_ml ?? 30
    const sauceFood = getWholeFoodById('curry_sauce')
    if (sauceFood && sauceMl > 0) {
      items.push(
        calculateIngredientPortion({
          food: sauceFood,
          amount: sauceMl,
          unit: 'ml',
        })
      )
    }
  }

  if (items.length === 0) return null

  const subtotal = items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein_g: acc.protein_g + item.protein_g,
      carbs_g: acc.carbs_g + item.carbs_g,
      fat_g: acc.fat_g + item.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )

  const rounded = {
    calories: Math.round(subtotal.calories),
    protein_g: Math.round(subtotal.protein_g * 10) / 10,
    carbs_g: Math.round(subtotal.carbs_g * 10) / 10,
    fat_g: Math.round(subtotal.fat_g * 10) / 10,
  }

  const withOil = applyMealOilLevel(rounded, draft.meal_oil_level)

  return {
    ...withOil,
    items,
  }
}

export function isHomeCookedDraftComplete(draft: HomeCookedMealDraft): boolean {
  const matched = draft.ingredients.filter(i => i.food_id != null && i.category !== 'sauce')
  if (matched.length === 0) return false
  const weightsOk = matched.some(i => i.amount != null && i.amount > 0)
  if (!weightsOk) return false
  if (draft.has_sauce && (draft.sauce_amount_ml == null || draft.sauce_amount_ml <= 0)) {
    return false
  }
  return true
}
