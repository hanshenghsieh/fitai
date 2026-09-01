import { eatOutMenu, type ConvenienceItem } from '@/lib/convenience-store-menu'
import { searchFoodMenuExtended } from '@/lib/food-menu-lookup'
import { passesMenuAccessGate } from '@/lib/nutrition/menu-confidence-runtime'
import type { FoodSourceType, FoodType } from '@/lib/nutrition/p0-common-foods/types'
import { searchP0CommonFoods } from '@/lib/nutrition/p0-common-foods/search'
import { searchDishCatalog } from '@/lib/recommendation/dish-first/search'
import { normalizeFoodName } from '@/lib/food-kb/normalize'
import {
  calculateWhiteRiceNutrition,
  resolveWhiteRicePortion,
  WHITE_RICE_CANONICAL_ID,
} from '@/lib/nutrition/rice-portion-profile'

export interface FoodSearchHit {
  id: string
  name: string
  store?: string
  brand?: string
  calories: number
  protein_g: number
  carbs_g?: number
  fat_g?: number
  foodType?: FoodType
  sourceType?: FoodSourceType
  p0FoodId?: string
  p0MatchScore?: number
  dishTemplateId?: string
  dishVariantId?: string
  dishBrandItemId?: string
  dishSearchKind?: 'template' | 'variant' | 'brand'
  canonicalCategory?: string
  aliases?: string[]
  initialPortionAmount?: number
  initialPortionUnit?: string
  portionLabel?: string
  searchSource: 'official' | 'p0' | 'runtime' | 'dish' | 'ai_estimate'
  sourceLabel?: string
}

const P0_PRIORITY_TYPES: ReadonlySet<FoodType> = new Set(['ingredient', 'staple', 'sauce', 'drink'])

/** Unified ranking — P0 ingredients beat partial dish/menu matches; dish meals beat P0 meals. */
export function rankFoodSearchHit(hit: FoodSearchHit, query: string): number {
  const q = normalizeFoodName(query.trim())
  const name = normalizeFoodName(hit.name)
  if (!q) return 0

  const p0Score = hit.p0MatchScore ?? 0

  if (hit.searchSource === 'p0' && p0Score >= 72 && hit.foodType && P0_PRIORITY_TYPES.has(hit.foodType)) {
    if (p0Score >= 95) return 10000 + p0Score
    if (name === q || name.includes(q)) return 9000 + p0Score
  }

  if (hit.searchSource === 'dish' && hit.dishSearchKind === 'template' && name === q) {
    return 9800
  }

  if (hit.searchSource === 'p0' && p0Score >= 100) return 9600 + p0Score
  if (hit.searchSource === 'p0' && p0Score >= 95) return 9400 + p0Score

  if (name === q) return 7500
  if (name.startsWith(q) || q.startsWith(name)) return 6800

  if (hit.searchSource === 'official' || hit.searchSource === 'runtime') {
    if (name.includes(q) && q.length >= 2) return 4200
  }

  if (hit.searchSource === 'dish') {
    if (hit.dishSearchKind === 'template' && name.includes(q)) return 5500
    if (hit.dishSearchKind === 'variant' && name.includes(q) && q.length >= 3) return 4800
    return 3000
  }

  return 1000
}

function sortFoodSearchHits(query: string, hits: FoodSearchHit[]): FoodSearchHit[] {
  return [...hits].sort((a, b) => {
    const diff = rankFoodSearchHit(b, query) - rankFoodSearchHit(a, query)
    if (diff !== 0) return diff
    return a.name.localeCompare(b.name, 'zh-Hant')
  })
}

function officialToHit(hit: {
  id: string
  name: string
  store: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}): FoodSearchHit {
  return {
    id: hit.id,
    name: hit.name,
    store: hit.store,
    calories: hit.calories,
    protein_g: hit.protein_g,
    carbs_g: hit.carbs_g,
    fat_g: hit.fat_g,
    sourceType: 'official',
    searchSource: 'official',
    sourceLabel: '官方資料',
  }
}

export function foodSearchHitForP0(
  item: import('@/lib/nutrition/p0-common-foods/types').CommonFoodItem,
  score: number,
  query: string
): FoodSearchHit {
  const ricePortion = item.id === WHITE_RICE_CANONICAL_ID ? resolveWhiteRicePortion(query) : null
  const riceNutrition = ricePortion ? calculateWhiteRiceNutrition(ricePortion.amount) : null
  return {
    id: `p0-${item.id}`,
    name: item.name,
    store: item.category,
    calories: riceNutrition?.calories ?? Math.round(item.kcalDefault),
    protein_g: riceNutrition?.protein_g ?? item.proteinDefault_g,
    carbs_g: riceNutrition?.carbs_g ?? item.carbsDefault_g,
    fat_g: riceNutrition?.fat_g ?? item.fatDefault_g,
    foodType: item.foodType,
    sourceType: item.sourceType,
    p0FoodId: item.id,
    p0MatchScore: score,
    searchSource: 'p0',
    sourceLabel: item.sourceType === 'official' ? '官方資料' : '資料庫估算',
    initialPortionAmount: ricePortion?.amount,
    initialPortionUnit: ricePortion ? 'g' : undefined,
    portionLabel: ricePortion?.label,
  }
}

