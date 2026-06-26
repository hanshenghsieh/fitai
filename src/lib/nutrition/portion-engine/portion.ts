/**
 * Portion Engine — rice / protein portion deltas (never creates new dishes).
 */
import type { MacroDelta } from '@/lib/nutrition/portion-engine/delta-engine'

export type RicePortionId = 'less' | 'normal' | 'extra' | 'one_half' | 'double'
export type ProteinPortionId = 'extra_egg' | 'extra_chicken' | 'double_meat' | 'skin_removed'
export type GenericPortionId = 'small' | 'medium' | 'large' | 'half' | 'one' | 'two'

export const RICE_PORTION_DELTAS: Record<RicePortionId, MacroDelta> = {
  less: { kcal: -90, protein_g: -1, carbs_g: -20, fat_g: 0, label: '少飯' },
  normal: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, label: '正常' },
  extra: { kcal: 180, protein_g: 3, carbs_g: 40, fat_g: 0.5, label: '加飯' },
  one_half: { kcal: 90, protein_g: 1.5, carbs_g: 20, fat_g: 0.25, label: '1.5倍飯' },
  double: { kcal: 180, protein_g: 3, carbs_g: 40, fat_g: 0.5, label: '2倍飯' },
}

export const PROTEIN_PORTION_DELTAS: Record<ProteinPortionId, MacroDelta> = {
  extra_egg: { kcal: 70, protein_g: 6, carbs_g: 0.5, fat_g: 5, label: '加蛋' },
  extra_chicken: { kcal: 120, protein_g: 23, carbs_g: 0, fat_g: 3, label: '加雞胸' },
  double_meat: { kcal: 150, protein_g: 18, carbs_g: 0, fat_g: 8, label: '雙肉' },
  skin_removed: { kcal: -50, protein_g: 0, carbs_g: 0, fat_g: -8, label: '去皮' },
}

export const GENERIC_PORTION_MULTIPLIERS: Record<GenericPortionId, number> = {
  small: 0.7,
  medium: 1,
  large: 1.35,
  half: 0.5,
  one: 1,
  two: 2,
}

export function applyRicePortion(base: MacroDelta, rice: RicePortionId): MacroDelta {
  const d = RICE_PORTION_DELTAS[rice]
  return {
    kcal: base.kcal + d.kcal,
    protein_g: base.protein_g + d.protein_g,
    carbs_g: base.carbs_g + d.carbs_g,
    fat_g: base.fat_g + d.fat_g,
    label: `${base.label ?? 'base'} + ${d.label}`,
  }
}

export function applyProteinPortion(base: MacroDelta, protein: ProteinPortionId): MacroDelta {
  const d = PROTEIN_PORTION_DELTAS[protein]
  return {
    kcal: base.kcal + d.kcal,
    protein_g: base.protein_g + d.protein_g,
    carbs_g: base.carbs_g + d.carbs_g,
    fat_g: base.fat_g + d.fat_g,
    label: `${base.label ?? 'base'} + ${d.label}`,
  }
}

export function applyGenericPortionMultiplier(
  macros: { kcal: number; protein_g: number; carbs_g: number; fat_g: number },
  portion: GenericPortionId
): MacroDelta {
  const m = GENERIC_PORTION_MULTIPLIERS[portion]
  return {
    kcal: Math.round(macros.kcal * m),
    protein_g: Math.round(macros.protein_g * m * 10) / 10,
    carbs_g: Math.round(macros.carbs_g * m * 10) / 10,
    fat_g: Math.round(macros.fat_g * m * 10) / 10,
    label: portion,
  }
}

export function countPortionDeltas(): number {
  return Object.keys(RICE_PORTION_DELTAS).length + Object.keys(PROTEIN_PORTION_DELTAS).length
}
