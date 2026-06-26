/**
 * Sauce Library — deltas only, never new dishes.
 */
import type { MacroDelta } from '@/lib/nutrition/portion-engine/delta-engine'

export type SauceId =
  | 'sesame' | 'thousand_island' | 'caesar' | 'mayo' | 'honey_mustard'
  | 'sweet_sour' | 'shacha' | 'sesame_paste' | 'peanut' | 'gochujang'
  | 'ketchup' | 'curry' | 'soy' | 'garlic' | 'chili' | 'black_pepper'

export type SauceLevelId = 'none' | 'on_side' | 'half' | 'normal' | 'extra'

export const SAUCE_LIBRARY: Record<SauceId, { label: string; per_serving: MacroDelta }> = {
  sesame: { label: '胡麻', per_serving: { kcal: 45, protein_g: 1, carbs_g: 3, fat_g: 4 } },
  thousand_island: { label: '千島', per_serving: { kcal: 55, protein_g: 0, carbs_g: 4, fat_g: 5 } },
  caesar: { label: '凱薩', per_serving: { kcal: 60, protein_g: 1, carbs_g: 2, fat_g: 6 } },
  mayo: { label: '美乃滋', per_serving: { kcal: 70, protein_g: 0, carbs_g: 1, fat_g: 7 } },
  honey_mustard: { label: '蜂蜜芥末', per_serving: { kcal: 50, protein_g: 0, carbs_g: 6, fat_g: 3 } },
  sweet_sour: { label: '糖醋', per_serving: { kcal: 40, protein_g: 0, carbs_g: 8, fat_g: 1 } },
  shacha: { label: '沙茶', per_serving: { kcal: 35, protein_g: 1, carbs_g: 2, fat_g: 3 } },
  sesame_paste: { label: '麻醬', per_serving: { kcal: 50, protein_g: 2, carbs_g: 3, fat_g: 4 } },
  peanut: { label: '花生', per_serving: { kcal: 55, protein_g: 2, carbs_g: 3, fat_g: 5 } },
  gochujang: { label: '韓式辣醬', per_serving: { kcal: 30, protein_g: 1, carbs_g: 5, fat_g: 0.5 } },
  ketchup: { label: '番茄醬', per_serving: { kcal: 20, protein_g: 0, carbs_g: 5, fat_g: 0 } },
  curry: { label: '咖哩', per_serving: { kcal: 40, protein_g: 1, carbs_g: 4, fat_g: 2 } },
  soy: { label: '醬油膏', per_serving: { kcal: 15, protein_g: 1, carbs_g: 2, fat_g: 0 } },
  garlic: { label: '蒜泥', per_serving: { kcal: 25, protein_g: 0, carbs_g: 2, fat_g: 2 } },
  chili: { label: '辣椒', per_serving: { kcal: 10, protein_g: 0, carbs_g: 1, fat_g: 0.5 } },
  black_pepper: { label: '黑胡椒', per_serving: { kcal: 5, protein_g: 0, carbs_g: 0, fat_g: 0 } },
}

export const SAUCE_LEVEL_MULTIPLIERS: Record<SauceLevelId, { mult: number; label: string }> = {
  none: { mult: 0, label: '不要醬' },
  on_side: { mult: 0.3, label: '醬另外放' },
  half: { mult: 0.5, label: '半醬' },
  normal: { mult: 1, label: '正常' },
  extra: { mult: 1.5, label: '多醬' },
}

export function sauceDelta(sauceId: SauceId, level: SauceLevelId = 'normal'): MacroDelta {
  const sauce = SAUCE_LIBRARY[sauceId]
  const lvl = SAUCE_LEVEL_MULTIPLIERS[level]
  const m = lvl.mult
  return {
    kcal: Math.round(sauce.per_serving.kcal * m),
    protein_g: Math.round(sauce.per_serving.protein_g * m * 10) / 10,
    carbs_g: Math.round(sauce.per_serving.carbs_g * m * 10) / 10,
    fat_g: Math.round(sauce.per_serving.fat_g * m * 10) / 10,
    label: `${sauce.label}（${lvl.label}）`,
  }
}

export function countSauceLibrary(): number {
  return Object.keys(SAUCE_LIBRARY).length
}

export function listSauceIds(): SauceId[] {
  return Object.keys(SAUCE_LIBRARY) as SauceId[]
}
