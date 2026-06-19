import { eatOutMenu, type ConvenienceItem } from './convenience-store-menu'
import type { MealType } from './checkin-utils'
import type { UserProfile } from '@/types'
import type { EatOutPreferences, UserMemoryState } from './meal-engine-types'
import { budgetMaxForMeal } from './meal-engine-types'
import { isSanitizedMenuItem } from './meal-combo-validity'

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
  const avoided = new Set(prefs?.avoided_brands ?? [])
  if (!avoided.size) return items
  const filtered = items.filter(i => !avoided.has(i.store))
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
  memory?: UserMemoryState
): ConvenienceItem[] {
  let items = eatOutMenu.filter(i => i.category === mealType && isSanitizedMenuItem(i))
  items = filterByProfile(items, profile)
  items = filterByBudget(items, mealType, profile, memory?.eat_out_prefs)
  items = filterByStorePrefs(items, memory?.eat_out_prefs)
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
