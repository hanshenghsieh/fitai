import type { ConvenienceItem } from './convenience-store-menu'
import allowlistJson from '../../data/food-kb/food-source-allowlist.json'
import { buildAllowlistStoreIndex, type AllowlistFile } from './nutrition/restaurant-menu-audit'

const ALLOWLIST = allowlistJson as AllowlistFile

let allowlistIndex: Map<string, string> | null = null
/** canonical → all runtime store strings seen in menu + allowlist aliases */
let variantsByCanonical: Map<string, string[]> | null = null

function normalizeStoreKey(name: string): string {
  return name.trim().toLowerCase()
}

function ensureAllowlistIndex(): Map<string, string> {
  if (!allowlistIndex) allowlistIndex = buildAllowlistStoreIndex(ALLOWLIST)
  return allowlistIndex
}

function ensureVariantsByCanonical(): Map<string, string[]> {
  if (variantsByCanonical) return variantsByCanonical
  variantsByCanonical = new Map()
  for (const entry of ALLOWLIST.entries) {
    const canonical = entry.canonical_name.trim()
    const variants = new Set<string>([canonical])
    for (const alias of entry.search_aliases ?? []) variants.add(alias.trim())
    if (entry.slug) variants.add(entry.slug.trim())
    variantsByCanonical.set(canonical, [...variants])
  }
  return variantsByCanonical
}

/** Rebuild store variant groups from merged dice menu (core + bulk). */
export function rebuildDiceStoreVariantIndex(menu: ConvenienceItem[]): void {
  ensureAllowlistIndex()
  const index = allowlistIndex!
  const byCanonical = new Map<string, Set<string>>()

  for (const entry of ALLOWLIST.entries) {
    const canonical = entry.canonical_name.trim()
    const set = new Set<string>([canonical])
    for (const alias of entry.search_aliases ?? []) set.add(alias.trim())
    if (entry.slug) set.add(entry.slug.trim())
    byCanonical.set(canonical, set)
  }

  for (const item of menu) {
    const store = (item.store ?? '').trim()
    if (!store || store === '自助餐組件') continue
    const canonical = index.get(normalizeStoreKey(store)) ?? store
    const set = byCanonical.get(canonical) ?? new Set<string>()
    set.add(store)
    byCanonical.set(canonical, set)
  }

  variantsByCanonical = new Map(
    [...byCanonical.entries()].map(([canonical, set]) => [canonical, [...set]])
  )
}

export function clearDiceStoreVariantIndexForTests(): void {
  allowlistIndex = null
  variantsByCanonical = null
}

/** Allowlist canonical store name for dice grouping + UI. */
export function canonicalDiceStore(store: string): string {
  const s = store.trim()
  if (!s) return s
  const index = ensureAllowlistIndex()
  return index.get(normalizeStoreKey(s)) ?? s
}

export function diceStoreVariants(store: string): string[] {
  const canonical = canonicalDiceStore(store)
  const map = ensureVariantsByCanonical()
  return map.get(canonical) ?? [canonical]
}

export function diceStoreMatches(itemStore: string, targetStore: string): boolean {
  return canonicalDiceStore(itemStore) === canonicalDiceStore(targetStore)
}

export function allDiceCanonicalStores(): string[] {
  return ALLOWLIST.entries.map(e => e.canonical_name.trim())
}

export function allowlistEntryForStore(store: string) {
  const canonical = canonicalDiceStore(store)
  return ALLOWLIST.entries.find(e => e.canonical_name.trim() === canonical)
}
