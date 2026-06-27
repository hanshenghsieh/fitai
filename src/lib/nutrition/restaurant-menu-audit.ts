import type { ConvenienceItem } from '@/lib/convenience-store-menu'

export interface AllowlistEntry {
  rank?: number
  canonical_name: string
  search_aliases?: string[]
  slug?: string
  seed_priority?: string
  confidence_level?: string
}

export interface AllowlistFile {
  count: number
  entries: AllowlistEntry[]
}

export interface RestaurantMenuAuditResult {
  restaurantTotal: number
  menuItemTotal: number
  restaurantsWithoutMenu: string[]
  restaurantsWithoutMenuCount: number
  avgItemsPerRestaurant: number
  restaurantsWithFewerThan3Items: string[]
  orphanMenuItemsNoStore: number
  orphanMenuItemsUnknownStore: number
  duplicateRestaurantNames: string[]
  itemsMissingNutrition: Array<{ id: string; store: string; name: string; missing: string[] }>
  storesInMenuNotInAllowlist: string[]
  allowlistWithoutMenu: string[]
  itemsByStore: Map<string, ConvenienceItem[]>
}

function normalizeStoreName(name: string): string {
  return name.trim().toLowerCase()
}

export function buildAllowlistStoreIndex(allowlist: AllowlistFile): Map<string, string> {
  const index = new Map<string, string>()
  for (const entry of allowlist.entries) {
    const canonical = entry.canonical_name.trim()
    index.set(normalizeStoreName(canonical), canonical)
    for (const alias of entry.search_aliases ?? []) {
      index.set(normalizeStoreName(alias), canonical)
    }
    if (entry.slug) index.set(normalizeStoreName(entry.slug), canonical)
  }
  return index
}

export function mergeMenuSources(core: ConvenienceItem[], bulk: ConvenienceItem[] = []): ConvenienceItem[] {
  const seen = new Set(core.map(i => i.id))
  const extra = bulk.filter(i => i.id && !seen.has(i.id))
  return [...core, ...extra]
}

export function hasCompleteNutrition(item: ConvenienceItem): boolean {
  return (
    item.calories != null &&
    !Number.isNaN(item.calories) &&
    item.protein_g != null &&
    !Number.isNaN(item.protein_g) &&
    item.carbs_g != null &&
    !Number.isNaN(item.carbs_g) &&
    item.fat_g != null &&
    !Number.isNaN(item.fat_g)
  )
}

export function auditRestaurantMenuData(
  menu: ConvenienceItem[],
  allowlist: AllowlistFile
): RestaurantMenuAuditResult {
  const allowlistIndex = buildAllowlistStoreIndex(allowlist)
  const canonicalRestaurants = allowlist.entries.map(e => e.canonical_name.trim())
  const restaurantSet = new Set(canonicalRestaurants)

  const itemsByStore = new Map<string, ConvenienceItem[]>()
  const itemsMissingNutrition: RestaurantMenuAuditResult['itemsMissingNutrition'] = []
  let orphanMenuItemsNoStore = 0

  for (const item of menu) {
    const store = (item.store ?? '').trim()
    if (!store) {
      orphanMenuItemsNoStore++
      continue
    }
    const list = itemsByStore.get(store) ?? []
    list.push(item)
    itemsByStore.set(store, list)

    const missing: string[] = []
    if (item.calories == null || Number.isNaN(item.calories)) missing.push('calories')
    if (item.protein_g == null || Number.isNaN(item.protein_g)) missing.push('protein_g')
    if (item.carbs_g == null || Number.isNaN(item.carbs_g)) missing.push('carbs_g')
    if (item.fat_g == null || Number.isNaN(item.fat_g)) missing.push('fat_g')
    if (missing.length) {
      itemsMissingNutrition.push({ id: item.id, store, name: item.name, missing })
    }
  }

  const storesInMenu = [...itemsByStore.keys()]
  const storesInMenuNotInAllowlist = storesInMenu.filter(
    store => !allowlistIndex.has(normalizeStoreName(store)) && store !== '自助餐組件'
  )

  const allowlistWithoutMenu = canonicalRestaurants.filter(canonical => {
    const direct = itemsByStore.get(canonical)?.length ?? 0
    if (direct > 0) return false
    for (const [store, items] of itemsByStore) {
      if (allowlistIndex.get(normalizeStoreName(store)) === canonical && items.length > 0) return false
    }
    return true
  })

  const duplicateRestaurantNames = canonicalRestaurants.filter(
    (name, idx) => canonicalRestaurants.indexOf(name) !== idx
  )

  const restaurantsWithFewerThan3Items = canonicalRestaurants.filter(canonical => {
    let count = 0
    for (const [store, items] of itemsByStore) {
      if (allowlistIndex.get(normalizeStoreName(store)) === canonical || store === canonical) {
        count += items.length
      }
    }
    return count > 0 && count < 3
  })

  const menuItemTotal = menu.length
  const restaurantsWithMenu = canonicalRestaurants.filter(canonical => {
    for (const [store, items] of itemsByStore) {
      if ((allowlistIndex.get(normalizeStoreName(store)) === canonical || store === canonical) && items.length > 0) {
        return true
      }
    }
    return false
  })

  const restaurantTotal = allowlist.count || canonicalRestaurants.length
  const restaurantsWithoutMenu = allowlistWithoutMenu
  const avgItemsPerRestaurant =
    restaurantsWithMenu.length > 0
      ? Math.round((menuItemTotal / restaurantsWithMenu.length) * 10) / 10
      : 0

  return {
    restaurantTotal,
    menuItemTotal,
    restaurantsWithoutMenu,
    restaurantsWithoutMenuCount: restaurantsWithoutMenu.length,
    avgItemsPerRestaurant,
    restaurantsWithFewerThan3Items,
    orphanMenuItemsNoStore,
    orphanMenuItemsUnknownStore: storesInMenuNotInAllowlist.length,
    duplicateRestaurantNames,
    itemsMissingNutrition,
    storesInMenuNotInAllowlist,
    allowlistWithoutMenu,
    itemsByStore,
  }
}

export function storeHasMenuItem(
  store: string,
  itemName: string,
  itemsByStore: Map<string, ConvenienceItem[]>
): boolean {
  const items = itemsByStore.get(store) ?? []
  return items.some(i => i.name === itemName || i.id === `${store}-${itemName}`)
}
