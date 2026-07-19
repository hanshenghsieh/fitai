import type { CommonFoodItem } from '@/lib/nutrition/p0-common-foods/types'

export const OPEN_FOOD_FACTS_FIELDS = [
  'code',
  'product_name',
  'product_name_en',
  'generic_name',
  'brands',
  'categories',
  'quantity',
  'serving_size',
  'serving_quantity',
  'product_quantity_unit',
  'nutrition_data_per',
  'nutriments',
].join(',')

export type BarcodeLookupErrorCode =
  | 'INVALID_GTIN'
  | 'NOT_FOUND'
  | 'INCOMPLETE_PRODUCT'
  | 'TIMEOUT'
  | 'LOOKUP_FAILED'

export interface BarcodeLookupSuccess {
  ok: true
  barcode: string
  item: CommonFoodItem
}

export interface BarcodeLookupFailure {
  ok: false
  code: BarcodeLookupErrorCode
  error: string
}

export type BarcodeLookupResponse = BarcodeLookupSuccess | BarcodeLookupFailure

interface OffNutriments {
  'energy-kcal_100g'?: unknown
  energy_100g?: unknown
  proteins_100g?: unknown
  carbohydrates_100g?: unknown
  fat_100g?: unknown
  sodium_100g?: unknown
  salt_100g?: unknown
}

export interface OpenFoodFactsProduct {
  code?: unknown
  product_name?: unknown
  product_name_en?: unknown
  generic_name?: unknown
  brands?: unknown
  categories?: unknown
  quantity?: unknown
  serving_size?: unknown
  serving_quantity?: unknown
  product_quantity_unit?: unknown
  nutrition_data_per?: unknown
  nutriments?: OffNutriments
}

export interface OpenFoodFactsResponse {
  status?: unknown
  product?: OpenFoodFactsProduct
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asFiniteNumber(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(number) && number >= 0 ? number : null
}

/** GTIN-8, UPC-A, EAN-13, and GTIN-14 validation, including check digit. */
export function validateGtin(input: string): { valid: true; gtin: string } | { valid: false } {
  const gtin = input.trim().replace(/[\s-]/g, '')
  if (!/^\d+$/.test(gtin) || ![8, 12, 13, 14].includes(gtin.length)) return { valid: false }

  const digits = [...gtin].map(Number)
  const checkDigit = digits.pop()!
  let sum = 0
  for (let index = digits.length - 1, position = 0; index >= 0; index -= 1, position += 1) {
    sum += digits[index]! * (position % 2 === 0 ? 3 : 1)
  }
  return (10 - (sum % 10)) % 10 === checkDigit ? { valid: true, gtin } : { valid: false }
}

function productName(product: OpenFoodFactsProduct): string {
  return (
    asText(product.product_name) ||
    asText(product.product_name_en) ||
    asText(product.generic_name)
  )
}

function isVolumeProduct(product: OpenFoodFactsProduct): boolean {
  const unit = asText(product.product_quantity_unit).toLowerCase()
  const basis = asText(product.nutrition_data_per).toLowerCase()
  const categories = asText(product.categories).toLowerCase()
  return (
    unit === 'ml' ||
    unit === 'cl' ||
    unit === 'l' ||
    basis.includes('100ml') ||
    /\b(beverage|drink|juice|milk|water)\b/.test(categories) ||
    /飲料|果汁|牛奶|乳飲|水/.test(categories)
  )
}

function rounded(value: number, digits = 1): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function normalizeOpenFoodFactsProduct(
  gtin: string,
  product: OpenFoodFactsProduct
): CommonFoodItem | null {
  const name = productName(product)
  const nutrients = product.nutriments
  if (!name || !nutrients) return null

  const energyKcal =
    asFiniteNumber(nutrients['energy-kcal_100g']) ??
    (() => {
      const kilojoules = asFiniteNumber(nutrients.energy_100g)
      return kilojoules == null ? null : kilojoules / 4.184
    })()
  const protein = asFiniteNumber(nutrients.proteins_100g)
  const carbs = asFiniteNumber(nutrients.carbohydrates_100g)
  const fat = asFiniteNumber(nutrients.fat_100g)
  if (energyKcal == null || protein == null || carbs == null || fat == null) return null

  const sodium =
    asFiniteNumber(nutrients.sodium_100g) ??
    (() => {
      const salt = asFiniteNumber(nutrients.salt_100g)
      return salt == null ? 0 : salt / 2.5
    })()
  const unit = isVolumeProduct(product) ? 'ml' : 'g'
  const foodType = unit === 'ml' ? 'drink' : 'snack'
  const servingQuantity = asFiniteNumber(product.serving_quantity)
  const servingSize = asText(product.serving_size)
  const normalAmount = servingQuantity && servingQuantity > 0 ? servingQuantity : 100
  const brand = asText(product.brands).split(',')[0]?.trim() || undefined
  const category = asText(product.categories).split(',')[0]?.trim() || '包裝食品'
  const ratio = normalAmount / 100
  const perServing = servingQuantity != null

  return {
    id: `barcode-${gtin}`,
    name,
    canonicalName: name,
    category,
    foodType,
    sourceType: 'database_estimate',
    aliases: [gtin, brand ? `${brand} ${name}` : name],
    tags: ['barcode', 'open-food-facts'],
    brand,
    defaultServing: { amount: normalAmount, unit },
    servingOptions: perServing
      ? [
          { label: '半份', amount: rounded(normalAmount * 0.5), unit },
          { label: servingSize || '1 份', amount: normalAmount, unit },
          { label: '2 份', amount: rounded(normalAmount * 2), unit },
          { label: '自訂', amount: null, unit },
        ]
      : [
          { label: '小份', amount: 50, unit },
          { label: `每 100${unit}`, amount: 100, unit },
          { label: '大份', amount: 150, unit },
          { label: '自訂', amount: null, unit },
        ],
    baseAmount: 100,
    baseUnit: unit,
    kcalBase: Math.round(energyKcal),
    proteinBase_g: rounded(protein),
    fatBase_g: rounded(fat),
    carbsBase_g: rounded(carbs),
    sodiumBase_mg: Math.round(sodium * 1000),
    smallAmount: rounded(normalAmount * 0.5),
    normalAmount,
    largeAmount: rounded(normalAmount * 2),
    defaultUnit: unit,
    kcalDefault: Math.round(energyKcal * ratio),
    proteinDefault_g: rounded(protein * ratio),
    fatDefault_g: rounded(fat * ratio),
    carbsDefault_g: rounded(carbs * ratio),
    sodiumDefault_mg: Math.round(sodium * 1000 * ratio),
    supportsOilOptions: false,
    supportsCookingMethod: false,
    supportsSauce: false,
    supportsRiceAmount: false,
    supportsSugarLevel: false,
    supportsToppings: false,
    servingModel: unit === 'ml' ? 'volume' : 'weight',
    estimationAssumption: perServing
      ? `Open Food Facts 每 100${unit}資料；預設份量為 ${servingSize || `${normalAmount}${unit}`}`
      : `Open Food Facts 每 100${unit}資料；未提供包裝份量`,
    barcodeMetadata: {
      gtin,
      provider: 'open_food_facts',
      nutritionBasis: unit === 'ml' ? 'per_100ml' : 'per_100g',
      servingQuantity: servingQuantity ?? undefined,
      servingUnit: unit,
      servingLabel: servingSize || undefined,
    },
  }
}
