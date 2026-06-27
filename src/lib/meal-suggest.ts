import { canonicalDiceStore, diceStoreMatches } from './dice-store-aliases'
import { buildMealCombination, enumerateStoreCombos, enumerateStoreComboVariants, buildComboForMain, sidesForMain } from './meal-combo-engine'
import { applyPortion, type PortionId, isSolidFood, isBeverage } from './eat-out-builder'
import { getFilteredMenu, preferredBrandBoost } from './eat-out-filters'
import { getDiceMainPool, isDiceSideCandidate, isDiceDrinkCandidate, getDiceMenuPool } from './dice-menu-pool'
import { effectiveMealCalTarget, enjoyableDiceBonus } from './engines/adherence-engine'
import { recoveryFoodScoreAdjust, isRecoveryActive } from './engines/calorie-bank-engine'
import { scoreMealCandidate } from './engines/next-meal-engine'
import { suggestLightSnack } from './light-snack-suggest'
import { isValidMealLines } from './meal-combo-validity'
import {
  attachRecommendationDebugReason,
  filterValidSuggestions,
  validateMealLines,
} from './nutrition/recommendation-validator'
import { nearestPlaceForBrand } from './nearby-engine'
import type { ConvenienceItem } from './convenience-store-menu'
import type { MealLine, MealSuggestion, SuggestContext, HighlightKey } from './meal-engine-types'
import {
  mealTargetsFromDaily,
  suggestionId,
  HIGHLIGHT_COPY,
} from './meal-engine-types'

const PORTIONS: PortionId[] = ['full', 'three_quarter', 'half']

function friedCount(items: ConvenienceItem[]): number {
  return items.filter(i => i.name.includes('炸') || i.name.includes('咔啦')).length
}

function passesStrictGate(
  calories: number,
  protein: number,
  targetCal: number,
  targetPro: number,
  mealType?: SuggestContext['meal_type']
): boolean {
  if (mealType === 'breakfast') {
    return (
      calories >= targetCal * 0.65 &&
      calories <= targetCal * 1.2 &&
      protein >= targetPro * 0.45
    )
  }
  const calLow = mealType === 'lunch' ? 0.85 : 0.88
  const calHigh = mealType === 'lunch' ? 1.15 : 1.12
  const proMin = mealType === 'lunch' ? 0.8 : 0.85
  return (
    calories >= targetCal * calLow &&
    calories <= targetCal * calHigh &&
    protein >= targetPro * proMin
  )
}

function passesRelaxedGate(
  calories: number,
  protein: number,
  targetCal: number,
  targetPro: number,
  mealType?: SuggestContext['meal_type']
): boolean {
  if (mealType === 'breakfast') {
    return calories >= 120 && calories <= targetCal * 1.35 && protein >= 6
  }
  return (
    calories >= targetCal * 0.6 &&
    calories <= targetCal * 1.3 &&
    protein >= targetPro * 0.35
  )
}

function passesSingleItemGate(
  calories: number,
  protein: number,
  targetCal: number,
  isDrink: boolean
): boolean {
  if (isDrink) return calories >= 0 && calories <= Math.max(650, targetCal * 1.4)
  return calories >= 40 && calories <= targetCal * 1.35 && protein >= 2
}

/** 單品是否已滿足該餐次營養缺口（才允許只推一個品項） */
export function satisfiesMealTargets(
  calories: number,
  protein: number,
  targetCal: number,
  targetPro: number,
  mealType: SuggestContext['meal_type'],
  relaxed = false
): boolean {
  const gate = relaxed ? passesRelaxedGate : passesStrictGate
  return gate(calories, protein, targetCal, targetPro, mealType)
}

function isComboSuggestion(lines: MealLine[]): boolean {
  return lines.length > 1
}

function uniqueStoreCount(list: MealSuggestion[]): number {
  return new Set(list.map(c => c.stores[0]).filter(Boolean)).size
}

function linesToTotals(lines: MealLine[]) {
  const items = lines.map(l => applyPortion(l.item, l.portion))
  return {
    calories: items.reduce((s, i) => s + i.calories, 0),
    protein_g: items.reduce((s, i) => s + i.protein_g, 0),
    carbs_g: items.reduce((s, i) => s + i.carbs_g, 0),
    fat_g: items.reduce((s, i) => s + i.fat_g, 0),
    price: items.reduce((s, i) => s + i.price, 0),
  }
}

function comboToLines(combo: { items: ConvenienceItem[] }): MealLine[] {
  return combo.items.map(item => ({ item, portion: 'full' as PortionId }))
}

