import aliasData from '@/lib/nutrition/alias-engine/food_aliases.json'
import { normalizeAliasToken, normalizeRestaurantAlias } from '@/lib/nutrition/alias-engine/normalizer'

export interface FoodAliasEntry {
  official_name: string
  store?: string
  item_id?: string
  aliases: string[]
  restaurant_aliases: string[]
}

export interface AliasResolveResult {
  official_name: string
  store?: string
  item_id?: string
  matched_alias: string
  match_type: 'alias' | 'restaurant_alias' | 'official'
}

type AliasIndexRow = {
  entry: FoodAliasEntry
  token: string
  kind: 'alias' | 'restaurant_alias' | 'official'
}

/**
 * Below this coverage ratio (shorter token length / longer token length), a
 * substring-containment match against a raw `official_name` token is too
 * weak to trust. Mirrors the equivalent guard in food-menu-lookup.ts's
 * scoreNameMatch (SUBSTRING_COVERAGE_THRESHOLD) — without it, a bare 1-2
 * character generic query like "蛋" would match ANY official name that
 * merely contains that character anywhere (e.g. a specific "糖心蛋雞胸餐"
 * restaurant meal), and — because an alias-engine hit short-circuits
 * scoreNameMatch to a near-maximum 98 score — that unrelated dish would
 * outrank the correct generic-food answer with false confidence.
 *
 * Deliberately scoped to `kind === 'official'` only. `alias` /
 * `restaurant_alias` rows are curated by a human specifically so a shorter
 * colloquial term resolves to a product (e.g. "竹筍湯" is intentionally
 * listed as a partial alias of 7-11's "竹筍排骨湯" via "竹筍湯排骨" /
 * "711竹筍湯") — that's real signal, not noise, and applying the same
 * length-ratio guard there breaks legitimate curated shorthand.
 */
const OFFICIAL_NAME_SUBSTRING_COVERAGE_THRESHOLD = 0.8

/**
 * A substring-containment match (curated alias or not) requires the query
 * to be at least this long. This is what actually separates the "蛋"
 * (1-char, matches even a curated "糖心蛋雞" alias with no real signal) case
 * from the legitimate "竹筍湯" (3-char, matches the curated "竹筍湯排骨" /
 * "711竹筍湯" aliases it was clearly written to match) case — length alone,
 * not the coverage ratio, is what makes a short query too generic to trust.
 */
const MIN_SUBSTRING_QUERY_LENGTH = 2

let index: AliasIndexRow[] | null = null

function buildIndex(): AliasIndexRow[] {
  if (index) return index
  const rows: AliasIndexRow[] = []
  const entries = (aliasData as { entries: FoodAliasEntry[] }).entries

  for (const entry of entries) {
    const officialTok = normalizeAliasToken(entry.official_name)
    rows.push({ entry, token: officialTok, kind: 'official' })
    for (const a of entry.aliases) {
      rows.push({ entry, token: normalizeAliasToken(a), kind: 'alias' })
    }
    for (const r of entry.restaurant_aliases) {
      rows.push({ entry, token: normalizeRestaurantAlias(r), kind: 'restaurant_alias' })
    }
  }
  index = rows
  return rows
}

export function getAliasEntryCount(): number {
  return (aliasData as { entry_count: number }).entry_count
}

export function getAliasTokenCount(): number {
  return (aliasData as { alias_count: number }).alias_count
}

/** Resolve query token to official item — exact match only, no guessing. */
export function resolveAliasQuery(
  query: string,
  opts?: { store?: string }
): AliasResolveResult | null {
  const q = normalizeAliasToken(query)
  if (!q) return null
  const storeNorm = opts?.store ? normalizeRestaurantAlias(opts.store) : undefined

  const rows = buildIndex()
  let best: AliasIndexRow | null = null
  let bestScore = 0

  for (const row of rows) {
    const exact = row.token === q
    if (!exact) {
      // A single generic character ("蛋", "湯", "肉"…) is never a specific
      // enough signal to trust via substring containment, curated alias or
      // not — only an exact match should ever resolve it.
      if (q.length < MIN_SUBSTRING_QUERY_LENGTH) continue
      const isSubstring = q.includes(row.token) || row.token.includes(q)
      if (!isSubstring) continue
      if (row.kind === 'official') {
        const shorter = Math.min(q.length, row.token.length)
        const longer = Math.max(q.length, row.token.length)
        if (longer === 0 || shorter / longer < OFFICIAL_NAME_SUBSTRING_COVERAGE_THRESHOLD) continue
      }
    }
    const entryStore = row.entry.store ? normalizeRestaurantAlias(row.entry.store) : undefined
    if (storeNorm && entryStore && entryStore !== storeNorm) continue

    let score = exact ? 100 : 85
    if (row.kind === 'official') score += 5
    if (storeNorm && entryStore === storeNorm) score += 10
    if (score > bestScore) {
      bestScore = score
      best = row
    }
  }

  if (!best || bestScore < 85) return null

  return {
    official_name: best.entry.official_name,
    store: best.entry.store,
    item_id: best.entry.item_id,
    matched_alias: query.trim(),
    match_type: best.kind,
  }
}

export function expandQueryWithAliases(query: string, store?: string): string[] {
  const resolved = resolveAliasQuery(query, { store })
  const out = new Set<string>([query.trim()])
  if (resolved) {
    out.add(resolved.official_name)
    if (resolved.store) out.add(`${resolved.store}${resolved.official_name}`)
  }
  return [...out].filter(Boolean)
}

export function listAliasEntries(): FoodAliasEntry[] {
  return (aliasData as { entries: FoodAliasEntry[] }).entries
}

/** Test helper */
export function clearAliasIndexCache(): void {
  index = null
}
