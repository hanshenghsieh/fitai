/**
 * 骰子配餐可用菜單池 — 核心菜單 + bulk 變體（5 萬品項交叉配對）
 */
import { eatOutMenu, type ConvenienceItem } from './convenience-store-menu'
import { getFilteredMenu } from './eat-out-filters'
import type { MealType } from './checkin-utils'
import type { UserProfile } from '@/types'
import type { UserMemoryState } from './meal-engine-types'
import { isBeverage, isFullMealName, isSolidFood, isStarchMain } from './eat-out-builder'
import { diceStoreMatches, rebuildDiceStoreVariantIndex } from './dice-store-aliases'

/** 手搖飲 / 咖啡品牌（動態對齊 brand-registry） */
export { DRINK_STORE_NAMES, isDrinkStore } from './drink-stores'

let diceMenuSource: ConvenienceItem[] | null = null
let bulkLoadPromise: Promise<ConvenienceItem[]> | null = null
let menuIdIndex: Map<string, ConvenienceItem> | null = null
let menuIdIndexLen = 0
const dicePoolCache = new Map<string, ConvenienceItem[]>()

function getMenuIdIndex(menu: ConvenienceItem[]): Map<string, ConvenienceItem> {
  if (menuIdIndex && menuIdIndexLen === menu.length) return menuIdIndex
  menuIdIndex = new Map(menu.map(i => [i.id, i]))
  menuIdIndexLen = menu.length
  return menuIdIndex
}

export function lookupDiceMenuItem(id: string): ConvenienceItem | undefined {
  return getMenuIdIndex(getDiceMenuSource()).get(id)
}

const DICE_POOL_CACHE_VERSION = 6

function dicePoolCacheKey(
  mealType: MealType,
  profile?: UserProfile | null,
  memory?: UserMemoryState
): string {
  const p = profile
  const prefs = memory?.eat_out_prefs
  return [
    DICE_POOL_CACHE_VERSION,
    mealType,
    p?.is_vegetarian ? 1 : 0,
    p?.is_vegan ? 1 : 0,
    p?.is_halal ? 1 : 0,
    prefs?.breakfast_max_price ?? '',
    prefs?.lunch_max_price ?? '',
    prefs?.dinner_max_price ?? '',
    (prefs?.avoided_brands ?? []).join(','),
  ].join('|')
}

function mergeDiceMenus(bulk: ConvenienceItem[]): ConvenienceItem[] {
  const seen = new Set(eatOutMenu.map(i => i.id))
  const extra = bulk.filter(i => i.id && !seen.has(i.id))
  const runtimeChainMains: ConvenienceItem[] = [
    {
      id: '梁社漢-雞腿飯',
      name: '雞腿飯',
      store: '梁社漢',
      source: 'chain',
      category: 'lunch',
      role: 'combo',
      portionable: true,
      tags: ['rice'],
      calories: 603,
      protein_g: 33,
      carbs_g: 68,
      fat_g: 24,
      price: 125,
      photo_url: '',
      description: '梁社漢 品牌公開資料 · 雞腿飯',
    },
  ].filter(i => !seen.has(i.id))
  const merged = [...eatOutMenu, ...extra, ...runtimeChainMains]
  rebuildDiceStoreVariantIndex(merged)
  return merged
}

/** 動態載入 bulk JSON（獨立 chunk，避免塞進主 bundle） */
export function preloadDiceMenuBulk(): Promise<ConvenienceItem[]> {
  if (diceMenuSource) return Promise.resolve(diceMenuSource)
  if (!bulkLoadPromise) {
    bulkLoadPromise = import('../../data/food-kb/dice-menu-bulk.json').then(mod => {
      diceMenuSource = mergeDiceMenus(mod.default as ConvenienceItem[])
      return diceMenuSource
    })
  }
  return bulkLoadPromise
}

export function isDiceMenuBulkReady(): boolean {
  return diceMenuSource !== null
}

/** 核心菜單 + bulk 變體（去重 id）；bulk 未載入時先回核心菜單 */
export function getDiceMenuSource(): ConvenienceItem[] {
  const src = diceMenuSource ?? eatOutMenu
  if (!diceMenuSource) rebuildDiceStoreVariantIndex(src)
  return src
}

