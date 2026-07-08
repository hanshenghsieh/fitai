import type { WholeFoodCategory } from '@/lib/nutrition/home-cooked/types'

export type MealPortionSize = 'small' | 'normal' | 'large'
export type QuickAmountLevel = 'less' | 'normal' | 'more'
export type EatenLevel = 'all' | 'half' | 'little_left'

export const CATEGORY_PORTION_GRAMS: Record<
  WholeFoodCategory,
  Record<MealPortionSize, number>
> = {
  carb: { small: 150, normal: 200, large: 250 },
  protein: { small: 70, normal: 100, large: 140 },
  veg: { small: 40, normal: 80, large: 120 },
  sauce: { small: 80, normal: 120, large: 180 },
  fat: { small: 10, normal: 15, large: 20 },
  other: { small: 50, normal: 80, large: 120 },
}

/** Japanese curry rice — normal portion defaults (photo estimate baseline). */
export const CURRY_RICE_NORMAL_GRAMS: Record<string, number> = {
  白飯: 220,
  雞肉: 100,
  咖哩醬: 150,
  紅蘿蔔: 100,
  馬鈴薯: 70,
  洋蔥: 40,
}

export const QUICK_LEVEL_MULTIPLIER: Record<QuickAmountLevel, number> = {
  less: 0.85,
  normal: 1,
  more: 1.15,
}

export const EATEN_LEVEL_MULTIPLIER: Record<EatenLevel, number> = {
  all: 1,
  half: 0.5,
  little_left: 0.85,
}

export const DEFAULT_MEAL_QUICK_ADJUST = {
  mealPortion: 'normal' as MealPortionSize,
  riceLevel: 'normal' as QuickAmountLevel,
  meatLevel: 'normal' as QuickAmountLevel,
  sauceAmount: 'normal' as QuickAmountLevel,
  eatenLevel: 'all' as EatenLevel,
}

export function gramsForCategoryPortion(
  category: WholeFoodCategory,
  portion: MealPortionSize
): number {
  return CATEGORY_PORTION_GRAMS[category]?.[portion] ?? CATEGORY_PORTION_GRAMS.other[portion]
}
