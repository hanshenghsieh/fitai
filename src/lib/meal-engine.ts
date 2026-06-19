import type { MealType, CheckinMeta } from './checkin-utils'
import type { UserProfile } from '@/types'
import type { CustomEatOutSelection } from './checkin-utils'
import type { EatOutPreferences, MealSuggestion, SuggestContext, UserMemoryState } from './meal-engine-types'
import { suggestNextMeal, suggestionToCustomSelection } from './meal-suggest'
import { nearbyBrands } from './nearby-engine'
import { eatOutMenu } from './convenience-store-menu'

export type { MealSuggestion, UserMemoryState, EatOutPreferences }
export { suggestNextMeal, suggestionToCustomSelection }

export function memoryFromCheckinMeta(meta: CheckinMeta): UserMemoryState {
  return {
    eat_out_prefs: meta.user_memory?.eat_out_prefs ?? {},
    favorite_item_ids: meta.user_memory?.favorite_item_ids ?? [],
    favorite_brands: meta.user_memory?.favorite_brands ?? [],
  }
}

export function currentMealSlot(): MealType {
  const h = new Date().getHours()
  if (h < 10) return 'breakfast'
  if (h < 15) return 'lunch'
  return 'dinner'
}

export function namesFromSeenIds(seenIds: string[]): string[] {
  const names = new Set<string>()
  for (const composite of seenIds) {
    for (const part of composite.split('|')) {
      const itemId = part.split(':')[0]
      const item = eatOutMenu.find(i => i.id === itemId)
      if (item) names.add(item.name)
    }
  }
  return [...names]
}

export function buildSuggestContext(params: {
  meal_type: MealType
  daily_targets: SuggestContext['daily_targets']
  profile?: UserProfile | null
  memory?: UserMemoryState
  day_index?: number
  exclude_ids?: string[]
  exclude_names?: string[]
  rolls_used?: number
  user_lat?: number
  user_lng?: number
  seed?: number
}): SuggestContext {
  const lat = params.user_lat
  const lng = params.user_lng
  const brands = lat != null && lng != null ? nearbyBrands(lat, lng) : undefined
  return { ...params, nearby_brands: brands }
}

export function rollMealSuggestion(params: {
  meal_type: MealType
  daily_targets: SuggestContext['daily_targets']
  profile?: UserProfile | null
  memory?: UserMemoryState
  day_index?: number
  seen_ids: string[]
  exclude_names?: string[]
  rolls_used: number
  user_lat?: number
  user_lng?: number
}): {
  suggestion: MealSuggestion | null
  rolls_used: number
  pool_exhausted: boolean
} {
  const seenNames = namesFromSeenIds(params.seen_ids)
  const excludeNames = [...new Set([...seenNames, ...(params.exclude_names ?? [])])]
  const mealSeed = params.meal_type.charCodeAt(0) * 131

  const ctx = buildSuggestContext({
    meal_type: params.meal_type,
    daily_targets: params.daily_targets,
    profile: params.profile,
    memory: params.memory,
    day_index: params.day_index,
    exclude_ids: params.seen_ids,
    exclude_names: excludeNames,
    rolls_used: params.rolls_used,
    user_lat: params.user_lat,
    user_lng: params.user_lng,
    seed: Date.now() + params.rolls_used * 9973 + mealSeed,
  })

  let { suggestion, pool_exhausted } = suggestNextMeal(ctx)

  if (!suggestion && params.seen_ids.length > 0) {
    const retry = suggestNextMeal(
      buildSuggestContext({
        ...params,
        exclude_ids: [],
        exclude_names: params.exclude_names ?? [],
        rolls_used: params.rolls_used,
        seed: Date.now() + params.rolls_used * 9973 + mealSeed + 999,
      })
    )
    suggestion = retry.suggestion
    pool_exhausted = retry.pool_exhausted
  }

  return {
    suggestion,
    rolls_used: params.rolls_used + 1,
    pool_exhausted,
  }
}

export function suggestionToSelections(suggestion: MealSuggestion): CustomEatOutSelection[] {
  return suggestionToCustomSelection(suggestion)
}

export function recordFavorite(
  memory: UserMemoryState,
  suggestion: MealSuggestion
): UserMemoryState {
  const ids = new Set([...memory.favorite_item_ids, ...suggestion.lines.map(l => l.item.id)])
  const brands = new Set([...memory.favorite_brands, ...suggestion.stores])
  return {
    ...memory,
    favorite_item_ids: [...ids].slice(-50),
    favorite_brands: [...brands].slice(-20),
  }
}
