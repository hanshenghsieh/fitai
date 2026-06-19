import { eatOutMenu, type ConvenienceItem } from './convenience-store-menu'
import { getItemRole, isStarchMain, isBeverage, isSolidFood, isSideCandidate } from './eat-out-builder'
import { isPlantBasedItem } from './eat-out-filters'
import type { UserProfile } from '@/types'

export interface MealCombo {
  items: ConvenienceItem[]
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  price: number
}

export interface SavedMealCombo {
  meal_type: 'breakfast' | 'lunch' | 'dinner'
  meal_type_zh: string
  items: ConvenienceItem[]
  total_calories: number
  total_protein_g: number
  total_carbs_g: number
  total_fat_g: number
  reasoning: string
}

const MEAL_LABELS = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' }
const CATEGORY_OFFSET = { breakfast: 0, lunch: 2, dinner: 5 }

function filterMenu(
  category: 'breakfast' | 'lunch' | 'dinner',
  profile?: UserProfile
): ConvenienceItem[] {
  let items = eatOutMenu.filter(i => i.category === category && !isBeverage(i))
  if (!profile) return items

  if (profile.is_vegan || profile.is_vegetarian) {
    items = items.filter(i => isPlantBasedItem(i, profile))
  }
  for (const a of profile.allergens ?? []) {
    items = items.filter(i => !i.name.includes(a) && !(i.description ?? '').includes(a))
  }
  for (const d of profile.disliked_foods ?? []) {
    items = items.filter(i => !i.name.includes(d))
  }
  if (items.length) return items
  const fallback = eatOutMenu.filter(i => i.category === category && isPlantBasedItem(i, profile))
  return fallback.length ? fallback : eatOutMenu.filter(i => i.category === category)
}

/** 同名商品（7-11/全家）依日期輪流選店，避免重複 */
function uniqueByNameRotating(items: ConvenienceItem[], dayIndex: number): ConvenienceItem[] {
  const groups = new Map<string, ConvenienceItem[]>()
  for (const item of items) {
    const list = groups.get(item.name) ?? []
    list.push(item)
    groups.set(item.name, list)
  }
  return Array.from(groups.values()).map(versions => versions[dayIndex % versions.length]!)
}

function scoreCombo(combo: MealCombo, maxCalories: number, targetProtein: number): number {
  const overCal = combo.totalCalories > maxCalories * 1.03 ? (combo.totalCalories - maxCalories) * 8 : 0
  const underProtein = combo.totalProtein < targetProtein * 0.85 ? (targetProtein - combo.totalProtein) * 4 : 0
  const calDiff = Math.abs(combo.totalCalories - maxCalories * 0.92)
  const proteinDiff = Math.abs(combo.totalProtein - targetProtein) * 3
  return overCal + underProtein + calDiff + proteinDiff
}

function buildComboForMain(
  main: ConvenienceItem,
  sides: ConvenienceItem[],
  beverages: ConvenienceItem[],
  maxCalories: number,
  targetProtein: number
): MealCombo {
  let combo: MealCombo = {
    items: [main],
    totalCalories: main.calories,
    totalProtein: main.protein_g,
    totalCarbs: main.carbs_g,
    totalFat: main.fat_g,
    price: main.price,
  }

  const usedNames = new Set([main.name])
  const sortedSides = [...sides].sort(
    (a, b) => b.protein_g / Math.max(b.calories, 1) - a.protein_g / Math.max(a.calories, 1)
  )

  for (const side of sortedSides) {
    if (side.id === main.id || usedNames.has(side.name)) continue
    if (combo.totalCalories + side.calories > maxCalories * 1.05) continue
    if (combo.items.filter(i => isSideCandidate(i)).length >= 3) continue

    combo = {
      items: [...combo.items, side],
      totalCalories: combo.totalCalories + side.calories,
      totalProtein: combo.totalProtein + side.protein_g,
      totalCarbs: combo.totalCarbs + side.carbs_g,
      totalFat: combo.totalFat + side.fat_g,
      price: combo.price + side.price,
    }
    usedNames.add(side.name)

    if (combo.totalProtein >= targetProtein * 0.9 && combo.totalCalories >= maxCalories * 0.85) break
  }

  for (const drink of beverages) {
    if (isBeverage(main) || combo.items.some(i => isBeverage(i))) break
    if (usedNames.has(drink.name) || combo.items.some(i => i.id === drink.id)) continue
    if (combo.totalCalories + drink.calories <= maxCalories * 1.05) {
      combo = {
        items: [...combo.items, drink],
        totalCalories: combo.totalCalories + drink.calories,
        totalProtein: combo.totalProtein + drink.protein_g,
        totalCarbs: combo.totalCarbs + drink.carbs_g,
        totalFat: combo.totalFat + drink.fat_g,
        price: combo.price + drink.price,
      }
      break
    }
  }

  return combo
}

