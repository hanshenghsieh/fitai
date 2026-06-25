import type { ConvenienceItem } from './convenience-store-menu'
import type { PortionId } from './eat-out-builder'
import type { MealType } from './checkin-utils'
import type { FoodBudget, UserProfile } from '@/types'

export type HighlightKey =
  | 'high_protein'
  | 'budget_friendly'
  | 'calorie_fit'
  | 'light_meal'
  | 'preferred_store'
  | 'nearby'
  | 'balanced'

export interface EatOutPreferences {
  preferred_brands?: string[]
  avoided_brands?: string[]
  work_location?: { lat: number; lng: number; label?: string }
  home_location?: { lat: number; lng: number; label?: string }
  lunch_max_price?: number
  breakfast_max_price?: number
  dinner_max_price?: number
}

export interface UserMemoryState {
  eat_out_prefs: EatOutPreferences
  favorite_item_ids: string[]
  favorite_brands: string[]
}

export interface MealLine {
  item: ConvenienceItem
  portion: PortionId
}

export interface MealTargets {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface MealSuggestion {
  id: string
  meal_type: MealType
  lines: MealLine[]
  totals: {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
    price: number
  }
  highlight: string
  highlight_key: HighlightKey
  /** 為什麼這餐？— 價格比較依據（僅在 highlight 涉及預算時填） */
  highlight_price_meta?: {
    total_price: number
    budget_max: number
    pool_median_price: number
    saved_vs_median: number
  }
  stores: string[]
  restaurant_name?: string
  distance_m?: number
  walk_minutes?: number
  maps_url?: string
  nutrition_score: number
  /** Dev only — why this suggestion passed validation */
  recommendation_debug_reason?: string
}

export interface SuggestContext {
  meal_type: MealType
  daily_targets: MealTargets
  profile?: UserProfile | null
  memory?: UserMemoryState
  day_index?: number
  exclude_ids?: string[]
  exclude_names?: string[]
  /** 本輪／近期已骰過的店名 — 強制輪替品牌 */
  exclude_stores?: string[]
  rolls_used?: number
  nearby_brands?: string[]
  user_lat?: number
  user_lng?: number
  seed?: number
  /** Phase 7 — 隱形 adherence，調整骰子與目標（使用者不可見） */
  adherence?: import('@/lib/engines/adherence-types').AdherenceState | null
  /** Engine v1 — persistent calorie bank */
  calorie_bank?: import('@/lib/banks/calorie-bank-types').CalorieBankRow | null
  /** Engine v2 — continuous today state */
  day_state?: import('@/lib/engines/next-meal-engine').TodayMealState | null
  /** UI dice roll — use cached pool + lighter candidate generation */
  fast_dice?: boolean
}

export const MEAL_RATIOS = { breakfast: 0.25, lunch: 0.4, dinner: 0.35 } as const

export const HIGHLIGHT_COPY: Record<HighlightKey, string> = {
  high_protein: '這組比較高蛋白，適合今天的目標',
  budget_friendly: '這組比較省錢，預算剛剛好',
  calorie_fit: '這組比較適合今天這餐的熱量',
  light_meal: '這組比較清爽，吃得剛好無負擔',
  preferred_store: '這組來自你常去的店家',
  nearby: '這間離你最近，走一下就到',
  balanced: '這組營養均衡，照著吃就好',
}

export function mealTargetsFromDaily(daily: MealTargets, mealType: MealType): MealTargets {
  const r = MEAL_RATIOS[mealType]
  return {
    calories: Math.round(daily.calories * r),
    protein_g: Math.round(daily.protein_g * r),
    carbs_g: Math.round(daily.carbs_g * r),
    fat_g: Math.round(daily.fat_g * r),
  }
}

export function budgetMaxForMeal(budget: FoodBudget | undefined, mealType: MealType): number {
  const tier = budget ?? 'medium'
  const table: Record<FoodBudget, Record<MealType, number>> = {
    low: { breakfast: 90, lunch: 130, dinner: 130 },
    medium: { breakfast: 120, lunch: 180, dinner: 180 },
    high: { breakfast: 200, lunch: 350, dinner: 350 },
  }
  return table[tier][mealType]
}

export function suggestionId(lines: MealLine[]): string {
  return lines.map(l => `${l.item.id}:${l.portion}`).sort().join('|')
}
