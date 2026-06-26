/**
 * Alias Engine — deterministic alias → official item resolution.
 * Zero Hallucination: exact index lookup only.
 */
export {
  resolveAliasQuery,
  expandQueryWithAliases,
  getAliasEntryCount,
  getAliasTokenCount,
  listAliasEntries,
  clearAliasIndexCache,
  type FoodAliasEntry,
  type AliasResolveResult,
} from '@/lib/nutrition/alias-engine/matcher'

export { normalizeAliasToken, normalizeRestaurantAlias, normalizeFoodName } from '@/lib/nutrition/alias-engine/normalizer'

import { resolveAliasQuery, expandQueryWithAliases, getAliasEntryCount, getAliasTokenCount } from '@/lib/nutrition/alias-engine/matcher'

export function resolveToOfficialName(query: string, store?: string): string {
  const hit = resolveAliasQuery(query, { store })
  return hit?.official_name ?? query.trim()
}

export function aliasEngineStats() {
  return {
    entries: getAliasEntryCount(),
    aliases: getAliasTokenCount(),
  }
}

export { resolveAliasQuery as default }
