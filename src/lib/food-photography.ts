/**
 * Food photography — thin facade over food-image-system.
 * No runtime Unsplash/Pexels search. Local category pool only.
 */
import {
  classifyImageCategory,
  resolveFoodImage,
  pickCategoryImage,
  DEFAULT_CATEGORY_IMAGE,
  CATEGORY_IMAGE_POOL,
  type ImageCategory,
  type FoodImageInput,
  type ResolvedFoodImage,
} from './food-image-system'

export type { ImageCategory, FoodImageInput, ResolvedFoodImage }
export { classifyImageCategory, resolveFoodImage, pickCategoryImage, DEFAULT_CATEGORY_IMAGE }

/** @deprecated use ImageCategory */
export type FoodPhotoCategory = ImageCategory

export const FOOD_PHOTOS = {
  default: DEFAULT_CATEGORY_IMAGE,
  bento: CATEGORY_IMAGE_POOL.bento[0],
  salmon: CATEGORY_IMAGE_POOL.salmon[0],
  noodles: CATEGORY_IMAGE_POOL.noodles[0],
  hotpot: CATEGORY_IMAGE_POOL.hotpot[0],
  salad: CATEGORY_IMAGE_POOL.salad[0],
  convenience: CATEGORY_IMAGE_POOL.convenience[0],
  fried: CATEGORY_IMAGE_POOL.fried[0],
  dessert: CATEGORY_IMAGE_POOL.dessert[0],
  drink: CATEGORY_IMAGE_POOL.drink[0],
  breakfast: CATEGORY_IMAGE_POOL.breakfast[0],
  restaurant: CATEGORY_IMAGE_POOL.restaurant[0],
} as const

export function primaryFoodLabel(name: string): string {
  const part = name.split(/[+＋]/)[0]?.trim() ?? name
  return part.length > 48 ? part.slice(0, 48) : part
}

function stripStorePrefix(name: string): string {
  const idx = name.indexOf('·')
  if (idx <= 0 || idx > 22) return name
  const suffix = name.slice(idx + 1).trim()
  if (/^(半糖|微糖|無糖|正常|少糖|多糖|去冰|少冰|微冰|溫|熱|冰|微辣|少油|少鹽)/.test(suffix)) return name
  const prefix = name.slice(0, idx).trim()
  if (prefix.length > 10) return name
  if (/^[A-Za-z0-9 .-]+$/i.test(prefix) || /^(7-11|全家|麥當勞|肯德基|漢堡王|摩斯)/i.test(prefix)) {
    return suffix || name
  }
  return name
}

export interface FoodPhotoInput {
  name: string
  store?: string
  /** User capture — priority 1 */
  photo_url?: string
  userUploadedPhoto?: string
  /** Brand menu asset — priority 2 */
  officialBrandImage?: string
  /** Food DNA cluster — priority 3 */
  clusterHeroImage?: string
  imageCategory?: ImageCategory
}

function normalizeInput(input: FoodPhotoInput): FoodImageInput {
  const primary = stripStorePrefix(primaryFoodLabel(input.name))
  return {
    name: primary,
    store: input.store,
    userUploadedPhoto: input.userUploadedPhoto ?? input.photo_url,
    officialBrandImage: input.officialBrandImage,
    clusterHeroImage: input.clusterHeroImage,
    imageCategory: input.imageCategory,
  }
}

export function classifyMenuItem(name: string, store?: string): ImageCategory {
  const primary = stripStorePrefix(primaryFoodLabel(name))
  return classifyImageCategory(primary, store)
}

export function classifyMenuItemPhoto(name: string): ImageCategory {
  const primary = stripStorePrefix(primaryFoodLabel(name))
  return classifyImageCategory(primary)
}

export function foodPhotoCategoryForLabel(name: string, store?: string): ImageCategory {
  return classifyMenuItem(name, store)
}

export function foodPhotoForLabel(name: string, store?: string, _size?: number): string {
  return resolveFoodImage({ name, store }).src
}

export function foodPhotoForItem(item: FoodPhotoInput, _size?: number): string {
  return resolveFoodImage(normalizeInput(item)).src
}

export function foodPhotoFallbackChain(name: string, store?: string, _size?: number): string[] {
  const category = classifyMenuItem(name, store)
  const pool = CATEGORY_IMAGE_POOL[category] ?? CATEGORY_IMAGE_POOL.restaurant
  const primary = pickCategoryImage(category, `${name}|${store ?? ''}`)
  return [primary, ...pool.filter(p => p !== primary), DEFAULT_CATEGORY_IMAGE]
}

export function resolveFoodPhotoItem(item: FoodPhotoInput): ResolvedFoodImage {
  return resolveFoodImage(normalizeInput(item))
}
