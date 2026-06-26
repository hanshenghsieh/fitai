import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import { isPlausibleBrandItem } from '@/lib/store-menu-plausibility'
import type { NutritionSourceTier, QaConfidenceGrade } from './recommendation-qa/types'

export const PLACEHOLDER_DESC = /估計營養（待交叉驗證）|placeholder|待交叉驗證|模板資料|骰子變體/i
export const BULK_TEMPLATE_NAME = /韓式炸雞（半份）/

export function inferNutritionSource(item: ConvenienceItem): NutritionSourceTier {
  const desc = item.description ?? ''
  if (/官方|官網|營養標示/.test(desc)) return 'official'
  if (item.source === 'convenience' && !PLACEHOLDER_DESC.test(desc)) return 'brand_public'
  if (PLACEHOLDER_DESC.test(desc)) return 'estimated_pending'
  if (/Food DNA|food_dna/i.test(desc)) return 'food_dna_template'
  if (/USDA|衛福部|TFDA|食品營養資料庫/.test(desc)) return 'usda_tfda'
  if (item.source === 'chain') return 'brand_public'
  return 'unknown'
}

export function impliedCaloriesFromMacros(protein_g: number, carbs_g: number, fat_g: number): number {
  return protein_g * 4 + carbs_g * 4 + fat_g * 9
}

export function energyBalanceOk(calories: number, protein_g: number, carbs_g: number, fat_g: number): boolean {
  if (calories <= 0) return false
  const implied = impliedCaloriesFromMacros(protein_g, carbs_g, fat_g)
  const ratio = implied / calories
  return ratio >= 0.72 && ratio <= 1.28
}

export function portionPlausible(calories: number, protein_g: number, carbs_g: number, fat_g: number): boolean {
  if (calories <= 0) return false
  if (protein_g * 4 > calories * 0.58) return false
  if (protein_g * 4 > calories * 0.9) return false
  if (fat_g * 9 > calories * 0.85) return false
  if (carbs_g * 4 > calories * 0.92) return false
  if (!energyBalanceOk(calories, protein_g, carbs_g, fat_g)) return false
  return true
}

export function gradeMenuConfidence(input: {
  restaurant_exists: boolean
  menu_exists: boolean
  placeholder: boolean
  nutrition_complete: boolean
  energy_ok: boolean
  portion_ok: boolean
  macro_ok: boolean
  source: NutritionSourceTier
  allowlist_confidence?: 'A' | 'B'
}): QaConfidenceGrade {
  if (!input.restaurant_exists || !input.menu_exists || input.placeholder) return 'D'
  if (!input.nutrition_complete || !input.energy_ok) return 'D'
  if (!input.portion_ok || !input.macro_ok) return 'D'
  if (input.source === 'estimated_pending') return 'C'
  if (input.allowlist_confidence === 'B') return 'B'
  if (input.source === 'unknown') return 'C'
  return 'A'
}

export function isPlaceholderMenuItem(item: ConvenienceItem): boolean {
  if (PLACEHOLDER_DESC.test(item.description ?? '')) return true
  if (BULK_TEMPLATE_NAME.test(item.name)) return true
  if (!isPlausibleBrandItem(item)) return true
  return false
}

const SOURCE_PRIORITY: NutritionSourceTier[] = [
  'official',
  'usda_tfda',
  'brand_public',
  'food_dna_template',
  'estimated_pending',
  'unknown',
]

export function sourcePriorityRank(tier: NutritionSourceTier): number {
  return SOURCE_PRIORITY.indexOf(tier)
}
