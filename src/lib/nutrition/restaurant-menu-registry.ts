import { eatOutMenu, type ConvenienceItem } from '@/lib/convenience-store-menu'
import { getDiceMenuSource } from '@/lib/dice-menu-pool'
import allowlistData from '../../../data/food-kb/top300-allowlist.json'
import {
  auditRestaurantMenuData,
  buildAllowlistStoreIndex,
  hasCompleteNutrition,
  type AllowlistFile,
} from './restaurant-menu-audit'

const ALLOWLIST = allowlistData as AllowlistFile

let registryCache: RestaurantMenuRegistry | null = null
let registryMenuLen = 0

export interface RestaurantMenuRegistry {
  itemsById: Map<string, ConvenienceItem>
  itemsByStore: Map<string, ConvenienceItem[]>
  allowlistedStores: Set<string>
  allowlistIndex: Map<string, string>
}

function normalizeStoreName(name: string): string {
  return name.trim().toLowerCase()
}

export function canonicalStoreName(store: string, index: Map<string, string>): string | null {
  const hit = index.get(normalizeStoreName(store))
  return hit ?? null
}

export function buildRestaurantMenuRegistry(
  menu: ConvenienceItem[],
  allowlist: AllowlistFile = ALLOWLIST
): RestaurantMenuRegistry {
  const allowlistIndex = buildAllowlistStoreIndex(allowlist)
  const allowlistedStores = new Set(allowlist.entries.map(e => e.canonical_name.trim()))
  const itemsById = new Map<string, ConvenienceItem>()
  const itemsByStore = new Map<string, ConvenienceItem[]>()

  for (const item of menu) {
    const store = (item.store ?? '').trim()
    if (!store || !item.id) continue
    itemsById.set(item.id, item)
    const list = itemsByStore.get(store) ?? []
    list.push(item)
    itemsByStore.set(store, list)
  }

  return { itemsById, itemsByStore, allowlistedStores, allowlistIndex }
}

export function getRestaurantMenuRegistry(): RestaurantMenuRegistry {
  const menu = getDiceMenuSource()
  if (!registryCache || registryMenuLen !== menu.length) {
    registryCache = buildRestaurantMenuRegistry(menu)
    registryMenuLen = menu.length
  }
  return registryCache
}

export function invalidateRestaurantMenuRegistry(): void {
  registryCache = null
  registryMenuLen = 0
}

export function isAllowlistedRestaurant(store: string): boolean {
  const registry = getRestaurantMenuRegistry()
  if (store === '自助餐組件') return true
  const canonical = canonicalStoreName(store, registry.allowlistIndex)
  return canonical != null && registry.allowlistedStores.has(canonical)
}

export function restaurantHasMenu(store: string): boolean {
  const registry = getRestaurantMenuRegistry()
  const items = registry.itemsByStore.get(store) ?? []
  return items.some(hasCompleteNutrition)
}

export function menuItemExistsInRegistry(item: ConvenienceItem, registry?: RestaurantMenuRegistry): boolean {
  const reg = registry ?? getRestaurantMenuRegistry()
  const canonical = reg.itemsById.get(item.id)
  if (!canonical) return false
  return canonical.store === item.store
}

export function getAuditSnapshot() {
  return auditRestaurantMenuData(getDiceMenuSource(), ALLOWLIST)
}

/** Dev / script helper — full core menu audit without bulk */
export function getCoreMenuAudit() {
  return auditRestaurantMenuData(eatOutMenu, ALLOWLIST)
}
