import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import type { DuplicateGroup } from './types'

function normalizeDishName(name: string): string {
  return name
    .replace(/（.*?）/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s*·\s*.*$/, '')
    .replace(/舒肥|嫩|香|經典|招牌|特選/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase()
}

export function findDuplicateGroups(items: ConvenienceItem[]): DuplicateGroup[] {
  const byStoreCanon = new Map<string, Map<string, Array<{ id: string; name: string }>>>()

  for (const item of items) {
    const store = item.store.trim()
    const canon = normalizeDishName(item.name)
    if (!canon) continue
    if (!byStoreCanon.has(store)) byStoreCanon.set(store, new Map())
    const storeMap = byStoreCanon.get(store)!
    if (!storeMap.has(canon)) storeMap.set(canon, [])
    storeMap.get(canon)!.push({ id: item.id, name: item.name })
  }

  const groups: DuplicateGroup[] = []
  for (const [store, canonMap] of byStoreCanon) {
    for (const [canonical_name, variants] of canonMap) {
      if (variants.length > 1) {
        groups.push({ canonical_name, store, variants })
      }
    }
  }
  return groups.sort((a, b) => b.variants.length - a.variants.length)
}

export function assignCanonicalId(group: DuplicateGroup): string {
  const sorted = [...group.variants].sort((a, b) => a.name.length - b.name.length)
  return sorted[0]!.id
}