function tryPortionVariants(
  item: ConvenienceItem,
  targets: { calories: number; protein_g: number },
  mealType: SuggestContext['meal_type'],
  relaxed = false
): MealLine[] {
  const candidates: MealLine[] = []
  const gate = relaxed ? passesRelaxedGate : passesStrictGate
  for (const portion of PORTIONS) {
    const p = applyPortion(item, portion)
    if (portion !== 'full' && !item.portionable && !(item.tags ?? []).some(t => ['rice', 'starch', 'noodle'].includes(t))) {
      continue
    }
    if (gate(p.calories, p.protein_g, targets.calories, targets.protein_g, mealType)) {
      candidates.push({ item, portion })
    }
  }
  return candidates
}

function shuffledBySeed<T>(items: T[], seed: number, limit: number): T[] {
  const arr = [...items]
  let s = seed >>> 0
  for (let i = arr.length - 1; i > 0; i--) {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr.slice(0, Math.min(limit, arr.length))
}

function seededBySeed<T>(items: T[], seed: number): T[] {
  const arr = [...items]
  let s = seed >>> 0
  for (let i = arr.length - 1; i > 0; i--) {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr
}

function scoreCandidate(
  totals: ReturnType<typeof linesToTotals>,
  targets: { calories: number; protein_g: number },
  price: number,
  budgetMax: number,
  store: string,
  memory: SuggestContext['memory'],
  distance_m?: number,
  nearbyBrands?: string[],
  itemNames?: string[],
  excludeNames?: string[],
  lineCount = 1,
  excludeStores?: string[],
  rollsUsed = 0,
  adherence?: SuggestContext['adherence'],
  calorieBank?: SuggestContext['calorie_bank']
): number {
  let score =
    Math.abs(totals.calories - targets.calories) * 2 +
    Math.abs(totals.protein_g - targets.protein_g) * 3
  if (lineCount > 1) score -= rollsUsed > 0 ? 18 : 45
  else score += rollsUsed > 0 ? 8 : 30
  if (price > budgetMax) score += (price - budgetMax) * 4
  score += preferredBrandBoost(store, memory)
  if (nearbyBrands?.includes(store) && (rollsUsed ?? 0) < 2) score -= 10
  if (distance_m != null) score += distance_m * 0.004
  if (excludeNames?.length && itemNames?.some(n => excludeNames.includes(n))) {
    score += 500
  }
  if (excludeNames?.length && itemNames?.length === 1 && excludeNames.includes(itemNames[0]!)) {
    score += 300
  }
  if (excludeStores?.length) {
    const idx = excludeStores.indexOf(store)
    if (idx >= 0) score += 900 + idx * 120
    const count = excludeStores.filter(s => s === store).length
    if (count > 1) score += count * 200
  }
  if (adherence) {
    for (const n of itemNames ?? []) score += enjoyableDiceBonus(n, adherence)
    if (adherence.dice.proteinBoost > 1 && totals.protein_g >= targets.protein_g * 0.9) score -= 6
  }
  const recoveryActive = calorieBank ? isRecoveryActive(calorieBank) : false
  if (recoveryActive && itemNames) {
    for (const n of itemNames) score += recoveryFoodScoreAdjust(n, true)
  }
  return score
}

function scoreCandidateV2(
  totals: ReturnType<typeof linesToTotals>,
  itemNames: string[],
  dayState: NonNullable<SuggestContext['day_state']>,
  memory: SuggestContext['memory'],
  store: string,
  rollsUsed = 0,
  excludeStores?: string[]
): number {
  let score = scoreMealCandidate({
    itemNames,
    calories: totals.calories,
    proteinG: totals.protein_g,
    state: dayState,
    historyBoost: preferredBrandBoost(store, memory) < 0 ? 1 : 0,
    userPrefBoost: (memory?.favorite_brands?.includes(store) ? 1 : 0),
    recoveryActive: dayState.recoveryActive,
  })
  if (rollsUsed > 0) score += 12
  if (excludeStores?.includes(store)) score += 400
  return score
}

type ScoredSuggestion = MealSuggestion & { score: number }

function stratifiedStorePick(
  pool: ScoredSuggestion[],
  seed: number,
  reroll: number,
  excludeStores: string[] = []
): ScoredSuggestion | null {
  if (!pool.length) return null
  const blocked = new Set(excludeStores)
  const byStore = new Map<string, ScoredSuggestion[]>()
  for (const c of pool) {
    const store = c.stores[0] ?? ''
    if (blocked.has(store)) continue
    const list = byStore.get(store) ?? []
    list.push(c)
    byStore.set(store, list)
  }

  const stores = [...byStore.keys()]
  if (!stores.length) {
    const softBlock = new Set(excludeStores.slice(-2))
    for (const c of pool) {
      const store = c.stores[0] ?? ''
      if (softBlock.has(store)) continue
      const list = byStore.get(store) ?? []
      list.push(c)
      byStore.set(store, list)
    }
    const softStores = [...byStore.keys()]
    if (softStores.length) {
      const storeIdx = (seed + reroll * 9973) % softStores.length
      const store = softStores[storeIdx]!
      const storePool = seededBySeed([...(byStore.get(store) ?? [])], seed + reroll * 31)
      return storePool[reroll % Math.max(1, storePool.length)] ?? storePool[0]!
    }
    return weightedPick(pool, seed, reroll)
  }

  if (reroll > 0) {
    const storeIdx = (seed + reroll * 9973 + stores.length * 13) % stores.length
    const store = stores[storeIdx]!
    const storePool = seededBySeed([...(byStore.get(store) ?? [])], seed + reroll * 31)
    const idx = reroll % Math.max(1, storePool.length)
    return storePool[idx] ?? storePool[0]!
  }

  const storeIdx = (seed % stores.length + stores.length) % stores.length
  const rotateStores = [...stores.slice(storeIdx), ...stores.slice(0, storeIdx)]
  const roundRobin: ScoredSuggestion[] = []
  for (const store of rotateStores) {
    const best = [...(byStore.get(store) ?? [])].sort((a, b) => a.score - b.score)[0]
    if (best) roundRobin.push(best)
  }
  return weightedPick(roundRobin.length ? roundRobin : pool, seed, reroll)
}

function medianPrice(prices: number[]): number {
  if (!prices.length) return 0
  const sorted = [...prices].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

function isVerifiedBudgetFriendly(
  price: number,
  budgetMax: number,
  poolPrices: number[]
): boolean {
  if (!poolPrices.length) return price <= budgetMax * 0.85
  const median = medianPrice(poolPrices)
  return price <= budgetMax && price <= median * 0.92 && price < median - 8
}

function pickHighlight(
  totals: ReturnType<typeof linesToTotals>,
  targets: { calories: number; protein_g: number },
  price: number,
  budgetMax: number,
  store: string,
  memory: SuggestContext['memory'],
  distance_m?: number,
  prev?: MealSuggestion | null,
  poolPrices: number[] = []
): { key: HighlightKey; text: string; priceMeta?: MealSuggestion['highlight_price_meta'] } {
  const preferred = new Set([
    ...(memory?.eat_out_prefs?.preferred_brands ?? []),
    ...(memory?.favorite_brands ?? []),
  ])

  const deltas: { key: HighlightKey; weight: number }[] = []

  if (totals.protein_g >= targets.protein_g * 1.05) deltas.push({ key: 'high_protein', weight: totals.protein_g - targets.protein_g })
  if (isVerifiedBudgetFriendly(price, budgetMax, poolPrices)) {
    const median = medianPrice(poolPrices)
    deltas.push({ key: 'budget_friendly', weight: median - price + (budgetMax - price) })
  }
  if (Math.abs(totals.calories - targets.calories) < targets.calories * 0.05) {
    deltas.push({ key: 'calorie_fit', weight: 10 })
  }
  if (totals.calories <= targets.calories * 0.95 && totals.fat_g < targets.calories * 0.25) {
    deltas.push({ key: 'light_meal', weight: 8 })
  }
  if (preferred.has(store)) deltas.push({ key: 'preferred_store', weight: 12 })
  if (distance_m != null && distance_m < 800) deltas.push({ key: 'nearby', weight: 20 - distance_m / 80 })

  deltas.sort((a, b) => b.weight - a.weight)
  let key = deltas[0]?.key ?? 'balanced'

  if (prev && key === prev.highlight_key) {
    key = deltas[1]?.key ?? 'balanced'
  }

  let priceMeta: MealSuggestion['highlight_price_meta'] | undefined
  if (key === 'budget_friendly' && poolPrices.length) {
    const median = medianPrice(poolPrices)
    const saved = Math.round(median - price)
    if (saved > 0) {
      priceMeta = {
        total_price: Math.round(price),
        budget_max: budgetMax,
        pool_median_price: Math.round(median),
        saved_vs_median: saved,
      }
    } else {
      key = deltas.find(d => d.key !== 'budget_friendly')?.key ?? 'balanced'
    }
  }

  return { key, text: HIGHLIGHT_COPY[key], priceMeta }
}

function nutritionScore(totals: ReturnType<typeof linesToTotals>, targets: { calories: number; protein_g: number }): number {
  const calFit = 1 - Math.min(1, Math.abs(totals.calories - targets.calories) / targets.calories)
  const proFit = Math.min(1, totals.protein_g / targets.protein_g)
  return Math.round((calFit * 0.4 + proFit * 0.6) * 100)
}

function weightedPick<T extends { score: number }>(pool: T[], seed: number, reroll = 0): T | null {
  if (!pool.length) return null
  const sorted = [...pool].sort((a, b) => a.score - b.score)
  const windowSize = reroll > 0 ? Math.min(20, sorted.length) : Math.min(16, sorted.length)
  const offset = (seed % 7) * 2
  const window = sorted.slice(offset, offset + windowSize).length >= windowSize
    ? sorted.slice(offset, offset + windowSize)
    : sorted.slice(0, windowSize)
  if (reroll > 0 && window.length > 1) {
    const idx = (seed % 10000) / 10000 * window.length
    return window[Math.floor(idx)] ?? window[0]!
  }
  const weights = window.map(c => 1 / (c.score + 1))
  const total = weights.reduce((a, b) => a + b, 0)
  let r = (seed % 10000) / 10000 * total
  for (let i = 0; i < window.length; i++) {
    r -= weights[i]!
    if (r <= 0) return window[i]!
  }
  return window[0]!
}

function primaryItemNames(lines: MealLine[]): string[] {
  return [...new Set(lines.map(l => l.item.name))]
}

function isExcludedByName(lines: MealLine[], excludeNames?: string[]): boolean {
  if (!excludeNames?.length) return false
  const blocked = new Set(excludeNames)
  return primaryItemNames(lines).some(n => blocked.has(n))
}

export function generateCandidates(ctx: SuggestContext, relaxed = false): MealSuggestion[] {
  if (ctx.day_state?.overTargetProtection) return []

  const fast = ctx.fast_dice === true

  const dayState = ctx.day_state
  const dailyCalBase =
    ctx.calorie_bank?.internal_target_kcal && ctx.calorie_bank.internal_target_kcal > 0
      ? ctx.calorie_bank.internal_target_kcal
      : ctx.daily_targets.calories

  const baseTargets = dayState
    ? {
        calories: dayState.effectiveMealCalTarget,
        protein_g: dayState.effectiveMealProteinTarget,
        carbs_g: ctx.daily_targets.carbs_g,
        fat_g: ctx.daily_targets.fat_g,
      }
    : mealTargetsFromDaily(
        { ...ctx.daily_targets, calories: dailyCalBase },
        ctx.meal_type
      )
  const targets = ctx.adherence
    ? {
        ...baseTargets,
        calories: dayState
          ? dayState.effectiveMealCalTarget
          : effectiveMealCalTarget(baseTargets.calories, ctx.adherence),
        protein_g: Math.round(baseTargets.protein_g * ctx.adherence.dice.proteinBoost),
      }
    : baseTargets
  const menu = getDiceMenuPool(ctx.meal_type, ctx.profile, ctx.memory)
  const exclude = new Set(ctx.exclude_ids ?? [])
  const excludeNames = new Set(ctx.exclude_names ?? [])
  const gate = relaxed ? passesRelaxedGate : passesStrictGate
  const budgetMax =
    ctx.meal_type === 'breakfast'
      ? ctx.memory?.eat_out_prefs?.breakfast_max_price ?? 120
      : ctx.meal_type === 'lunch'
        ? ctx.memory?.eat_out_prefs?.lunch_max_price ?? 180
        : ctx.memory?.eat_out_prefs?.dinner_max_price ?? 180

  const raw: MealSuggestion[] = []
  const seen = new Set<string>()

  const addLines = (
    lines: MealLine[],
    distance_m?: number,
    restaurant_name?: string,
    maps_url?: string
  ) => {
    if (!lines.length || friedCount(lines.map(l => l.item)) > 1) return
    if (!isValidMealLines(lines)) return
    if (!validateMealLines(lines, ctx).valid) return
    if (isExcludedByName(lines, [...excludeNames])) return
    const id = suggestionId(lines)
    if (seen.has(id) || exclude.has(id)) return
    const totals = linesToTotals(lines)
    const solo = !isComboSuggestion(lines)
    const passes = solo
      ? satisfiesMealTargets(totals.calories, totals.protein_g, targets.calories, targets.protein_g, ctx.meal_type, relaxed)
      : gate(totals.calories, totals.protein_g, targets.calories, targets.protein_g, ctx.meal_type)
    if (!passes) return
    seen.add(id)
    const store = canonicalDiceStore(lines[0]!.item.store)
    const place =
      ctx.user_lat != null && ctx.user_lng != null
        ? nearestPlaceForBrand(ctx.user_lat, ctx.user_lng, store)
        : null
    const dist = distance_m ?? place?.distance_m
    const { key, text } = pickHighlight(totals, targets, totals.price, budgetMax, store, ctx.memory, dist)
    raw.push({
      id,
      meal_type: ctx.meal_type,
      lines,
      totals,
      highlight: text,
      highlight_key: key,
      stores: [store],
      restaurant_name: restaurant_name ?? place?.name,
      distance_m: dist,
      walk_minutes: place?.walk_minutes,
      maps_url: maps_url ?? place?.maps_url,
      nutrition_score: nutritionScore(totals, targets),
    })
  }

  // 路徑 A：單品僅在主餐本身已達標該餐營養缺口時
  const soloMains = getDiceMainPool(ctx.meal_type, ctx.profile, ctx.memory)
  const soloSample = shuffledBySeed(soloMains, (ctx.seed ?? 0) + 17, fast ? 180 : 200)
  for (const item of soloSample) {
    for (const line of tryPortionVariants(item, targets, ctx.meal_type, relaxed)) {
      const totals = linesToTotals([line])
      if (!satisfiesMealTargets(totals.calories, totals.protein_g, targets.calories, targets.protein_g, ctx.meal_type, relaxed)) {
        continue
      }
      addLines([line])
    }
  }

  // 路徑 B：引擎組合（便利店 + 連鎖同店加點）
  for (let d = 0; d < (fast ? 12 : 48); d++) {
    const combo = buildMealCombination(
      ctx.meal_type,
      targets.calories,
      targets.protein_g,
      (ctx.day_index ?? 0) + d + (ctx.seed ?? 0),
      ctx.profile ?? undefined,
      [...excludeNames]
    )
    if (!combo.items.length || combo.items.length < 2) continue
    const chainCombos = combo.items.filter(
      i => i.source === 'chain' && (i.role ?? 'combo') === 'combo' && i.store !== '自助餐組件'
    )
    if (chainCombos.length > 1) continue
    if (chainCombos.length === 1 && combo.items.length > 1) {
      const mainStore = chainCombos[0]!.store
      if (!combo.items.every(i => i.store === mainStore || i.source === 'convenience')) continue
    }
    addLines(comboToLines(combo))
  }

  // 路徑 C：自助餐組裝 protein + carb + side
  const components = menu.filter(i => i.store === '自助餐組件')
  const proteins = components.filter(i => i.role === 'protein')
  const carbs = components.filter(i => i.role === 'carb')
  const sides = components.filter(i => i.role === 'side')
  for (const pro of proteins.slice(0, fast ? 6 : 12)) {
    for (const carb of carbs.slice(0, fast ? 3 : 5)) {
      addLines([
        { item: pro, portion: 'full' },
        { item: carb, portion: 'half' },
      ])
      for (const side of sides.slice(0, fast ? 2 : 4)) {
        addLines([
          { item: pro, portion: 'full' },
          { item: carb, portion: 'half' },
          { item: side, portion: 'full' },
        ])
      }
    }
  }

  // 路徑 D：同店雙品組合（主餐 + 小配菜）
  const menuByStore = new Map<string, ConvenienceItem[]>()
  for (const i of menu) {
    const list = menuByStore.get(i.store) ?? []
    list.push(i)
    menuByStore.set(i.store, list)
  }
  const mainsByStore = new Map<string, ReturnType<typeof getDiceMainPool>>()
  for (const main of soloMains) {
    const canon = canonicalDiceStore(main.store)
    const list = mainsByStore.get(canon) ?? []
    list.push(main)
    mainsByStore.set(canon, list)
  }
  for (const [, mains] of mainsByStore) {
    const storeItems = menu.filter(i => diceStoreMatches(i.store, mains[0]!.store))
    const sides = storeItems.filter(i => isDiceSideCandidate(i, mains[0]!))
    for (const main of shuffledBySeed(mains, (ctx.seed ?? 0) + hashStoreSeed(mains[0]!.store, 0), fast ? 10 : 6)) {
      for (const side of sides.slice(0, fast ? 3 : 5)) {
        if (side.id === main.id) continue
        addLines([
          { item: main, portion: 'full' },
          { item: side, portion: 'full' },
        ])
      }
      for (let v = 0; v < (fast ? 1 : 2); v++) {
        const { sides: s2, beverages } = sidesForMain(main, storeItems)
        const combo = buildComboForMain(
          main,
          s2,
          beverages,
          targets.calories,
          targets.protein_g,
          hashStoreSeed(main.store, (ctx.seed ?? 0) + v * 41)
        )
        if (combo.items.length >= 2) addLines(comboToLines(combo))
      }
    }
  }

  // 路徑 E：各店 enumerate 組合（主餐 + 配菜 + 飲料）— fast 模式略過
  if (!fast) {
    for (const combo of enumerateStoreCombos(
      ctx.meal_type,
      targets.calories,
      targets.protein_g,
      ctx.profile ?? undefined,
      ctx.memory,
      (ctx.seed ?? 0) + (ctx.day_index ?? 0) + (ctx.rolls_used ?? 0) * 17,
      [...excludeNames]
    )) {
      if (combo.items.length < 2) continue
      addLines(comboToLines(combo))
    }
  }

  // 路徑 F：全品牌輪替（每店多主餐 + 組合）
  const allStores = [...new Set(soloMains.map(m => canonicalDiceStore(m.store)))]
  const storeOrder = shuffledBySeed(allStores, (ctx.seed ?? 0) + 99, allStores.length)
  const comboSeed = (ctx.seed ?? 0) + (ctx.rolls_used ?? 0) * 53 + 99
  for (const store of storeOrder.slice(0, fast ? 24 : 80)) {
    const storeMains = shuffledBySeed(
      soloMains.filter(m => canonicalDiceStore(m.store) === store),
      comboSeed + hashStoreSeed(store, 0),
      fast ? 10 : 16
    )
    for (const main of storeMains) {
      for (const line of tryPortionVariants(main, targets, ctx.meal_type, relaxed)) {
        addLines([line])
      }
    }
    const variants = enumerateStoreComboVariants(
      store,
      ctx.meal_type,
      menu,
      targets.calories,
      targets.protein_g,
      comboSeed + hashStoreSeed(store, ctx.seed ?? 0),
      excludeNames,
      fast ? 8 : 5
    )
    for (const combo of variants) {
      if (combo.items.length >= 2) addLines(comboToLines(combo))
    }
  }

  return raw
}

function hashStoreSeed(store: string, seed: number): number {
  let h = seed
  for (let i = 0; i < store.length; i++) h = (Math.imul(31, h) + store.charCodeAt(i)) | 0
  return Math.abs(h)
}

const sessionDicePools = new Map<string, MealSuggestion[]>()

/** Minimum filtered candidates before we expand the dice pool again. */
export const DICE_MIN_AVAILABLE_CANDIDATES = 40

function diceSessionPoolKey(ctx: SuggestContext): string {
  const ds = ctx.day_state
  return [
    ctx.meal_type,
    ds?.todayTarget ?? ctx.daily_targets.calories,
    ds?.effectiveMealCalTarget ?? 0,
    ds?.effectiveMealProteinTarget ?? 0,
    ctx.profile?.is_vegetarian ? 'v' : '',
    ctx.profile?.is_vegan ? 'vg' : '',
    ctx.rolls_used ?? 0,
    ctx.seed ?? 0,
  ].join(':')
}

function mergeCandidateLists(...lists: MealSuggestion[][]): MealSuggestion[] {
  const seen = new Set<string>()
  const out: MealSuggestion[] = []
  for (const list of lists) {
    for (const c of list) {
      if (seen.has(c.id)) continue
      seen.add(c.id)
      out.push(c)
    }
  }
  return out
}

function buildFastCandidatePool(ctx: SuggestContext): MealSuggestion[] {
  const baseSeed = ctx.seed ?? Date.now()
  const fastCtx = { ...ctx, fast_dice: true }
  const reroll = ctx.rolls_used ?? 0
  let candidates = generateCandidates(fastCtx, true)
  candidates = mergeCandidateLists(
    candidates,
    generateCandidates(fastCtx, reroll === 0),
    generateCandidates({ ...fastCtx, seed: baseSeed + 9001 }, true)
  )
  if (candidates.length < 80) {
    candidates = mergeCandidateLists(
      candidates,
      generateCandidates({ ...fastCtx, seed: baseSeed + 18001 }, true),
      generateCandidates({ ...fastCtx, seed: baseSeed + 27001 }, false)
    )
  }
  return candidates
}

export function clearSessionDicePoolsForTests(): void {
  sessionDicePools.clear()
}

function diceExcludeStoresForRoll(excludeStores: string[] | undefined, reroll: number): string[] {
  if (!excludeStores?.length) return []
  return reroll > 0 ? excludeStores.slice(-1) : excludeStores
}

function filterCandidatesForRoll(pool: MealSuggestion[], ctx: SuggestContext): MealSuggestion[] {
  const reroll = ctx.rolls_used ?? 0
  const excludeIds = new Set(
    reroll > 0 ? (ctx.exclude_ids ?? []).slice(-2) : (ctx.exclude_ids ?? [])
  )
  const excludeNames = reroll > 0 ? (ctx.exclude_names ?? []).slice(-6) : (ctx.exclude_names ?? [])
  const recentStores = new Set(diceExcludeStoresForRoll(ctx.exclude_stores, reroll))

  return pool.filter(c => {
    if (excludeIds.has(c.id)) return false
    if (isExcludedByName(c.lines, excludeNames)) return false
    if (reroll > 0 && c.stores[0] && recentStores.has(c.stores[0])) return false
    if (!validateMealLines(c.lines, ctx).valid) return false
    return true
  })
}

function finalizeSuggestionPick(
  ctx: SuggestContext,
  candidates: MealSuggestion[],
  prev?: MealSuggestion | null
): { suggestion: MealSuggestion | null; pool_exhausted: boolean } {
  candidates = filterValidSuggestions(candidates, ctx)
  if (!candidates.length) return { suggestion: null, pool_exhausted: true }

  const reroll = ctx.rolls_used ?? 0
  const baseTargets = mealTargetsFromDaily(
    {
      ...ctx.daily_targets,
      calories:
        ctx.calorie_bank?.internal_target_kcal && ctx.calorie_bank.internal_target_kcal > 0
          ? ctx.calorie_bank.internal_target_kcal
          : ctx.daily_targets.calories,
    },
    ctx.meal_type
  )
  const targets = ctx.adherence
    ? {
        ...baseTargets,
        calories: effectiveMealCalTarget(baseTargets.calories, ctx.adherence),
        protein_g: Math.round(baseTargets.protein_g * ctx.adherence.dice.proteinBoost),
      }
    : baseTargets
  const comboFirst = candidates.filter(
    c =>
      isComboSuggestion(c.lines) ||
      satisfiesMealTargets(c.totals.calories, c.totals.protein_g, targets.calories, targets.protein_g, ctx.meal_type, false)
  )
  const comboPreferred = comboFirst.filter(c => isComboSuggestion(c.lines))
  const comboStoreCount = uniqueStoreCount(comboPreferred)
  const comboFirstStoreCount = uniqueStoreCount(comboFirst)
  const fullStoreCount = uniqueStoreCount(candidates)
  const rerollStores = diceExcludeStoresForRoll(ctx.exclude_stores, reroll)
  if (reroll === 0 && comboPreferred.length >= 1) {
    const allowComboOnly =
      reroll === 0 &&
      comboStoreCount >= 8 &&
      fullStoreCount <= comboStoreCount + 2
    if (allowComboOnly) {
      candidates = comboPreferred
    } else if (reroll > 0 && fullStoreCount >= 6) {
      // 換一個時優先完整池
    } else if (comboStoreCount >= 6 && reroll === 0 && comboStoreCount >= 3) {
      candidates = comboPreferred
    } else if (comboFirst.length >= 3 && comboFirstStoreCount >= 4) {
      candidates = comboFirst
    }
  } else if (comboFirst.length >= 3) {
    candidates = comboFirst
  }

  const budgetMax =
    ctx.meal_type === 'breakfast'
      ? ctx.memory?.eat_out_prefs?.breakfast_max_price ?? 120
      : ctx.meal_type === 'lunch'
        ? ctx.memory?.eat_out_prefs?.lunch_max_price ?? 180
        : ctx.memory?.eat_out_prefs?.dinner_max_price ?? 180

  const scored = candidates.map(c => ({
    ...c,
    score: ctx.day_state
      ? scoreCandidateV2(
          c.totals,
          primaryItemNames(c.lines),
          ctx.day_state,
          ctx.memory,
          c.stores[0] ?? '',
          reroll,
          rerollStores
        )
      : scoreCandidate(
          c.totals,
          targets,
          c.totals.price,
          budgetMax,
          c.stores[0] ?? '',
          ctx.memory,
          c.distance_m,
          ctx.nearby_brands,
          primaryItemNames(c.lines),
          ctx.exclude_names,
          c.lines.length,
          rerollStores,
          reroll,
          ctx.adherence,
          ctx.calorie_bank
        ),
  }))

  const seed =
    (ctx.seed ?? Date.now()) +
    (ctx.day_index ?? 0) * 7919 +
    (ctx.exclude_ids?.length ?? 0) * 17 +
    (ctx.exclude_names?.length ?? 0) * 31 +
    (ctx.exclude_stores?.length ?? 0) * 53
  const picked = stratifiedStorePick(scored, seed, reroll, rerollStores)
  if (!picked) return { suggestion: null, pool_exhausted: true }

  const { score: _s, ...base } = picked

  const poolPrices = scored.map(c => c.totals.price)
  const highlight = pickHighlight(
    base.totals,
    targets,
    base.totals.price,
    budgetMax,
    base.stores[0] ?? '',
    ctx.memory,
    base.distance_m,
    prev,
    poolPrices
  )

  const enriched = ctx.fast_dice
    ? {
        ...base,
        highlight: highlight.text,
        highlight_key: highlight.key,
        highlight_price_meta: highlight.priceMeta,
      }
    : enrichSuggestionWithSides(
        {
          ...base,
          highlight: highlight.text,
          highlight_key: highlight.key,
          highlight_price_meta: highlight.priceMeta,
        },
        ctx
      )

  if (!validateMealLines(enriched.lines, ctx).valid) {
    return { suggestion: null, pool_exhausted: true }
  }

  const suggestion =
    process.env.NODE_ENV === 'development'
      ? attachRecommendationDebugReason(enriched, ctx)
      : enriched

  return {
    suggestion,
    pool_exhausted: candidates.length <= (ctx.exclude_ids?.length ?? 0) + 1,
  }
}

function suggestNextMealFromPool(
  ctx: SuggestContext,
  prev?: MealSuggestion | null
): { suggestion: MealSuggestion | null; pool_exhausted: boolean } {
  const key = diceSessionPoolKey(ctx)
  let pool = sessionDicePools.get(key)
  if (!pool?.length) {
    pool = buildFastCandidatePool(ctx)
    sessionDicePools.set(key, pool)
  }

  let available = filterCandidatesForRoll(pool, ctx)
  if (available.length < DICE_MIN_AVAILABLE_CANDIDATES) {
    const extra = buildFastCandidatePool({
      ...ctx,
      seed: (ctx.seed ?? Date.now()) + (ctx.rolls_used ?? 0) * 131 + pool.length + 4242,
    })
    pool = mergeCandidateLists(pool, extra)
    available = filterCandidatesForRoll(pool, ctx)
  }

  if (!available.length) {
    const light = suggestLightSnack(ctx)
    if (light) return finalizeSuggestionPick(ctx, [light], prev)
    return { suggestion: null, pool_exhausted: true }
  }

  return finalizeSuggestionPick(ctx, available, prev)
}

export function suggestNextMeal(
  ctx: SuggestContext,
  prev?: MealSuggestion | null
): { suggestion: MealSuggestion | null; pool_exhausted: boolean } {
  if (ctx.day_state?.overTargetProtection) {
    return { suggestion: null, pool_exhausted: true }
  }

  if (ctx.fast_dice) {
    return suggestNextMealFromPool(ctx, prev)
  }

  let candidates = generateCandidates(ctx, false)
  if (candidates.length < 40) {
    const relaxed = generateCandidates(ctx, true)
    const seen = new Set(candidates.map(c => c.id))
    for (const c of relaxed) {
      if (!seen.has(c.id)) {
        candidates.push(c)
        seen.add(c.id)
      }
    }
  }
  return finalizeSuggestionPick(ctx, candidates, prev)
}

/** 單品結果自動加同店配菜／飲料，組成完整一餐 */
export function enrichSuggestionWithSides(
  suggestion: MealSuggestion,
  ctx: SuggestContext
): MealSuggestion {
  if (suggestion.lines.length > 1) return suggestion
  const main = suggestion.lines[0]!.item
  if (isBeverage(main)) return suggestion

  const targets = mealTargetsFromDaily(ctx.daily_targets, ctx.meal_type)
  const menu = getDiceMenuPool(ctx.meal_type, ctx.profile, ctx.memory)
  const { sides, beverages } = sidesForMain(main, menu)
  const combo = buildComboForMain(main, sides, beverages, targets.calories, targets.protein_g)
  if (combo.items.length <= 1) return suggestion

  const lines: MealLine[] = combo.items.map(item => ({ item, portion: 'full' as PortionId }))
  const totals = linesToTotals(lines)
  if (
    !satisfiesMealTargets(totals.calories, totals.protein_g, targets.calories, targets.protein_g, ctx.meal_type, false) &&
    !satisfiesMealTargets(totals.calories, totals.protein_g, targets.calories, targets.protein_g, ctx.meal_type, true)
  ) {
    return suggestion
  }

  return {
    ...suggestion,
    id: suggestionId(lines),
    lines,
    totals,
    stores: [...new Set(combo.items.map(i => i.store))],
  }
}

export function suggestionToCustomSelection(suggestion: MealSuggestion) {
  return suggestion.lines.map(l => ({ id: l.item.id, portion: l.portion }))
}

export function linesToDisplayItems(lines: MealLine[]) {
  return lines.map(l => applyPortion(l.item, l.portion))
}
