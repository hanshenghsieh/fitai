import type { ConvenienceItem } from './convenience-store-menu'
import type { MealLine } from './meal-engine-types'
import { getItemRole, isStarchMain, isBeverage, isSolidFood, isFullMealName, isSoupLike, normalizeDishKey } from './eat-out-builder'
import { isPlausibleBrandItem, isSameStoreMeal } from './store-menu-plausibility'

/** 一餐只能有一份主餐；連鎖套餐不可跨店混搭 */
export function isValidMealLines(lines: MealLine[]): boolean {
  if (!lines.length) return false

  const drinks = lines.filter(l => isBeverage(l.item))
  if (drinks.length > 1) return false

  const soups = lines.filter(l => isSoupLike(l.item.name))
  if (soups.length > 1) return false

  const dishKeys = lines.map(l => normalizeDishKey(l.item.name))
  if (dishKeys.length !== new Set(dishKeys).size) return false

  const solids = lines.filter(l => isSolidFood(l.item))
  if (solids.length === 0) return false

  const isDrink = (i: ConvenienceItem) => isBeverage(i)

  const starchMains = lines.filter(l => isStarchMain(l.item))
  if (starchMains.length > 1) return false

  const mains = lines.filter(l => {
    if (isDrink(l.item)) return false
    if (getItemRole(l.item) === 'side') return false
    if (l.item.store === '自助餐組件' && getItemRole(l.item) !== 'combo') return false
    return l.item.calories >= 120 || getItemRole(l.item) === 'combo' || getItemRole(l.item) === 'main' || getItemRole(l.item) === 'protein'
  })
  if (mains.length > 1) {
    const stores = new Set(mains.map(l => l.item.store))
    if (stores.size > 1) return false
    const chainMains = mains.filter(
      l => l.item.source === 'chain' && (l.item.role ?? 'combo') === 'combo' && l.item.store !== '自助餐組件'
    )
    if (chainMains.length > 1) return false
  }

  // 不可只有飲料
  const mealType = lines[0]?.item.category
  if (mealType === 'breakfast' || mealType === 'lunch' || mealType === 'dinner') {
    if (solids.length === 0) return false
    if (mealType === 'lunch' || mealType === 'dinner') {
      const nonDrink = lines.filter(l => !isDrink(l.item))
      const minCal = nonDrink.some(l => isFullMealName(l.item.name)) ? 100 : 150
      if (nonDrink.every(l => l.item.calories < minCal)) return false
    }
  }

  if (!lines.every(l => isPlausibleBrandItem(l.item))) return false

  const solidItems = lines.map(l => l.item).filter(i => isSolidFood(i))
  if (solidItems.length > 0 && !isSameStoreMeal(solidItems)) return false

  return true
}
export function isValidSingleItemLines(lines: MealLine[]): boolean {
  if (lines.length !== 1) return false
  const item = lines[0]!.item
  if (isBeverage(item)) return item.calories <= 650
  if ((item.role ?? '') === 'side' || (item.role ?? '') === 'protein') {
    return item.calories >= 40
  }
  return isValidMealLines(lines)
}

/** 過濾自動生成腳本的離譜資料 */
export function isSanitizedMenuItem(
  item: ConvenienceItem,
  opts?: { allowBeverages?: boolean }
): boolean {
  if (item.store === '王品') return false
  if (item.id.startsWith('王品-')) return false

  if (
    !opts?.allowBeverages &&
    (item.category === 'lunch' || item.category === 'dinner') &&
    isBeverage(item)
  ) {
    return false
  }
  if ((item.role ?? 'combo') === 'combo' && item.category !== 'breakfast' && item.calories < 200) {
    return false
  }
  // 連鎖套餐價格過低（通常是批次腳本錯誤）
  if (item.source === 'chain' && (item.role ?? 'combo') === 'combo' && !isBeverage(item)) {
    if (item.category === 'lunch' && item.price < 45) return false
    if (item.category === 'dinner' && item.price < 55) return false
  }

  return true
}