function sidesForMain(main: ConvenienceItem, uniqueItems: ConvenienceItem[]): {
  sides: ConvenienceItem[]
  beverages: ConvenienceItem[]
} {
  if (main.source === 'chain' || main.source === 'delivery') {
    const sameStore = uniqueItems.filter(i => i.store === main.store && i.id !== main.id)
    return {
      sides: sameStore.filter(
        i =>
          (i.role === 'side' || i.role === 'protein') &&
          i.calories < 200 &&
          !(i.role === 'combo' || (!i.role && i.calories >= 250))
      ),
      beverages: sameStore.filter(
        i =>
          isBeverage(i) ||
          i.name.includes('豆漿') ||
          (i.name.includes('茶') && !i.name.includes('茶葉蛋')) ||
          i.name.includes('飲') ||
          i.name.includes('湯')
      ),
    }
  }
  const convenience = eatOutMenu.filter(
    i => i.source === 'convenience' && i.store === main.store && i.id !== main.id
  )
  return {
    sides: convenience.filter(i => isSideCandidate(i, main.store)),
    beverages: convenience.filter(
      i =>
        i.role === 'drink' ||
        i.name.includes('豆漿') ||
        (i.name.includes('茶') && !i.name.includes('茶葉蛋')) ||
        i.name.includes('飲') ||
        i.name.includes('湯')
    ),
  }
}

/**
 * 依熱量/蛋白質目標配餐
 * - dayIndex 鎖定當天主食（非全局最高分，確保 7 天不同）
 * - excludeNames 排除本週已用過的商品名稱
 */
