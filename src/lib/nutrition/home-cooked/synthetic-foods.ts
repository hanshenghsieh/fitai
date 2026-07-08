import type { WholeFoodReference } from '@/lib/nutrition/home-cooked/types'

/** Synthetic rows for composite meals when IngredientDB has no exact match. */
export const SYNTHETIC_WHOLE_FOODS: Record<string, WholeFoodReference> = {
  virtual_curry_sauce: {
    id: 'virtual_curry_sauce',
    food_id: 'virtual_curry_sauce',
    name_zh: '咖哩醬',
    category: 'sauce',
    aliases: ['咖哩醬', '咖喱醬', '日式咖哩醬', '咖哩汁', '咖喱汁'],
    calories_per_100: 110,
    protein_g_per_100: 2,
    carbs_g_per_100: 10,
    fat_g_per_100: 7,
    default_unit: 'g',
    source: 'meal_template_estimate',
    note: '日式咖哩飯醬汁估算',
  },
}

export function getSyntheticWholeFood(id: string): WholeFoodReference | null {
  return SYNTHETIC_WHOLE_FOODS[id] ?? null
}
