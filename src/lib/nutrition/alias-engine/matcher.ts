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
    if (row.token !== q && !q.includes(row.token) && !row.token.includes(q)) continue
    const entryStore = row.entry.store ? normalizeRestaurantAlias(row.entry.store) : undefined
    if (storeNorm && entryStore && entryStore !== storeNorm) continue

    let score = row.token === q ? 100 : 85
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
