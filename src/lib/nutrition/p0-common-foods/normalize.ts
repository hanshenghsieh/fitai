import type { CommonFoodItem, FoodType, P0SeedRow, ServingOption } from './types'

/** P0 lookup normalizer — do NOT apply menu synonym collapsing (e.g. 雞排 ≠ 地瓜球). */
export function normalizeP0Name(name: string): string {
  return name
    .replace(/[（(].*?[)）]/g, '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[^\u4e00-\u9fffA-Za-z0-9+]/g, '')
    .trim()
    .toLowerCase()
}

export function parseDelimitedList(raw?: string): string[] {
  if (!raw?.trim()) return []
  return [...new Set(raw.split(/[、,，]/).map(s => s.trim()).filter(Boolean))]
}

function servingLabelsForType(foodType: FoodType): [string, string, string] {
  if (foodType === 'sauce') return ['少量', '正常', '多']
  if (foodType === 'drink') return ['小杯', '中杯', '大杯']
  return ['小份', '一般', '大份']
}

export function buildServingOptions(row: P0SeedRow): ServingOption[] {
  const unit = row.defaultUnit || 'g'
  const [smallLabel, normalLabel, largeLabel] = servingLabelsForType(row.foodType)
  return [
    { label: smallLabel, amount: row.smallAmount, unit },
    { label: normalLabel, amount: row.normalAmount, unit },
    { label: largeLabel, amount: row.largeAmount, unit },
    { label: '自訂', amount: null, unit },
  ]
}

export function seedRowToCommonFood(row: P0SeedRow): CommonFoodItem {
  const aliases = parseDelimitedList(row.aliases)
  if (!aliases.includes(row.name)) aliases.unshift(row.name)
  return {
    id: row.food_id,
    name: row.name,
    category: row.primary_category.replace(/^\d+_/, '').replace(/_/g, ' / '),
    foodType: row.foodType,
    sourceType: row.sourceType ?? 'database_estimate',
    aliases,
    tags: parseDelimitedList(row.tags),
    brand: row.brand,
    defaultServing: { amount: row.defaultAmount, unit: row.defaultUnit },
    servingOptions: buildServingOptions(row),
    baseAmount: row.baseAmount || 100,
    baseUnit: row.baseUnit || row.defaultUnit || 'g',
    kcalBase: row.kcalBase,
    proteinBase_g: row.proteinBase_g,
    fatBase_g: row.fatBase_g,
    carbsBase_g: row.carbsBase_g,
    sodiumBase_mg: row.sodiumBase_mg,
    smallAmount: row.smallAmount,
    normalAmount: row.normalAmount,
    largeAmount: row.largeAmount,
    defaultUnit: row.defaultUnit,
    kcalDefault: row.kcalDefault,
    proteinDefault_g: row.proteinDefault_g,
    fatDefault_g: row.fatDefault_g,
    carbsDefault_g: row.carbsDefault_g,
    sodiumDefault_mg: row.sodiumDefault_mg,
    supportsOilOptions: row.supportsOil === true,
    supportsCookingMethod: row.supportsCookingMethod === true,
    supportsSauce: row.supportsSauce === true,
    supportsRiceAmount: row.supportsRiceAmount === true,
    supportsSugarLevel: row.supportsSugarLevel === true,
    supportsToppings: row.supportsToppings === true,
  }
}

export function dedupeKey(item: Pick<CommonFoodItem, 'name' | 'category' | 'foodType'>): string {
  return `${normalizeP0Name(item.name)}::${item.foodType}::${normalizeP0Name(item.category)}`
}