export function buildMealCombination(
  category: 'breakfast' | 'lunch' | 'dinner',
  maxCalories: number,
  targetProtein: number,
  dayIndex = 0,
  profile?: UserProfile,
  excludeNames: string[] = []
): MealCombo {
  const items = filterMenu(category, profile)
  if (!items.length) return emptyCombo()

  const exclude = new Set(excludeNames)
  let uniqueItems = uniqueByNameRotating(items, dayIndex).filter(i => !exclude.has(i.name))
  if (!uniqueItems.length) {
    uniqueItems = uniqueByNameRotating(items, dayIndex + exclude.size).filter(i => !exclude.has(i.name))
  }
  if (!uniqueItems.length) {
    uniqueItems = uniqueByNameRotating(items, dayIndex)
  }

  let mains = uniqueItems.filter(i => {
    if (isBeverage(i)) return false
    if (category === 'breakfast') {
      return (
        isStarchMain(i) ||
        isSolidFood(i) ||
        (i.source === 'convenience' && i.calories >= 80 && i.protein_g >= 4)
      )
    }
    return isStarchMain(i) && i.calories >= 150
  })

  if (!mains.length && category === 'breakfast') {
    mains = eatOutMenu.filter(
      i =>
        i.category === 'breakfast' &&
        i.source === 'convenience' &&
        !isBeverage(i) &&
        isSolidFood(i)
    )
  }

  if (!mains.length) return emptyCombo()

  const offset = CATEGORY_OFFSET[category]
  const startIdx = (dayIndex + offset) % mains.length
  const forcedMain = mains[startIdx]!

  if (forcedMain.calories <= maxCalories * 1.05) {
    const { sides, beverages } = sidesForMain(forcedMain, uniqueItems)
    const forcedCombo = buildComboForMain(forcedMain, sides, beverages, maxCalories, targetProtein)
    if (forcedCombo.items.length > 0) {
      return forcedCombo
    }
  }

  const tryOrder = [...mains.slice(startIdx), ...mains.slice(0, startIdx)]

  let bestCombo: MealCombo | null = null
  let bestScore = Infinity

  for (let i = 0; i < tryOrder.length; i++) {
    const main = tryOrder[i]!
    if (main.calories > maxCalories * 1.15) continue

    const { sides, beverages } = sidesForMain(main, uniqueItems)
    const combo = buildComboForMain(main, sides, beverages, maxCalories, targetProtein)
    const dominancePenalty = exclude.has(main.name) ? 1000 : main.protein_g >= 42 ? 10 + i * 2 : 0
    const s = scoreCombo(combo, maxCalories, targetProtein) + i * 0.5 + dominancePenalty

    if (s < bestScore) {
      bestScore = s
      bestCombo = combo
    }

    // 當日指定主食若已達標就採用，不再搜尋全局最優
    if (i === 0 && combo.totalProtein >= targetProtein * 0.8 && combo.totalCalories <= maxCalories * 1.08) {
      return combo
    }
  }

  if (bestCombo && bestCombo.items.length > 0) {
    const forcedCombo = buildComboForMain(
      forcedMain,
      sidesForMain(forcedMain, uniqueItems).sides,
      sidesForMain(forcedMain, uniqueItems).beverages,
      maxCalories,
      targetProtein
    )
    const forcedScore = scoreCombo(forcedCombo, maxCalories, targetProtein)
    const bestScoreVal = scoreCombo(bestCombo, maxCalories, targetProtein)
    if (forcedCombo.items.length > 0 && forcedScore <= bestScoreVal * 1.15) {
      return forcedCombo
    }
    return bestCombo
  }

  const fallback = uniqueItems.find(i => !exclude.has(i.name)) ?? uniqueItems[0]!
  return {
    items: [fallback],
    totalCalories: fallback.calories,
    totalProtein: fallback.protein_g,
    totalCarbs: fallback.carbs_g,
    totalFat: fallback.fat_g,
    price: fallback.price,
  }
}

export function comboToSaved(
  category: 'breakfast' | 'lunch' | 'dinner',
  combo: MealCombo
): SavedMealCombo {
  const names = combo.items.map(i => i.name).join(' + ')
  return {
    meal_type: category,
    meal_type_zh: MEAL_LABELS[category],
    items: combo.items,
    total_calories: combo.totalCalories,
    total_protein_g: combo.totalProtein,
    total_carbs_g: combo.totalCarbs,
    total_fat_g: combo.totalFat,
    reasoning: `依每日目標配餐：${names}`,
  }
}

function emptyCombo(): MealCombo {
  return { items: [], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, price: 0 }
}

export function buildMealCombinationLegacy(
  mealType: 'breakfast' | 'lunch' | 'dinner',
  targetCalories: number,
  targetProtein: number,
  _targetCarbs: number,
  _targetFat: number,
  dayIndex = 0,
  profile?: UserProfile,
  excludeNames: string[] = []
) {
  const combo = buildMealCombination(mealType, targetCalories, targetProtein, dayIndex, profile, excludeNames)
  const saved = comboToSaved(mealType, combo)
  return {
    items: saved.items,
    total_calories: saved.total_calories,
    total_protein_g: saved.total_protein_g,
    total_carbs_g: saved.total_carbs_g,
    total_fat_g: saved.total_fat_g,
    reasoning: saved.reasoning,
  }
}
