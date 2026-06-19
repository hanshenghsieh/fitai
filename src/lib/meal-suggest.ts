import { buildMealCombination } from './meal-combo-engine'
import { applyPortion, type PortionId, isBeverage, isSolidFood } from './eat-out-builder'
import { getFilteredMenu, preferredBrandBoost } from './eat-out-filters'
import { isValidMealLines } from './meal-combo-validity'
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
  excludeNames?: string[]
): number {
  let score =
    Math.abs(totals.calories - targets.calories) * 2 +
    Math.abs(totals.protein_g - targets.protein_g) * 3
  if (price > budgetMax) score += (price - budgetMax) * 4
  score += preferredBrandBoost(store, memory)
  if (nearbyBrands?.includes(store)) score -= 30
  if (distance_m != null) score += distance_m * 0.008
  if (excludeNames?.length && itemNames?.some(n => excludeNames.includes(n))) {
    score += 500
  }
  return score
}

function pickHighlight(
  totals: ReturnType<typeof linesToTotals>,
  targets: { calories: number; protein_g: number },
  price: number,
  budgetMax: number,
  store: string,
  memory: SuggestContext['memory'],
  distance_m?: number,
  prev?: MealSuggestion | null
): { key: HighlightKey; text: string } {
  const preferred = new Set([
    ...(memory?.eat_out_prefs?.preferred_brands ?? []),
    ...(memory?.favorite_brands ?? []),
  ])

  const deltas: { key: HighlightKey; weight: number }[] = []

  if (totals.protein_g >= targets.protein_g * 1.05) deltas.push({ key: 'high_protein', weight: totals.protein_g - targets.protein_g })
  if (price <= budgetMax * 0.75) deltas.push({ key: 'budget_friendly', weight: budgetMax - price })
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

  return { key, text: HIGHLIGHT_COPY[key] }
}

function nutritionScore(totals: ReturnType<typeof linesToTotals>, targets: { calories: number; protein_g: number }): number {
  const calFit = 1 - Math.min(1, Math.abs(totals.calories - targets.calories) / targets.calories)
  const proFit = Math.min(1, totals.protein_g / targets.protein_g)
  return Math.round((calFit * 0.4 + proFit * 0.6) * 100)
}

function weightedPick<T extends { score: number }>(pool: T[], seed: number, reroll = 0): T | null {
  if (!pool.length) return null
  const sorted = [...pool].sort((a, b) => a.score - b.score)
  const windowSize = reroll > 0 ? Math.min(10, sorted.length) : Math.min(12, sorted.length)
  const window = sorted.slice(0, windowSize)
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
  const targets = mealTargetsFromDaily(ctx.daily_targets, ctx.meal_type)
  const menu = getFilteredMenu(ctx.meal_type, ctx.profile, ctx.memory)
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

  const addLines = (lines: MealLine[], distance_m?: number, restaurant_name?: string, maps_url?: string) => {
    if (!lines.length || friedCount(lines.map(l => l.item)) > 1) return
    if (!isValidMealLines(lines)) return
    if (isExcludedByName(lines, [...excludeNames])) return
    const id = suggestionId(lines)
    if (seen.has(id) || exclude.has(id)) return
    const totals = linesToTotals(lines)
    if (!gate(totals.calories, totals.protein_g, targets.calories, targets.protein_g, ctx.meal_type)) return
    seen.add(id)
    const store = lines[0]!.item.store
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
      stores: [...new Set(lines.map(l => l.item.store))],
      restaurant_name: restaurant_name ?? place?.name,
      distance_m: dist,
      walk_minutes: place?.walk_minutes,
      maps_url: maps_url ?? place?.maps_url,
      nutrition_score: nutritionScore(totals, targets),
    })
  }

  // 路徑 A：套餐單品 + 份量（連鎖主餐）
  const combos = menu.filter(
    i =>
      !isBeverage(i) &&
      isSolidFood(i) &&
      (i.role === 'combo' || !i.role) &&
      i.calories >= (ctx.meal_type === 'breakfast' ? 120 : 200)
  )
  for (let i = 0; i < Math.min(combos.length, 120); i++) {
    const item = combos[(i + (ctx.seed ?? 0)) % combos.length]!
    const variants = tryPortionVariants(item, targets, ctx.meal_type, relaxed)
    for (const line of variants) {
      addLines([line])
    }
    if (!variants.length && relaxed) {
      addLines([{ item, portion: 'full' }])
    }
  }

  // 路徑 B：引擎組合（僅便利店/自助餐，避免連鎖主餐混搭）
  for (let d = 0; d < 12; d++) {
    const combo = buildMealCombination(
      ctx.meal_type,
      targets.calories,
      targets.protein_g,
      (ctx.day_index ?? 0) + d + (ctx.seed ?? 0),
      ctx.profile ?? undefined
    )
    if (!combo.items.length) continue
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
  for (const pro of proteins.slice(0, 8)) {
    for (const carb of carbs.slice(0, 3)) {
      addLines([
        { item: pro, portion: 'full' },
        { item: carb, portion: 'half' },
      ])
      for (const side of sides.slice(0, 2)) {
        addLines([
          { item: pro, portion: 'full' },
          { item: carb, portion: 'half' },
          { item: side, portion: 'full' },
        ])
      }
    }
  }

  return raw
}

export function suggestNextMeal(
  ctx: SuggestContext,
  prev?: MealSuggestion | null
): { suggestion: MealSuggestion | null; pool_exhausted: boolean } {
  const reroll = ctx.rolls_used ?? 0
  let candidates = generateCandidates(ctx, false)
  if (!candidates.length) {
    candidates = generateCandidates(ctx, true)
  }
  if (!candidates.length) return { suggestion: null, pool_exhausted: true }

  const targets = mealTargetsFromDaily(ctx.daily_targets, ctx.meal_type)
  const budgetMax =
    ctx.meal_type === 'breakfast'
      ? ctx.memory?.eat_out_prefs?.breakfast_max_price ?? 120
      : ctx.meal_type === 'lunch'
        ? ctx.memory?.eat_out_prefs?.lunch_max_price ?? 180
        : ctx.memory?.eat_out_prefs?.dinner_max_price ?? 180

  const scored = candidates.map(c => ({
    ...c,
    score: scoreCandidate(
      c.totals,
      targets,
      c.totals.price,
      budgetMax,
      c.stores[0] ?? '',
      ctx.memory,
      c.distance_m,
      ctx.nearby_brands,
      primaryItemNames(c.lines),
      ctx.exclude_names
    ),
  }))

  const seed = (ctx.seed ?? Date.now()) + (ctx.exclude_ids?.length ?? 0) * 17 + (ctx.exclude_names?.length ?? 0) * 31
  const picked = weightedPick(scored, seed, reroll)
  if (!picked) return { suggestion: null, pool_exhausted: true }

  const { score: _s, ...base } = picked

  const highlight = pickHighlight(
    base.totals,
    targets,
    base.totals.price,
    budgetMax,
    base.stores[0] ?? '',
    ctx.memory,
    base.distance_m,
    prev
  )

  return {
    suggestion: { ...base, highlight: highlight.text, highlight_key: highlight.key },
    pool_exhausted: candidates.length <= (ctx.exclude_ids?.length ?? 0) + 1,
  }
}

export function suggestionToCustomSelection(suggestion: MealSuggestion) {
  return suggestion.lines.map(l => ({ id: l.item.id, portion: l.portion }))
}

export function linesToDisplayItems(lines: MealLine[]) {
  return lines.map(l => applyPortion(l.item, l.portion))
}
