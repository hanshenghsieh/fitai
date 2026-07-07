import { eatOutMenu, type ConvenienceItem } from '@/lib/convenience-store-menu'
import { searchFoodMenuExtended } from '@/lib/food-menu-lookup'
import { passesMenuAccessGate } from '@/lib/nutrition/menu-confidence-runtime'
import type { FoodSourceType, FoodType } from '@/lib/nutrition/p0-common-foods/types'
import { searchP0CommonFoods } from '@/lib/nutrition/p0-common-foods/search'
import { searchDishCatalog } from '@/lib/recommendation/dish-first/search'
import { normalizeFoodName } from '@/lib/food-kb/normalize'

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
  dishTemplateId?: string
  dishVariantId?: string
  dishBrandItemId?: string
  dishSearchKind?: 'template' | 'variant' | 'brand'
  searchSource: 'official' | 'p0' | 'runtime' | 'dish'
  sourceLabel?: string
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

function p0ToHit(item: import('@/lib/nutrition/p0-common-foods/types').CommonFoodItem, score: number): FoodSearchHit {
  return {
    id: `p0-${item.id}`,
    name: item.name,
    store: item.category,
    calories: Math.round(item.kcalDefault),
    protein_g: item.proteinDefault_g,
    carbs_g: item.carbsDefault_g,
    fat_g: item.fatDefault_g,
    foodType: item.foodType,
    sourceType: item.sourceType,
    p0FoodId: item.id,
    searchSource: 'p0',
    sourceLabel: item.sourceType === 'official' ? '官方資料' : '資料庫估算',
  }
}

/** Client-safe search — official menu first, then P0 common foods. */
export function searchFoodMenu(query: string, limit = 8): FoodSearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q || q.length < 1) return []

  const seen = new Set<string>()
  const out: FoodSearchHit[] = []

  const dishHits = searchDishCatalog(query, limit)
  for (const hit of dishHits) {
    const template = hit.template
    if (!template) continue
    const key = `dish:${hit.kind}:${hit.label}`
    if (seen.has(key)) continue
    seen.add(key)
    const macros = hit.brandItem
      ? { mid: hit.brandItem.calories, protein: hit.brandItem.protein ?? 0 }
      : hit.variant
        ? { mid: hit.variant.typicalCalories.mid, protein: hit.variant.typicalProtein?.mid ?? 0 }
        : { mid: template.typicalCalories.mid, protein: template.typicalProtein?.mid ?? 0 }
    out.push({
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
      foodType: template.foodType,
      sourceType: hit.brandItem?.sourceType ?? template.sourceType,
      dishTemplateId: template.id,
      dishVariantId: hit.variant?.id,
      dishBrandItemId: hit.brandItem?.id,
      dishSearchKind: hit.kind,
      searchSource: 'dish',
      sourceLabel: hit.brandItem?.sourceType === 'official' ? '官方資料' : '資料庫估算',
    })
  }

  const kbHits = searchFoodMenuExtended(query, limit)
  for (const hit of kbHits) {
    const key = normalizeFoodName(hit.name)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(officialToHit(hit))
  }

  const p0Hits = searchP0CommonFoods(query, limit * 2)
  for (const { item, score } of p0Hits) {
    const key = normalizeFoodName(item.name)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p0ToHit(item, score))
  }

  if (out.length < limit) {
    const scored = eatOutMenu
      .filter(item => passesMenuAccessGate(item, 'search'))
      .map(item => {
        const name = item.name.toLowerCase()
        const store = item.store.toLowerCase()
        let score = 0
        if (name === q) score += 100
        else if (name.startsWith(q)) score += 50
        else if (name.includes(q)) score += 30
        else if (store.includes(q)) score += 10
        else return null
        return { item, score }
      })
      .filter((x): x is { item: ConvenienceItem; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    for (const { item } of scored) {
      const key = normalizeFoodName(item.name)
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        id: item.id,
        name: item.name,
        store: item.store,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        sourceType: 'official',
        searchSource: 'runtime',
        sourceLabel: '官方資料',
      })
    }
  }

  return out.slice(0, limit)
}
