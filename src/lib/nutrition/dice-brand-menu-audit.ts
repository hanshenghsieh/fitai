import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import type { MealType } from '@/lib/checkin-utils'
import { canonicalDiceStore, diceStoreMatches } from '@/lib/dice-store-aliases'
import { isDiceMainCandidate } from '@/lib/dice-menu-pool'
import {
  auditRestaurantMenuData,
  buildAllowlistStoreIndex,
  hasCompleteNutrition,
  type AllowlistFile,
} from '@/lib/nutrition/restaurant-menu-audit'
import {
  evaluateMenuItemConfidence,
  isDiceRecommendable,
  isRuntimeRecommendable,
} from '@/lib/nutrition/menu-confidence-runtime'
import { isPlaceholderMenuItem } from '@/lib/nutrition/menu-confidence-core'
import { buildRestaurantMenuRegistry } from '@/lib/nutrition/restaurant-menu-registry'

/** Backfill target per brand (see menu-backfill/reports.ts). */
export const DICE_BRAND_MENU_TARGET = 20

export type DiceBrandMenuStatus =
  | 'complete'
  | 'partial'
  | 'sparse'
  | 'missing'

export interface DiceBrandMenuRow {
  rank: number
  canonical_name: string
  seed_priority: string
  confidence_level: string
  item_count: number
  complete_nutrition_count: number
  dice_main_count: number
  dice_recommendable_main_count: number
  recommend_ab_count: number
  placeholder_count: number
  store_variants: string[]
  status: DiceBrandMenuStatus
  issues: string[]
}

export interface DiceBrandMenuAuditResult {
  brand_total: number
  complete_count: number
  partial_count: number
  sparse_count: number
  missing_count: number
  split_store_brands: number
  brands: DiceBrandMenuRow[]
  summary: ReturnType<typeof auditRestaurantMenuData>
}

function brandStatus(row: Omit<DiceBrandMenuRow, 'status' | 'issues'>): DiceBrandMenuStatus {
  if (row.item_count === 0) return 'missing'
  if (row.item_count < 3) return 'sparse'
  if (
    row.item_count >= DICE_BRAND_MENU_TARGET &&
    row.dice_recommendable_main_count >= 3 &&
    row.complete_nutrition_count >= DICE_BRAND_MENU_TARGET
  ) {
    return 'complete'
  }
  return 'partial'
}

function collectIssues(row: Omit<DiceBrandMenuRow, 'status' | 'issues'>): string[] {
  const issues: string[] = []
  if (row.item_count === 0) issues.push('無任何菜單品項')
  else {
    if (row.item_count < DICE_BRAND_MENU_TARGET) {
      issues.push(`品項數 ${row.item_count} < 目標 ${DICE_BRAND_MENU_TARGET}`)
    }
    if (row.complete_nutrition_count < row.item_count) {
      issues.push(`營養不完整 ${row.item_count - row.complete_nutrition_count} 筆`)
    }
    if (row.dice_main_count < 3) issues.push(`可當主餐 < 3（目前 ${row.dice_main_count}）`)
    if (row.dice_recommendable_main_count < 3) {
      issues.push(`骰子可推主餐 < 3（目前 ${row.dice_recommendable_main_count}）`)
    }
    if (row.recommend_ab_count < Math.min(3, row.item_count)) {
      issues.push(`A/B 可推薦品項偏少（${row.recommend_ab_count}）`)
    }
    if (row.placeholder_count > 0) issues.push(`模板/待驗證 ${row.placeholder_count} 筆`)
    if (row.store_variants.length > 1) {
      issues.push(`店名分裂：${row.store_variants.join(' / ')}`)
    }
  }
  return issues
}

export function auditDiceBrandMenus(
  menu: ConvenienceItem[],
  allowlist: AllowlistFile,
  mealType: MealType = 'lunch'
): DiceBrandMenuAuditResult {
  const summary = auditRestaurantMenuData(menu, allowlist)
  const allowlistIndex = buildAllowlistStoreIndex(allowlist)
  const registry = buildRestaurantMenuRegistry(menu, allowlist)

  const itemsByCanonical = new Map<string, ConvenienceItem[]>()
  const storeVariantsByCanonical = new Map<string, Set<string>>()

  for (const item of menu) {
    const store = (item.store ?? '').trim()
    if (!store || store === '自助餐組件') continue
    const canonical =
      allowlistIndex.get(store.trim().toLowerCase()) ?? canonicalDiceStore(store)
    if (!allowlist.entries.some(e => e.canonical_name.trim() === canonical)) continue

    const list = itemsByCanonical.get(canonical) ?? []
    list.push(item)
    itemsByCanonical.set(canonical, list)

    const variants = storeVariantsByCanonical.get(canonical) ?? new Set<string>()
    variants.add(store)
    storeVariantsByCanonical.set(canonical, variants)
  }

  const brands: DiceBrandMenuRow[] = allowlist.entries.map(entry => {
    const canonical = entry.canonical_name.trim()
    const items = itemsByCanonical.get(canonical) ?? []
    let complete_nutrition_count = 0
    let dice_main_count = 0
    let dice_recommendable_main_count = 0
    let recommend_ab_count = 0
    let placeholder_count = 0

    for (const item of items) {
      if (hasCompleteNutrition(item)) complete_nutrition_count++
      if (isPlaceholderMenuItem(item)) placeholder_count++
      const grade = evaluateMenuItemConfidence(item, registry)
      if (grade === 'A' || grade === 'B') recommend_ab_count++
      if (isDiceMainCandidate(item, mealType)) {
        dice_main_count++
        if (isDiceRecommendable(item)) dice_recommendable_main_count++
      }
      if (isRuntimeRecommendable(item)) {
        /* counted above */
      }
    }

    const base = {
      rank: entry.rank ?? 0,
      canonical_name: canonical,
      seed_priority: entry.seed_priority ?? '',
      confidence_level: entry.confidence_level ?? '',
      item_count: items.length,
      complete_nutrition_count,
      dice_main_count,
      dice_recommendable_main_count,
      recommend_ab_count,
      placeholder_count,
      store_variants: [...(storeVariantsByCanonical.get(canonical) ?? new Set())].sort(),
    }
    const issues = collectIssues(base)
    return {
      ...base,
      status: brandStatus(base),
      issues,
    }
  })

  brands.sort((a, b) => a.rank - b.rank)

  return {
    brand_total: brands.length,
    complete_count: brands.filter(b => b.status === 'complete').length,
    partial_count: brands.filter(b => b.status === 'partial').length,
    sparse_count: brands.filter(b => b.status === 'sparse').length,
    missing_count: brands.filter(b => b.status === 'missing').length,
    split_store_brands: brands.filter(b => b.store_variants.length > 1).length,
    brands,
    summary,
  }
}

/** Items for a canonical brand across all store name variants. */
export function itemsForDiceBrand(
  menu: ConvenienceItem[],
  canonical: string
): ConvenienceItem[] {
  return menu.filter(i => diceStoreMatches(i.store ?? '', canonical))
}
