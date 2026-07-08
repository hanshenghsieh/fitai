import { resolveWholeFoodLabel } from '@/lib/nutrition/home-cooked/whole-food-registry'
import { getSyntheticWholeFood } from '@/lib/nutrition/home-cooked/synthetic-foods'
import type { DetectedIngredientLine, HomeCookedMealDraft } from '@/lib/nutrition/home-cooked/types'

function makeLine(raw_label: string): DetectedIngredientLine {
  if (/咖哩醬|咖喱醬|咖哩汁|咖喱汁/.test(raw_label)) {
    const synthetic = getSyntheticWholeFood('virtual_curry_sauce')!
    return {
      raw_label,
      food_id: synthetic.id,
      name_zh: synthetic.name_zh,
      category: synthetic.category,
      confidence: 'medium',
      amount: null,
      unit: 'g',
    }
  }
  const { food, confidence } = resolveWholeFoodLabel(raw_label)
  return {
    raw_label,
    food_id: food?.id ?? null,
    name_zh: food?.name_zh ?? raw_label,
    category: food?.category ?? 'other',
    confidence,
    amount: null,
    unit: food?.default_unit ?? 'g',
  }
}

function hasLabel(ingredients: DetectedIngredientLine[], pattern: RegExp): boolean {
  return ingredients.some(i => pattern.test(i.raw_label))
}

function upsertIngredient(
  ingredients: DetectedIngredientLine[],
  raw_label: string
): DetectedIngredientLine[] {
  if (hasLabel(ingredients, new RegExp(raw_label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))) {
    return ingredients
  }
  return [...ingredients, makeLine(raw_label)]
}

/** Expand curry-rice style labels into a full ingredient set for photo estimate. */
export function enrichMealDraftFromLabel(draft: HomeCookedMealDraft): HomeCookedMealDraft {
  const text = draft.meal_label
  const isCurryRice = /咖哩|咖喱/.test(text) && /飯|饭|飯/.test(text)
  if (!isCurryRice) return draft

  let ingredients = [...draft.ingredients]

  const combinedIdx = ingredients.findIndex(
    i => /咖哩|咖喱/.test(i.raw_label) && /雞|鸡|肉/.test(i.raw_label) && !/醬|汁/.test(i.raw_label)
  )
  if (combinedIdx >= 0) {
    ingredients.splice(combinedIdx, 1, makeLine('雞腿肉'), makeLine('咖哩醬'))
  }

  if (!hasLabel(ingredients, /^雞|鸡|肉/) && /咖哩雞|咖喱鸡|咖哩雞肉/.test(text)) {
    ingredients = upsertIngredient(ingredients, '雞腿肉')
  }

  if (!hasLabel(ingredients, /咖哩醬|咖喱醬|咖哩汁/)) {
    ingredients = upsertIngredient(ingredients, '咖哩醬')
  }

  if (!hasLabel(ingredients, /洋蔥|洋葱/)) {
    ingredients = upsertIngredient(ingredients, '洋蔥')
  }

  if (!hasLabel(ingredients, /白飯|米饭|飯/)) {
    ingredients = upsertIngredient(ingredients, '白飯')
  }

  return {
    ...draft,
    ingredients,
    meal_cooking_method: 'boiled',
    meal_oil_level: 'light',
    sauce_level: 'normal',
  }
}
