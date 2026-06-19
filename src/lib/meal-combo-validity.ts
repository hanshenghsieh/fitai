import type { ConvenienceItem } from './convenience-store-menu'
import type { MealLine } from './meal-engine-types'
import { getItemRole, isStarchMain, isBeverage, isSolidFood } from './eat-out-builder'

/** 一餐只能有一份主餐；連鎖套餐不可跨店混搭 */
export function isValidMealLines(lines: MealLine[]): boolean {
  if (!lines.length) return false

  const drinks = lines.filter(l => isBeverage(l.item))
  if (drinks.length > 1) return false

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
      if (nonDrink.every(l => l.item.calories < 150)) return false
    }
  }

  return true
}

/** 過濾自動生成腳本的離譜資料 */
export function isSanitizedMenuItem(item: ConvenienceItem): boolean {
  if (item.store === '王品') return false
  if (item.id.startsWith('王品-')) return false

  if ((item.category === 'lunch' || item.category === 'dinner') && isBeverage(item)) return false
  if ((item.role ?? 'combo') === 'combo' && item.category !== 'breakfast' && item.calories < 200) {
    return false
  }
  // 連鎖套餐價格過低（通常是批次腳本錯誤）
  if (item.source === 'chain' && (item.role ?? 'combo') === 'combo' && !isBeverage(item)) {
    if (item.category === 'lunch' && item.price < 70) return false
    if (item.category === 'dinner' && item.price < 90) return false
  }

  return true
}
