import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import type { MealType } from '@/lib/checkin-utils'
import type { SuggestContext } from '@/lib/meal-engine-types'
import { computeTodayMealState } from '@/lib/engines/next-meal-engine'
import { suggestNextMeal } from '@/lib/meal-suggest'
import {
  auditRestaurantMenuData,
  mergeMenuSources,
  type AllowlistFile,
} from '@/lib/nutrition/restaurant-menu-audit'
import { buildRestaurantMenuRegistry } from '@/lib/nutrition/restaurant-menu-registry'
import { auditMenuItem } from './item-qa'
import { auditRecommendation } from './recommendation-qa'
import type { AllowlistEntryMeta, MenuItemQaResult, RecommendationQaReport } from './types'

export interface RunRecommendationQaOptions {
  coreMenu: ConvenienceItem[]
  bulkMenu?: ConvenienceItem[]
  allowlist: AllowlistFile & { entries: AllowlistEntryMeta[] }
  /** Cap item audit for CI speed; full audit when omitted */
  maxItems?: number
  runRecommendationSamples?: boolean
}

function buildAllowlistMetaMap(allowlist: RunRecommendationQaOptions['allowlist']) {
  const map = new Map<string, AllowlistEntryMeta>()
  for (const e of allowlist.entries) {
    map.set(e.canonical_name.trim(), e)
  }
  return map
}

function sampleScenarios(daily: { calories: number; protein_g: number; carbs_g: number; fat_g: number }) {
  const base = {
    normalTargetKcal: daily.calories,
    proteinTargetG: daily.protein_g,
    calorieBank: null,
    mealSlot: 'lunch' as MealType,
  }

  return [
    {
      name: 'protein_gap_high',
      meal_type: 'lunch' as MealType,
      day_state: computeTodayMealState({
        todayFoodLogs: [
          {
            id: '1',
            name: '早餐',
            calories: Math.round(daily.calories * 0.2),
            protein_g: Math.round(daily.protein_g * 0.15),
            logged_at: new Date().toISOString(),
            user_declared: true,
            source: 'dice',
          },
        ],
        ...base,
      }),
    },
    {
      name: 'fat_near_limit',
      meal_type: 'dinner' as MealType,
      day_state: computeTodayMealState({
        todayFoodLogs: [
          {
            id: '2',
            name: '午餐炸物',
            calories: Math.round(daily.calories * 0.55),
            protein_g: Math.round(daily.protein_g * 0.5),
            fat_g: Math.round(daily.fat_g * 0.75),
            carbs_g: Math.round(daily.carbs_g * 0.4),
            logged_at: new Date().toISOString(),
            user_declared: true,
            source: 'dice',
          },
        ],
        ...base,
        mealSlot: 'dinner',
      }),
    },
    {
      name: 'carb_near_limit',
      meal_type: 'lunch' as MealType,
      day_state: computeTodayMealState({
        todayFoodLogs: [
          {
            id: '3',
            name: '麵包早餐',
            calories: Math.round(daily.calories * 0.35),
            protein_g: Math.round(daily.protein_g * 0.2),
            carbs_g: Math.round(daily.carbs_g * 0.7),
            logged_at: new Date().toISOString(),
            user_declared: true,
            source: 'dice',
          },
        ],
        ...base,
      }),
    },
    {
      name: 'calories_over_target',
      meal_type: 'dinner' as MealType,
      day_state: computeTodayMealState({
        todayFoodLogs: [
          {
            id: '4',
            name: '已吃滿',
            calories: daily.calories + 50,
            protein_g: daily.protein_g,
            logged_at: new Date().toISOString(),
            user_declared: true,
            source: 'dice',
          },
        ],
        ...base,
        mealSlot: 'dinner',
      }),
    },
  ]
}

