import type { SeedTemplate } from '../seed-templates'

export type CatalogItem = SeedTemplate & {
  /** 可選：覆寫餐別 */
  meal_category?: 'breakfast' | 'lunch' | 'dinner'
}

export type BrandCatalog = Record<string, CatalogItem[]>

export function drink(
  name: string,
  calories: number,
  a: number,
  b: number,
  c?: number | Partial<CatalogItem>,
  d?: Partial<CatalogItem>
): CatalogItem {
  let protein_g = 1
  let carbs_g: number
  let fat_g: number | undefined
  let price: number
  let extra: Partial<CatalogItem> | undefined

  if (typeof c === 'number') {
    if (typeof d === 'object') {
      // (cal, protein, carbs, price, extra)
      protein_g = a
      carbs_g = b
      price = c
      extra = d
    } else {
      // (cal, carbs, fat, price, extra?)
      carbs_g = a
      fat_g = b
      price = c
      extra = d
    }
  } else {
    // (cal, carbs, price, extra?)
    carbs_g = a
    price = b
    extra = c
  }

  return {
    name,
    meal_category: 'lunch',
    role: 'drink',
    calories,
    protein_g: extra?.protein_g ?? protein_g,
    carbs_g,
    fat_g: extra?.fat_g ?? fat_g ?? Math.round(carbs_g * 0.1),
    sugar_g: extra?.sugar_g ?? Math.round(carbs_g * 0.7),
    price,
    tags: ['drink', ...(extra?.tags ?? [])],
    aliases: extra?.aliases,
  }
}

export function meal(
  name: string,
  calories: number,
  protein_g: number,
  carbs_g: number,
  fat_g: number,
  price: number,
  meal_category: 'breakfast' | 'lunch' | 'dinner' = 'lunch',
  extra?: Partial<CatalogItem>
): CatalogItem {
  return {
    name,
    meal_category,
    role: extra?.role ?? 'combo',
    calories,
    protein_g,
    carbs_g,
    fat_g,
    price,
    tags: extra?.tags,
    aliases: extra?.aliases,
  }
}

export function side(
  name: string,
  calories: number,
  protein_g: number,
  ...rest: (number | Partial<CatalogItem>)[]
): CatalogItem {
  const nums = rest.filter((x): x is number => typeof x === 'number')
  const extra = rest.find((x): x is Partial<CatalogItem> => typeof x === 'object')
  let price: number
  let carbs_g: number | undefined
  let fat_g: number | undefined

  if (nums.length === 1) {
    price = nums[0]!
  } else if (nums.length === 2) {
    carbs_g = nums[0]
    price = nums[1]!
  } else {
    carbs_g = nums[0]
    fat_g = nums[1]
    price = nums[nums.length - 1]!
  }

  return {
    name,
    meal_category: extra?.meal_category ?? 'lunch',
    role: 'side',
    calories,
    protein_g,
    carbs_g: carbs_g ?? extra?.carbs_g ?? Math.round(calories * 0.4),
    fat_g: fat_g ?? extra?.fat_g ?? Math.round(calories * 0.2),
    price,
    tags: ['side', ...(extra?.tags ?? [])],
  }
}