function hitDedupeKey(hit: FoodSearchHit): string {
  if (hit.p0FoodId) return `p0:${hit.p0FoodId}`
  // 'official' (food-kb index) and 'runtime' (direct eatOutMenu scan) can both
  // surface the same underlying convenience-store record under the same id —
  // they're already treated as the same confidence tier for ranking (see
  // rankFoodSearchHit above), so they must dedupe together too, or the same
  // item shows twice in results.
  const bucket = hit.searchSource === 'official' || hit.searchSource === 'runtime' ? 'menu' : hit.searchSource
  return `${bucket}:${hit.id}`
}

/** Client-safe search — merges dish, official menu, P0, then re-ranks by match quality. */
export function searchFoodMenu(query: string, limit = 8): FoodSearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q || q.length < 1) return []

  const seen = new Set<string>()
  const out: FoodSearchHit[] = []

  const addHit = (hit: FoodSearchHit) => {
    const key = hitDedupeKey(hit)
    if (seen.has(key)) return
    seen.add(key)
    out.push(hit)
  }

  const dishHits = searchDishCatalog(query, limit)
  for (const hit of dishHits) {
    const template = hit.template
    if (!template) continue
    const macros = hit.brandItem
      ? {
          mid: hit.brandItem.calories,
          protein: hit.brandItem.protein ?? 0,
          carbs: hit.brandItem.carbs,
          fat: hit.brandItem.fat,
        }
      : hit.variant
        ? {
            mid: hit.variant.typicalCalories.mid,
            protein: hit.variant.typicalProtein?.mid ?? 0,
            carbs: hit.variant.typicalCarbs?.mid,
            fat: hit.variant.typicalFat?.mid,
          }
        : {
            mid: template.typicalCalories.mid,
            protein: template.typicalProtein?.mid ?? 0,
            carbs: template.typicalCarbs?.mid,
            fat: template.typicalFat?.mid,
          }
    addHit({
      id:
        hit.kind === 'brand'
          ? `dish-brand-${hit.brandItem!.id}`
          : hit.kind === 'variant'
            ? `dish-variant-${hit.variant!.id}`
            : `dish-template-${template.id}`,
      name: hit.label,
      store: hit.subtitle ?? template.category,
      calories: macros.mid,
      protein_g: macros.protein,
      carbs_g: macros.carbs,
      fat_g: macros.fat,
      foodType: template.foodType,
      sourceType: hit.brandItem?.sourceType ?? template.sourceType,
      dishTemplateId: template.id,
      dishVariantId: hit.variant?.id,
      dishBrandItemId: hit.brandItem?.id,
      dishSearchKind: hit.kind,
      canonicalCategory: template.category,
      aliases: [
        ...template.aliases,
        ...(hit.variant?.aliases ?? []),
        ...(hit.brandItem?.aliases ?? []),
      ],
      searchSource: 'dish',
      sourceLabel: hit.brandItem?.sourceType === 'official' ? '官方資料' : '資料庫估算',
    })
  }

  const kbHits = searchFoodMenuExtended(query, limit)
  for (const hit of kbHits) {
    addHit(officialToHit(hit))
  }

  const p0Hits = searchP0CommonFoods(query, limit * 2)
  for (const { item, score } of p0Hits) {
    addHit(foodSearchHitForP0(item, score, query))
  }

  if (out.length < limit) {
    const scored = eatOutMenu
      .filter(item => passesMenuAccessGate(item, 'search'))
      .map(item => {
        const name = item.name.toLowerCase()
        const store = item.store.toLowerCase()
        const aliases = (item.aliases ?? []).map(a => a.toLowerCase())
        // Canonical name always outranks an alias at the same match tier —
        // exact name > exact alias > prefix name > prefix alias > substring
        // name > substring alias > store substring (see food-search-ranking.test.ts).
        let score = 0
        if (name === q) score = 100
        else if (aliases.includes(q)) score = 90
        else if (name.startsWith(q)) score = 50
        else if (aliases.some(a => a.startsWith(q))) score = 45
        else if (name.includes(q)) score = 30
        else if (aliases.some(a => a.includes(q))) score = 25
        else if (store.includes(q)) score = 10
        else return null
        return { item, score }
      })
      .filter((x): x is { item: ConvenienceItem; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    for (const { item } of scored) {
      addHit({
        id: item.id,
        name: item.name,
        store: item.store,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        aliases: item.aliases,
        sourceType: 'official',
        searchSource: 'runtime',
        sourceLabel: '官方資料',
      })
    }
  }

  return sortFoodSearchHits(query, out).slice(0, limit)
}