/** 可當骰子「主餐」的單品（含新擴充連鎖） */
export function isDiceMainCandidate(item: ConvenienceItem, mealType: MealType): boolean {
  if (isBeverage(item)) return false
  if (item.store === '自助餐組件') return false

  const minCal = mealType === 'breakfast' ? 80 : 120

  if (isStarchMain(item)) return item.calories >= minCal
  if (isFullMealName(item.name)) return item.calories >= minCal
  if ((item.role ?? 'combo') === 'combo' && item.calories >= (mealType === 'breakfast' ? 120 : 150)) {
    return true
  }

  if (/沙拉碗|潛艇堡|餐盒|定食|套餐|拼盤|丼|便當|拉麵|牛肉麵|鍋|壽司|飯|麵/.test(item.name)) {
    return item.calories >= minCal && isSolidFood(item)
  }

  if (item.protein_g >= 20 && item.calories >= 200 && isSolidFood(item)) return true

  return mealType === 'breakfast' && isSolidFood(item) && item.calories >= 80 && item.protein_g >= 4
}

export function isDiceSideCandidate(item: ConvenienceItem, main: ConvenienceItem): boolean {
  if (isBeverage(item) || isDiceMainCandidate(item, main.category)) return false
  if (item.calories > 280) return false
  if (main.source === 'chain' || main.source === 'delivery') {
    return diceStoreMatches(item.store, main.store) && (item.protein_g >= 3 || item.calories < 200)
  }
  return item.source === 'convenience' && diceStoreMatches(item.store, main.store)
}

export function isDiceDrinkCandidate(item: ConvenienceItem, main: ConvenienceItem): boolean {
  if (!isBeverage(item)) {
    return (
      diceStoreMatches(item.store, main.store) &&
      (/豆漿|湯|飲/.test(item.name) || item.role === 'drink') &&
      item.calories < 200
    )
  }
  return diceStoreMatches(item.store, main.store) || (main.source === 'convenience' && item.source === 'convenience')
}

export function getDiceMenuPool(
  mealType: MealType,
  profile?: UserProfile | null,
  memory?: UserMemoryState
): ConvenienceItem[] {
  const key = dicePoolCacheKey(mealType, profile, memory)
  const hit = dicePoolCache.get(key)
  if (hit) return hit
  const pool = getFilteredMenu(mealType, profile, memory, {
    includeBeverages: true,
    source: getDiceMenuSource(),
    mode: 'dice',
  })
  dicePoolCache.set(key, pool)
  return pool
}

export function isDiceSingleItem(item: ConvenienceItem, mealType: MealType): boolean {
  if (isDiceMainCandidate(item, mealType)) return true
  if ((item.role ?? '') === 'side' && item.calories >= 40) return true
  if ((item.role ?? '') === 'protein' && item.calories >= 50) return true
  if ((item.role ?? '') === 'drink' || isBeverage(item)) {
    return item.calories >= 0 && item.calories <= 650
  }
  if (item.calories >= 60 && item.protein_g >= 3 && isSolidFood(item)) return true
  return false
}

export function getDiceMainPool(
  mealType: MealType,
  profile?: UserProfile | null,
  memory?: UserMemoryState
): ConvenienceItem[] {
  return getDiceMenuPool(mealType, profile, memory).filter(i => isDiceMainCandidate(i, mealType))
}

export function getDiceSingleItemPool(
  mealType: MealType,
  profile?: UserProfile | null,
  memory?: UserMemoryState
): ConvenienceItem[] {
  return getDiceMenuPool(mealType, profile, memory).filter(i => isDiceSingleItem(i, mealType))
}

export function getSyncedDiceStores(): string[] {
  return [...new Set(getDiceMenuSource().map(i => i.store))].sort()
}

export function mainsForStore(
  store: string,
  mealType: MealType,
  profile?: UserProfile | null,
  memory?: UserMemoryState
): ConvenienceItem[] {
  return getDiceMainPool(mealType, profile, memory).filter(i => diceStoreMatches(i.store, store))
}

export function diceMenuStats(): { items: number; stores: number } {
  const src = getDiceMenuSource()
  return { items: src.length, stores: new Set(src.map(i => i.store)).size }
}
