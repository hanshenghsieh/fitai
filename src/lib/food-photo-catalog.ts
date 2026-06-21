/**
 * @deprecated Use food-image-system.ts — kept for import compatibility.
 */
export {
  type ImageCategory as FoodPhotoCategory,
  IMAGE_CATEGORIES,
  CATEGORY_IMAGE_POOL,
  DEFAULT_CATEGORY_IMAGE,
  classifyImageCategory as classifyFoodPhotoCategory,
  pickCategoryImage as photoUrlForCategory,
  resolveFoodImage,
  isUsableFoodPhoto,
} from './food-image-system'

import type { ImageCategory } from './food-image-system'

/** Legacy compat map — same category space now */
export function isCategoryCompatible(expected: ImageCategory, actual: ImageCategory): boolean {
  return expected === actual || expected === 'restaurant' || actual === 'restaurant'
}

export const CATEGORY_PHOTOS = {} as Record<ImageCategory, string>
export const CATEGORY_COMPAT = {} as Partial<Record<ImageCategory, ImageCategory[]>>
