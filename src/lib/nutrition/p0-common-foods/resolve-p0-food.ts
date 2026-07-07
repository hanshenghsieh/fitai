import { getP0Catalog, getP0FoodByNormalizedLabel } from './catalog'
import { normalizeP0Name } from './normalize'
import { searchP0CommonFoods } from './search'
import type { CommonFoodItem, P0SearchHit } from './types'

const RESOLVE_MIN_SCORE = 68

/** Strip brand / meal noise before resolving a logged label to a P0 item. */
export function cleanLabelForP0Resolve(label: string): string {
  return label
    .trim()
    .replace(/^(7-11|711|全家|萊爾富)\s*/i, '')
    .replace(/\s*·.*$/, '')
    .replace(/\s*[（(].*?[）)]\s*/g, '')
    .trim()
}

export function resolveP0FoodByLabel(
  label: string,
  options?: { minScore?: number }
): CommonFoodItem | null {
  const trimmed = label.trim()
  const hadStorePrefix = /^(7-11|711|全家|萊爾富)\s*/i.test(trimmed)
  const cleaned = cleanLabelForP0Resolve(label)
  if (!cleaned) return null

  const norm = normalizeP0Name(cleaned)
  const exact = getP0FoodByNormalizedLabel(norm)
  if (exact) return exact

  // Store prefix aliases (711竹筍湯) must not fuzzy-resolve after stripping the prefix.
  if (hadStorePrefix) return null

  const minScore = options?.minScore ?? RESOLVE_MIN_SCORE
  const hits = searchP0CommonFoods(cleaned, 5)
  const best = hits[0]
  if (best && best.score >= minScore) return best.item

  return null
}

export function findP0FoodCandidates(label: string, limit = 5): P0SearchHit[] {
  const cleaned = cleanLabelForP0Resolve(label)
  if (!cleaned) return []
  return searchP0CommonFoods(cleaned, limit)
}

export function isLikelyP0Ingredient(label: string): boolean {
  return resolveP0FoodByLabel(label) != null
}

export function listP0ResolveLabels(): string[] {
  return getP0Catalog().flatMap(item => [item.name, ...item.aliases])
}
