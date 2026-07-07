import type { MealOilLevel } from '@/lib/nutrition/home-cooked/types'

export type PortionPresetId = 'small' | 'normal' | 'large' | 'custom'

export const DEFAULT_PORTION_GRAMS: Record<Exclude<PortionPresetId, 'custom'>, number> = {
  small: 100,
  normal: 150,
  large: 220,
}

export const PORTION_PRESET_LABELS: Record<PortionPresetId, string> = {
  small: '小份',
  normal: '一般',
  large: '大份',
  custom: '自訂',
}

/** UI labels for oil level kcal impact (display; engine may differ slightly). */
export const OIL_LEVEL_OPTIONS: { id: MealOilLevel; label: string; displayKcal: number }[] = [
  { id: 'none', label: '無油 +0 kcal', displayKcal: 0 },
  { id: 'light', label: '少油 +45 kcal', displayKcal: 45 },
  { id: 'normal', label: '一般 +90 kcal', displayKcal: 90 },
  { id: 'heavy', label: '多油 +150 kcal', displayKcal: 150 },
]

export function gramsForPreset(preset: PortionPresetId, customGrams?: number): number | null {
  if (preset === 'custom') return customGrams ?? null
  return DEFAULT_PORTION_GRAMS[preset]
}

export function inferPresetFromGrams(grams: number | null | undefined): PortionPresetId {
  if (grams == null) return 'normal'
  if (grams === DEFAULT_PORTION_GRAMS.small) return 'small'
  if (grams === DEFAULT_PORTION_GRAMS.normal) return 'normal'
  if (grams === DEFAULT_PORTION_GRAMS.large) return 'large'
  return 'custom'
}

export function scaleMacrosByGrams(
  base: { calories: number; protein_g: number; carbs_g: number; fat_g: number },
  fromGrams: number,
  toGrams: number
) {
  if (fromGrams <= 0) return base
  const ratio = toGrams / fromGrams
  return {
    calories: Math.round(base.calories * ratio),
    protein_g: Math.round(base.protein_g * ratio * 10) / 10,
    carbs_g: Math.round(base.carbs_g * ratio * 10) / 10,
    fat_g: Math.round(base.fat_g * ratio * 10) / 10,
  }
}
