import type { SeedTemplate } from '../seed-templates'

export type CatalogItem = SeedTemplate & {
  /** 可選：覆寫餐別 */
  meal_category?: 'breakfast' | 'lunch' | 'dinner'
}

export type BrandCatalog = Record<string, CatalogItem[]>

export interface DrinkInput {
  name: string
  calories: number
  /** Explicit and required — no positional-argument guessing. Use 0 for a protein-free drink, never omit it. */
  protein_g: number
  carbs_g: number
  /** Defaults to 10% of carbs_g (a rough placeholder) only when genuinely unknown — pass the real value whenever the source has one. */
  fat_g?: number
  /** Defaults to 70% of carbs_g when unknown. */
  sugar_g?: number
  price: number
  role?: string
  meal_category?: 'breakfast' | 'lunch' | 'dinner'
  tags?: string[]
  aliases?: string[]
}

/**
 * Single named-field signature — deliberately NOT overloaded by argument
 * count/type. The prior positional form drink(name, cal, a, b, c?, d?)
 * silently reinterpreted which number meant protein vs. carbs vs. fat
 * depending on how many arguments a call happened to pass, which corrupted
 * hundreds of generated bubble-tea records (protein/carbs/fat swapped) and
 * mis-routed price entirely for at least two other items (米漿, 可樂) whose
 * calls simply had one argument too many for the overload to notice. See
 * the 2026-08 menu-nutrition-integrity audit. There is no positional
 * fallback here on purpose — every nutrition field must be named at the
 * call site so a reviewer (and the compiler) can see exactly what maps to
 * what.
 */
export function drink(input: DrinkInput): CatalogItem {
  return {
    name: input.name,
    meal_category: input.meal_category ?? 'lunch',
    role: input.role ?? 'drink',
    calories: input.calories,
    protein_g: input.protein_g,
    carbs_g: input.carbs_g,
    fat_g: input.fat_g ?? Math.round(input.carbs_g * 0.1),
    sugar_g: input.sugar_g ?? Math.round(input.carbs_g * 0.7),
    price: input.price,
    tags: ['drink', ...(input.tags ?? [])],
    aliases: input.aliases,
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
    // Bug fix (menu-nutrition-integrity audit, phase 3): these defaults were
    // Math.round(calories * 0.4) / Math.round(calories * 0.2) — the exact
    // same calorie-share-treated-as-grams mistake found and fixed in
    // generate-expanded-menu.mjs. Dividing by the energy density (4 kcal/g
    // carbs, 9 kcal/g fat) converts the intended ~40%/~20% calorie share
    // into an actual gram value instead of a wildly oversized one (e.g. a
    // 300kcal side item was defaulting to 120g carbs — 480kcal on its own).
    carbs_g: carbs_g ?? extra?.carbs_g ?? Math.round((calories * 0.4) / 4),
    fat_g: fat_g ?? extra?.fat_g ?? Math.round((calories * 0.2) / 9),
    price,
    tags: ['side', ...(extra?.tags ?? [])],
  }
}
