import type { FoodRecordNutrition, ServingOption } from '@/lib/nutrition/p0-common-foods/types'

export const WHITE_RICE_CANONICAL_ID = 'bb_p0_0281'
export const WHITE_RICE_DEPRECATED_VARIANT_IDS = new Set([
  'bb_p0_0282',
  'bb_p0_0283',
  'bb_p0_0510',
])

export const WHITE_RICE_BASE = {
  amount: 100,
  unit: 'g',
  calories: 130,
  protein_g: 2.7,
  carbs_g: 28,
  fat_g: 0.3,
  sodium_mg: 1,
} as const

export const WHITE_RICE_PORTIONS = {
  half_bowl: { label: '半碗', amount: 75 },
  bowl: { label: '一碗', amount: 150 },
  large_bowl: { label: '大碗', amount: 210 },
} as const

export const WHITE_RICE_SERVING_OPTIONS: ServingOption[] = [
  { label: WHITE_RICE_PORTIONS.half_bowl.label, amount: WHITE_RICE_PORTIONS.half_bowl.amount, unit: 'g' },
  { label: WHITE_RICE_PORTIONS.bowl.label, amount: WHITE_RICE_PORTIONS.bowl.amount, unit: 'g' },
  { label: WHITE_RICE_PORTIONS.large_bowl.label, amount: WHITE_RICE_PORTIONS.large_bowl.amount, unit: 'g' },
  { label: '自訂', amount: null, unit: 'g' },
]

export const WHITE_RICE_ALIASES = [
  '飯',
  '米飯',
  '白米飯',
  '白米',
  '一碗飯',
  '一碗白飯',
  '半碗飯',
  '半碗白飯',
  '大碗飯',
  '大碗白飯',
  '便當白飯',
]

export type WhiteRicePortionId = keyof typeof WHITE_RICE_PORTIONS

export function resolveWhiteRicePortion(query: string): {
  id: WhiteRicePortionId
  label: string
  amount: number
} {
  const normalized = query.replace(/\s+/g, '')
  if (/半碗|半飯/.test(normalized)) {
    return { id: 'half_bowl', ...WHITE_RICE_PORTIONS.half_bowl }
  }
  if (/大碗|大份/.test(normalized)) {
    return { id: 'large_bowl', ...WHITE_RICE_PORTIONS.large_bowl }
  }
  return { id: 'bowl', ...WHITE_RICE_PORTIONS.bowl }
}

export function calculateWhiteRiceNutrition(amountG: number): FoodRecordNutrition {
  const ratio = amountG / WHITE_RICE_BASE.amount
  return {
    calories: Math.round(WHITE_RICE_BASE.calories * ratio),
    protein_g: Math.round(WHITE_RICE_BASE.protein_g * ratio * 10) / 10,
    carbs_g: Math.round(WHITE_RICE_BASE.carbs_g * ratio * 10) / 10,
    fat_g: Math.round(WHITE_RICE_BASE.fat_g * ratio * 10) / 10,
    sodium_mg: Math.round(WHITE_RICE_BASE.sodium_mg * ratio),
  }
}

