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
 * substring-containment match is too weak to trust — curated alias row or
 * not. Mirrors the equivalent guard in food-menu-lookup.ts's scoreNameMatch
 * (SUBSTRING_COVERAGE_THRESHOLD). Without it, a short query matches ANY
 * name/alias that merely contains it anywhere, and — because an
 * alias-engine hit short-circuits scoreNameMatch to a near-maximum 98
 * score — an unrelated dish outranks the correct answer with false
 * confidence: "蛋" → "糖心蛋雞胸餐" (400 kcal, an unrelated restaurant meal),
 * "蛋餅" → "美而美玉米起司蛋餅" (a specific branded product) via its curated
 * "玉米起司蛋餅" alias, and — discovered when a looser, `kind`-dependent
 * version of this threshold was tried and broke the wider test suite —
 * "雞蛋"/"雞胸肉"/"香蕉"/"無糖豆漿" all similarly hijacked by curated aliases
 * of unrelated products at exactly the same ~0.5 coverage ratio as the one
 * legitimate curated-shorthand case this threshold must still allow
 * ("711竹筍排骨湯", a near-full-length, near-exact query — see AE4 in
 * alias-engine.test.ts). A single uniform threshold, not a per-`kind`
 * split, is what actually holds up: 0.8 comfortably clears AE4's
 * near-exact query while rejecting every one of the ~0.5-ratio false
 * positives above.
 */
const SUBSTRING_COVERAGE_THRESHOLD = 0.8

/**
 * A substring-containment match requires the query to be at least this
 * long — a single generic character ("蛋", "湯", "肉"…) is never a specific
 * enough signal to trust via substring containment, regardless of ratio.
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
      const shorter = Math.min(q.length, row.token.length)
      const longer = Math.max(q.length, row.token.length)
      if (longer === 0 || shorter / longer < SUBSTRING_COVERAGE_THRESHOLD) continue
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
