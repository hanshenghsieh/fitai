/** Alias normalizer — delegates to food-kb normalize (no AI guessing). */
import { normalizeBrandName, normalizeFoodName } from '@/lib/food-kb/normalize'

export function normalizeAliasToken(input: string): string {
  return normalizeFoodName(input)
}

export function normalizeRestaurantAlias(input: string): string {
  return normalizeBrandName(input)
}

export { normalizeFoodName, normalizeBrandName }
