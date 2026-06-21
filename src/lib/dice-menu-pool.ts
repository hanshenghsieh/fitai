/**
 * 骰子配餐可用菜單池 — 核心菜單 + bulk 變體（5 萬品項交叉配對）
 */
import { eatOutMenu, type ConvenienceItem } from './convenience-store-menu'
import { getFilteredMenu } from './eat-out-filters'
import type { MealType } from './checkin-utils'
import type { UserProfile } from '@/types'
import type { UserMemoryState } from './meal-engine-types'
import { isBeverage, isFullMealName, isSolidFood, isStarchMain } from './eat-out-builder'

/** 手搖飲 / 咖啡品牌（動態對齊 brand-registry） */
export { DRINK_STORE_NAMES, isDrinkStore } from './drink-stores'

let diceMenuSource: ConvenienceItem[] | null = null
let bulkLoadPromise: Promise<ConvenienceItem[]> | null = null

function mergeDiceMenus(bulk: ConvenienceItem[]): ConvenienceItem[] {
  const seen = new Set(eatOutMenu.map(i => i.id))
  const extra = bulk.filter(i => i.id && !seen.has(i.id))
  return [...eatOutMenu, ...extra]
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
  return diceMenuSource ?? eatOutMenu
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
    return item.store === main.store && (item.protein_g >= 3 || item.calories < 200)
  }
  return item.source === 'convenience' && item.store === main.store
}

export function isDiceDrinkCandidate(item: ConvenienceItem, main: ConvenienceItem): boolean {
  if (!isBeverage(item)) {
    return (
      item.store === main.store &&
      (/豆漿|湯|飲/.test(item.name) || item.role === 'drink') &&
      item.calories < 200
    )
  }
  return item.store === main.store || (main.source === 'convenience' && item.source === 'convenience')
}

export function getDiceMenuPool(
  mealType: MealType,
  profile?: UserProfile | null,
  memory?: UserMemoryState
): ConvenienceItem[] {
  return getFilteredMenu(mealType, profile, memory, {
    includeBeverages: true,
    source: getDiceMenuSource(),
  })
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
  return getDiceMainPool(mealType, profile, memory).filter(i => i.store === store)
}

export function diceMenuStats(): { items: number; stores: number } {
  const src = getDiceMenuSource()
  return { items: src.length, stores: new Set(src.map(i => i.store)).size }
}
