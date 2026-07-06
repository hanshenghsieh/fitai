import { getWholeFoodById } from '@/lib/nutrition/home-cooked/whole-food-registry'
import {
  applyMealOilGrams,
  applySauceLevel,
  lookupMealOilGrams,
} from '@/lib/nutrition/home-cooked/cooking-adjustments'
import type {
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
}): IngredientPortionResult {
  const { food, amount, unit } = input
  const grams = amountToGrams(amount, unit, food)
  const factor = grams / 100

  return {
    food_id: food.id,
    name_zh: food.name_zh,
    amount,
    unit,
    calories: Math.round(food.calories_per_100 * factor),
    protein_g: Math.round(food.protein_g_per_100 * factor * 10) / 10,
    carbs_g: Math.round(food.carbs_g_per_100 * factor * 10) / 10,
    fat_g: Math.round(food.fat_g_per_100 * factor * 10) / 10,
    sodium_mg: food.sodium_mg_per_100 != null ? Math.round(food.sodium_mg_per_100 * factor) : undefined,
  }
}

export function calculateHomeCookedMeal(draft: HomeCookedMealDraft): HomeCookedMealTotals | null {
  const items: IngredientPortionResult[] = []

  for (const line of draft.ingredients) {
    if (line.amount == null || line.amount <= 0) continue
    const food = line.food_id ? getWholeFoodById(line.food_id) : null
    if (!food) continue
    items.push(
      calculateIngredientPortion({
        food,
        amount: line.amount,
        unit: line.unit,
      })
    )
  }

  if (items.length === 0) return null

  const subtotal = items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein_g: acc.protein_g + item.protein_g,
      carbs_g: acc.carbs_g + item.carbs_g,
      fat_g: acc.fat_g + item.fat_g,
      sodium_mg: (acc.sodium_mg ?? 0) + (item.sodium_mg ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, sodium_mg: 0 }
  )

  const rounded: HomeCookedMealTotals = {
    calories: Math.round(subtotal.calories),
    protein_g: Math.round(subtotal.protein_g * 10) / 10,
    carbs_g: Math.round(subtotal.carbs_g * 10) / 10,
    fat_g: Math.round(subtotal.fat_g * 10) / 10,
    sodium_mg: subtotal.sodium_mg > 0 ? subtotal.sodium_mg : undefined,
    meal_oil_g: 0,
    items,
  }

  const oilG = lookupMealOilGrams(draft.meal_cooking_method, draft.meal_oil_level)
  const withOil = applyMealOilGrams(rounded, oilG)
  const withSauce = applySauceLevel(withOil, draft.sauce_level)

  return {
    ...withSauce,
    meal_oil_g: oilG,
    items,
  }
}

export function isHomeCookedDraftComplete(draft: HomeCookedMealDraft): boolean {
  const matched = draft.ingredients.filter(i => i.food_id != null)
  if (matched.length === 0) return false
  return matched.some(i => i.amount != null && i.amount > 0)
}
