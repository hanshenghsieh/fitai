import { diceStoreMatches } from './dice-store-aliases'
import { eatOutMenu, type ConvenienceItem } from './convenience-store-menu'
import { isBeverage, isSolidFood, isSoupLike, normalizeDishKey } from './eat-out-builder'
import {
  getDiceMenuPool,
  getDiceMainPool,
  isDiceMainCandidate,
  isDiceSideCandidate,
  isDiceDrinkCandidate,
} from './dice-menu-pool'
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

function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items]
  let s = seed >>> 0
  for (let i = arr.length - 1; i > 0; i--) {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr
}

function hashStoreSeed(store: string, seed: number): number {
  let h = seed
  for (let i = 0; i < store.length; i++) h = (Math.imul(31, h) + store.charCodeAt(i)) | 0
  return Math.abs(h)
}

function isPlateStyleStore(store: string): boolean {
  return /壽司|飯卷|日式|丼|拉麵|燒臘|港式/.test(store)
}

function itemsToCombo(items: ConvenienceItem[]): MealCombo {
  return {
    items,
    totalCalories: items.reduce((s, i) => s + i.calories, 0),
    totalProtein: items.reduce((s, i) => s + i.protein_g, 0),
    totalCarbs: items.reduce((s, i) => s + i.carbs_g, 0),
    totalFat: items.reduce((s, i) => s + i.fat_g, 0),
    price: items.reduce((s, i) => s + i.price, 0),
  }
}

function buildComboTrustReason(
  category: 'breakfast' | 'lunch' | 'dinner',
  _names: string
): string {
  const meal = MEAL_LABELS[category]
  return `今天${meal}幫你選方便買得到、蛋白質夠、也符合今天目標的組合。你不用自己想。`
}

