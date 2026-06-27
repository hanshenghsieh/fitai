import { eatOutMenu, type ConvenienceItem } from './convenience-store-menu'
import type { MealType } from './checkin-utils'
import type { UserProfile } from '@/types'
import type { EatOutPreferences, UserMemoryState } from './meal-engine-types'
import { budgetMaxForMeal } from './meal-engine-types'
import { isSanitizedMenuItem } from './meal-combo-validity'
import { isPlausibleBrandItem } from './store-menu-plausibility'
import { canonicalDiceStore } from './dice-store-aliases'
import { passesMenuAccessGate, type MenuAccessMode } from './nutrition/menu-confidence-runtime'

function mealCategoryOk(
  item: ConvenienceItem,
  mealType: MealType,
  mode: MenuAccessMode
): boolean {
  if (item.category === mealType) return true
  if (mode !== 'dice') return false
  if (item.source !== 'chain' && item.source !== 'delivery') return false
  if (mealType === 'breakfast') return false
  return (
    (mealType === 'lunch' && item.category === 'dinner') ||
    (mealType === 'dinner' && item.category === 'lunch')
  )
}

const MEAT_KEYWORDS = ['雞', '鴨', '肉', '蝦', '鮪', '牛', '豬', '魚', '蛤', '蚵', '鮭', '培根', '香腸']
const DAIRY_KEYWORDS = ['蛋', '乳', '奶', '起司', '優格']

export function isPlantBasedItem(
  item: { name: string; description?: string },
  profile?: UserProfile | null
): boolean {
  if (!profile?.is_vegetarian && !profile?.is_vegan) return true
  if (MEAT_KEYWORDS.some(k => item.name.includes(k))) return false
  if (profile.is_vegan && DAIRY_KEYWORDS.some(k => item.name.includes(k))) return false
  return true
}

export function filterByProfile(items: ConvenienceItem[], profile?: UserProfile | null): ConvenienceItem[] {
  if (!profile) return items
  let filtered = items

  if (profile.is_vegan || profile.is_vegetarian) {
    filtered = filtered.filter(i => isPlantBasedItem(i, profile))
  }

  if (profile.is_halal) {
    filtered = filtered.filter(i => !i.name.includes('豬') && !i.name.includes('酒'))
  }

  if (profile.is_gluten_free) {
    filtered = filtered.filter(i => !i.name.includes('麵') && !i.name.includes('麵包') && !i.tags?.includes('noodle'))
  }

  for (const a of profile.allergens ?? []) {
    filtered = filtered.filter(i => !i.name.includes(a) && !(i.description ?? '').includes(a))
  }
  for (const d of profile.disliked_foods ?? []) {
    filtered = filtered.filter(i => !i.name.includes(d))
  }

  return filtered.length ? filtered : profile.is_vegetarian || profile.is_vegan
    ? items.filter(i => isPlantBasedItem(i, profile))
    : items.filter(i => i.category === items[0]?.category)
}

export function filterByBudget(
  items: ConvenienceItem[],
  mealType: MealType,
  profile?: UserProfile | null,
  prefs?: EatOutPreferences
): ConvenienceItem[] {
  const override =
    mealType === 'breakfast'
      ? prefs?.breakfast_max_price
      : mealType === 'lunch'
        ? prefs?.lunch_max_price
        : prefs?.dinner_max_price
  const max = override ?? budgetMaxForMeal(profile?.food_budget, mealType)
  const affordable = items.filter(i => i.price <= max)
  return affordable.length ? affordable : items.filter(i => i.price <= max * 1.25)
}

export function filterByStorePrefs(
  items: ConvenienceItem[],
  prefs?: EatOutPreferences
): ConvenienceItem[] {
  const avoided = new Set((prefs?.avoided_brands ?? []).map(canonicalDiceStore))
  if (!avoided.size) return items
  const filtered = items.filter(i => !avoided.has(canonicalDiceStore(i.store)))
  return filtered.length ? filtered : items
}

export function filterByNearbyBrands(
  items: ConvenienceItem[],
  nearbyBrands?: string[]
): ConvenienceItem[] {
  if (!nearbyBrands?.length) return items
  const set = new Set(nearbyBrands)
  const filtered = items.filter(i => set.has(i.store))
  return filtered.length >= 5 ? filtered : items
}

export function getFilteredMenu(
  mealType: MealType,
  profile?: UserProfile | null,
  memory?: UserMemoryState,
  opts?: { includeBeverages?: boolean; source?: ConvenienceItem[]; mode?: MenuAccessMode }
): ConvenienceItem[] {
  const mode = opts?.mode ?? 'recommend'
  let items = (opts?.source ?? eatOutMenu).filter(
    i =>
      mealCategoryOk(i, mealType, mode) &&
      isSanitizedMenuItem(i, { allowBeverages: opts?.includeBeverages }) &&
      isPlausibleBrandItem(i) &&
      passesMenuAccessGate(i, mode)
  )
  items = filterByProfile(items, profile)
  items = filterByBudget(items, mealType, profile, memory?.eat_out_prefs)
  items = filterByStorePrefs(items, memory?.eat_out_prefs)
  if (mode === 'dice') {
    items = items.map(i => ({ ...i, store: canonicalDiceStore(i.store) }))
  }
  return items
}

export function preferredBrandBoost(store: string, memory?: UserMemoryState): number {
  const preferred = new Set([
    ...(memory?.eat_out_prefs?.preferred_brands ?? []),
    ...(memory?.favorite_brands ?? []),
  ])
  if (preferred.has(store)) return -15
  return 0
}