export function runRecommendationQa(opts: RunRecommendationQaOptions): RecommendationQaReport {
  const bulk = opts.bulkMenu ?? []
  const merged = mergeMenuSources(opts.coreMenu, bulk)
  const menuScope = bulk.length ? 'core+bulk' : 'core'
  const auditMenu = opts.maxItems ? merged.slice(0, opts.maxItems) : merged

  const allowlistMeta = buildAllowlistMetaMap(opts.allowlist)
  const registry = buildRestaurantMenuRegistry(merged, opts.allowlist)
  const corpusAudit = auditRestaurantMenuData(merged, opts.allowlist)

  const itemResults: MenuItemQaResult[] = auditMenu.map(item =>
    auditMenuItem(item, registry, allowlistMeta)
  )

  const confidence_distribution = { A: 0, B: 0, C: 0, D: 0 } as Record<'A' | 'B' | 'C' | 'D', number>
  for (const r of itemResults) confidence_distribution[r.confidence]++

  const recommendable = itemResults.filter(r => r.recommendable)
  const outliers = itemResults.filter(r => r.nutrition_outlier)
  const placeholders = itemResults.filter(r => r.placeholder_menu)
  const incomplete = itemResults.filter(r => !r.nutrition_complete)

  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0)

  const recommendation_results: ReturnType<typeof auditRecommendation>[] = []
  if (opts.runRecommendationSamples !== false) {
    const daily = { calories: 1800, protein_g: 120, carbs_g: 180, fat_g: 55 }
    for (const scenario of sampleScenarios(daily)) {
      const ctx: SuggestContext = {
        meal_type: scenario.meal_type,
        daily_targets: daily,
        day_index: 0,
        fast_dice: true,
        day_state: scenario.day_state,
      }
      const { suggestion } = suggestNextMeal(ctx)
      recommendation_results.push(auditRecommendation(suggestion, ctx, scenario.name))
    }
  }

  const recPass = recommendation_results.filter(r => r.valid).length
  const recExplain = recommendation_results.filter(r => r.explainability_ok).length
  const recAB = recommendation_results.filter(r => r.recommendable).length

  const withMenu = corpusAudit.restaurantTotal - corpusAudit.restaurantsWithoutMenuCount

  return {
    generated_at: new Date().toISOString(),
    scope: opts.maxItems ? 'sample' : 'offline_qa',
    menu_scope: menuScope,
    restaurant_coverage: {
      allowlist_total: corpusAudit.restaurantTotal,
      with_menu: withMenu,
      without_menu: corpusAudit.restaurantsWithoutMenuCount,
      coverage_pct: pct(withMenu, corpusAudit.restaurantTotal),
    },
    menu_coverage: {
      items_audited: itemResults.length,
      items_recommendable: recommendable.length,
      placeholder_count: placeholders.length,
      incomplete_nutrition: incomplete.length,
    },
    accuracy: {
      energy_balance_pass_pct: pct(itemResults.filter(r => r.energy_balance_ok).length, itemResults.length),
      macro_in_range_pct: pct(itemResults.filter(r => r.macro_in_range).length, itemResults.length),
      portion_plausible_pct: pct(itemResults.filter(r => r.portion_plausible).length, itemResults.length),
    },
    macro_fields: {
      calories_complete_pct: pct(itemResults.filter(r => r.nutrition_complete).length, itemResults.length),
      protein_complete_pct: pct(itemResults.filter(r => r.nutrition_complete).length, itemResults.length),
      fat_complete_pct: pct(itemResults.filter(r => r.nutrition_complete).length, itemResults.length),
      carbs_complete_pct: pct(itemResults.filter(r => r.nutrition_complete).length, itemResults.length),
      fiber_coverage_pct: 0,
      sugar_coverage_pct: 0,
      sodium_coverage_pct: 0,
    },
    confidence_distribution,
    nutrition_outliers: outliers.length,
    recommendation_samples: {
      scenarios_run: recommendation_results.length,
      pass_rate_pct: pct(recPass, recommendation_results.length),
      explainability_pass_pct: pct(recExplain, recommendation_results.length),
      confidence_ab_pct: pct(recAB, recommendation_results.length),
    },
    top_missing_menus: corpusAudit.allowlistWithoutMenu.slice(0, 25),
    top_missing_nutrition: incomplete.slice(0, 20).map(r => ({
      id: r.item_id,
      store: r.store,
      name: r.name,
    })),
    top_outliers: outliers.slice(0, 25).map(r => ({
      id: r.item_id,
      store: r.store,
      name: r.name,
      issues: r.issues,
    })),
    item_results_sample: itemResults.slice(0, 50),
    recommendation_results,
  }
}
