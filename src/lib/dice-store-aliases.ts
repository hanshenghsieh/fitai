/** Dice UI + pool treat these as the same brand. */
const ALIAS_TO_CANONICAL: Record<string, string> = {
  梁社漢排骨: '梁社漢',
}

export function canonicalDiceStore(store: string): string {
  const s = store.trim()
  return ALIAS_TO_CANONICAL[s] ?? s
}

export function diceStoreVariants(store: string): string[] {
  const canonical = canonicalDiceStore(store)
  const variants = new Set<string>([canonical])
  for (const [alias, canon] of Object.entries(ALIAS_TO_CANONICAL)) {
    if (canon === canonical) variants.add(alias)
  }
  return [...variants]
}

export function diceStoreMatches(itemStore: string, targetStore: string): boolean {
  return diceStoreVariants(targetStore).includes(itemStore.trim())
}
