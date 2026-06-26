import type { SauceId, SauceLevelId } from '@/lib/nutrition/portion-engine/sauce'
import { sauceDelta } from '@/lib/nutrition/portion-engine/sauce'
import type { ProteinPortionId, RicePortionId } from '@/lib/nutrition/portion-engine/portion'
import { applyProteinPortion, applyRicePortion } from '@/lib/nutrition/portion-engine/portion'

export interface MacroDelta {
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  label?: string
}

export interface PortionSauceAdjustment {
  rice?: RicePortionId
  protein?: ProteinPortionId
  sauces?: Array<{ id: SauceId; level: SauceLevelId }>
}

const ZERO: MacroDelta = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }

export function sumDeltas(deltas: MacroDelta[]): MacroDelta {
  return deltas.reduce(
    (acc, d) => ({
      kcal: acc.kcal + d.kcal,
      protein_g: acc.protein_g + d.protein_g,
      carbs_g: acc.carbs_g + d.carbs_g,
      fat_g: acc.fat_g + d.fat_g,
      label: 'combined',
    }),
    { ...ZERO }
  )
}

export function applyPortionSauceDeltas(
  base: { kcal: number; protein_g: number; carbs_g: number; fat_g: number },
  adj: PortionSauceAdjustment
): MacroDelta {
  let delta: MacroDelta = { ...ZERO, label: 'base' }

  if (adj.rice) delta = applyRicePortion(delta, adj.rice)
  if (adj.protein) delta = applyProteinPortion(delta, adj.protein)

  const sauceDeltas = (adj.sauces ?? []).map(s => sauceDelta(s.id, s.level))
  const combined = sumDeltas([delta, ...sauceDeltas])

  return {
    kcal: Math.max(0, Math.round(base.kcal + combined.kcal)),
    protein_g: Math.max(0, Math.round((base.protein_g + combined.protein_g) * 10) / 10),
    carbs_g: Math.max(0, Math.round((base.carbs_g + combined.carbs_g) * 10) / 10),
    fat_g: Math.max(0, Math.round((base.fat_g + combined.fat_g) * 10) / 10),
    label: combined.label,
  }
}

import { countPortionDeltas } from '@/lib/nutrition/portion-engine/portion'
import { countSauceLibrary, SAUCE_LEVEL_MULTIPLIERS } from '@/lib/nutrition/portion-engine/sauce'

export function countAllPortionSauceDeltas(): {
  rice: number
  protein: number
  sauce: number
  sauce_levels: number
  total: number
} {
  const portion = countPortionDeltas()
  const sauce = countSauceLibrary()
  const levels = Object.keys(SAUCE_LEVEL_MULTIPLIERS).length
  return { rice: 5, protein: 4, sauce, sauce_levels: levels, total: portion + sauce * levels }
}