function filterMenu(
  category: 'breakfast' | 'lunch' | 'dinner',
  profile?: UserProfile,
  memory?: import('./meal-engine-types').UserMemoryState
): ConvenienceItem[] {
  return getDiceMenuPool(category, profile, memory)
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
  targetProtein: number,
  variantSeed = 0
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
  const usedKeys = new Set([normalizeDishKey(main.name)])
  let soupCount = isSoupLike(main.name) ? 1 : 0
  const sortedSides = seededShuffle(
    [...sides].sort(
      (a, b) => b.protein_g / Math.max(b.calories, 1) - a.protein_g / Math.max(a.calories, 1)
    ),
    variantSeed
  )

  for (const side of sortedSides) {
    const dishKey = normalizeDishKey(side.name)
    if (side.id === main.id || usedNames.has(side.name) || usedKeys.has(dishKey)) continue
    if (isSoupLike(side.name)) {
      if (soupCount >= 1) continue
      soupCount++
    }
    if (combo.totalCalories + side.calories > maxCalories * 1.08) continue
    if (combo.items.length >= 5) continue

    combo = {
      items: [...combo.items, side],
      totalCalories: combo.totalCalories + side.calories,
      totalProtein: combo.totalProtein + side.protein_g,
      totalCarbs: combo.totalCarbs + side.carbs_g,
      totalFat: combo.totalFat + side.fat_g,
      price: combo.price + side.price,
    }
    usedNames.add(side.name)
    usedKeys.add(dishKey)

    if (combo.totalProtein >= targetProtein * 0.92 && combo.totalCalories >= maxCalories * 0.88) break
  }

  const shuffledDrinks = seededShuffle(beverages, variantSeed + 13)
  for (const drink of shuffledDrinks) {
    if (isBeverage(main) || combo.items.some(i => isBeverage(i))) break
    if (usedNames.has(drink.name) || combo.items.some(i => i.id === drink.id)) continue
    if (combo.totalCalories + drink.calories <= maxCalories * 1.08) {
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

/** 同店多品項拼盤（壽司 2–5 貫、小份主餐組合） */
export function buildStorePlateCombo(
  store: string,
  menuItems: ConvenienceItem[],
  maxCalories: number,
  targetProtein: number,
  seed: number,
  excludeNames: Set<string> = new Set()
): MealCombo | null {
  const pieces = menuItems.filter(
    i =>
      i.store === store &&
      !isBeverage(i) &&
      !excludeNames.has(i.name) &&
      i.calories >= 45 &&
      i.calories <= 380 &&
      isSolidFood(i) &&
      (/壽司|握|卷|生魚|軍艦|丼|手卷|壽喜|刺身/.test(i.name) ||
        (i.protein_g >= 4 && i.calories <= 260))
  )
  if (pieces.length < 2) return null

  const order = seededShuffle(pieces, seed)
  const picked: ConvenienceItem[] = []
  const used = new Set<string>()
  const usedKeys = new Set<string>()
  let soupCount = 0

  for (const p of order) {
    const dishKey = normalizeDishKey(p.name)
    if (used.has(p.name) || usedKeys.has(dishKey)) continue
    if (isSoupLike(p.name)) {
      if (soupCount >= 1) continue
      soupCount++
    }
    const cal = picked.reduce((s, x) => s + x.calories, 0) + p.calories
    if (cal > maxCalories * 1.06) continue
    picked.push(p)
    used.add(p.name)
    usedKeys.add(dishKey)
    const pro = picked.reduce((s, x) => s + x.protein_g, 0)
    if (picked.length >= 2 && cal >= maxCalories * 0.82 && pro >= targetProtein * 0.75) break
    if (picked.length >= 5) break
  }

  if (picked.length < 2) return null
  let combo = itemsToCombo(picked)

  const drinks = seededShuffle(
    menuItems.filter(i => i.store === store && isDiceDrinkCandidate(i, picked[0]!)),
    seed + 7
  )
  for (const drink of drinks) {
    if (combo.totalCalories + drink.calories <= maxCalories * 1.06) {
      combo = itemsToCombo([...combo.items, drink])
      break
    }
  }

  return combo.items.length >= 2 ? combo : null
}

/** 同店多組合變體（不同主餐 × 不同配菜順序 × 拼盤） */
export function enumerateStoreComboVariants(
  store: string,
  category: 'breakfast' | 'lunch' | 'dinner',
  menuItems: ConvenienceItem[],
  maxCalories: number,
  targetProtein: number,
  seed: number,
  excludeNames: Set<string> = new Set(),
  limit = 24
): MealCombo[] {
  const out: MealCombo[] = []
  const seen = new Set<string>()
  const storeSeed = hashStoreSeed(store, seed)

  if (isPlateStyleStore(store)) {
    for (let v = 0; v < 8 && out.length < limit; v++) {
      const plate = buildStorePlateCombo(store, menuItems, maxCalories, targetProtein, storeSeed + v * 991, excludeNames)
      if (!plate) continue
      const key = plate.items.map(i => i.id).sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      out.push(plate)
    }
  }

  const mains = seededShuffle(
    menuItems.filter(
      i => diceStoreMatches(i.store, store) && isDiceMainCandidate(i, category) && !excludeNames.has(i.name)
    ),
    storeSeed + 3
  )

  for (let mi = 0; mi < mains.length && out.length < limit; mi++) {
    const main = mains[mi]!
    const { sides, beverages } = sidesForMain(main, menuItems)
    for (let v = 0; v < 4 && out.length < limit; v++) {
      const combo = buildComboForMain(main, sides, beverages, maxCalories, targetProtein, storeSeed + mi * 17 + v * 131)
      if (combo.items.length < 2) continue
      const key = combo.items.map(i => i.id).sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      out.push(combo)
    }
  }

  return out
}

export function sidesForMain(main: ConvenienceItem, uniqueItems: ConvenienceItem[]): {
  sides: ConvenienceItem[]
  beverages: ConvenienceItem[]
} {
  const sameStore = uniqueItems.filter(i => diceStoreMatches(i.store, main.store) && i.id !== main.id)
  return {
    sides: sameStore.filter(i => isDiceSideCandidate(i, main)),
    beverages: sameStore.filter(i => isDiceDrinkCandidate(i, main)),
  }
}

export { buildComboForMain }

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

  let mains = uniqueItems.filter(i => isDiceMainCandidate(i, category))

  if (!mains.length && category === 'breakfast') {
    mains = getDiceMainPool('breakfast', profile)
  }

  if (!mains.length) {
    mains = uniqueItems.filter(i => !isBeverage(i) && isSolidFood(i) && i.calories >= 100)
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
  const { sides, beverages } = sidesForMain(fallback, uniqueItems)
  const forced = buildComboForMain(fallback, sides, beverages, maxCalories, targetProtein)
  if (forced.items.length > 1) return forced
  return forced
}

/** 各店主餐 enumerate 組合候選（骰子路徑 E） */
export function enumerateStoreCombos(
  category: 'breakfast' | 'lunch' | 'dinner',
  maxCalories: number,
  targetProtein: number,
  profile?: UserProfile,
  memory?: import('./meal-engine-types').UserMemoryState,
  seed = 0,
  excludeNames: string[] = []
): MealCombo[] {
  const items = filterMenu(category, profile, memory)
  const uniqueItems = uniqueByNameRotating(items, seed)
  const exclude = new Set(excludeNames)
  const out: MealCombo[] = []
  const seen = new Set<string>()

  const stores = [...new Set(uniqueItems.filter(i => isDiceMainCandidate(i, category)).map(m => m.store))]
  const order = seededShuffle(stores, seed + 99).slice(0, 80)

  for (const store of order) {
    const variants = enumerateStoreComboVariants(
      store,
      category,
      uniqueItems,
      maxCalories,
      targetProtein,
      seed + hashStoreSeed(store, seed),
      exclude,
      6
    )
    for (const combo of variants) {
      const key = combo.items.map(i => i.id).sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      out.push(combo)
    }
  }
  return out
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
    reasoning: buildComboTrustReason(category, names),
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
