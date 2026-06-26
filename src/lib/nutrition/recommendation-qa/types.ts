import type { ConvenienceItem } from '@/lib/convenience-store-menu'

export type QaConfidenceGrade = 'A' | 'B' | 'C' | 'D'

export type NutritionSourceTier =
  | 'official'
  | 'brand_public'
  | 'usda_tfda'
  | 'food_dna_template'
  | 'estimated_pending'
  | 'unknown'

export interface AllowlistEntryMeta {
  canonical_name: string
  confidence_level?: 'A' | 'B'
  source_type?: string
  needs_cross_validation?: boolean
}

export interface MenuItemQaResult {
  item_id: string
  name: string
  store: string
  restaurant_exists: boolean
  menu_exists: boolean
  placeholder_menu: boolean
  nutrition_complete: boolean
  energy_balance_ok: boolean
  portion_plausible: boolean
  macro_in_range: boolean
  nutrition_outlier: boolean
  nutrition_source: NutritionSourceTier
  confidence: QaConfidenceGrade
  recommendable: boolean
  issues: string[]
  scores: {
    diet_score: number
    nutrition_score: number
    restaurant_score: number
  }
  macro_band?: string
}

export interface RecommendationQaResult {
  scenario: string
  meal_type: string
  suggestion_id: string | null
  valid: boolean
  confidence: QaConfidenceGrade
  recommendable: boolean
  explainability_ok: boolean
  explanation: string
  issues: string[]
  totals?: { calories: number; protein_g: number; carbs_g: number; fat_g: number }
}

export interface RecommendationQaReport {
  generated_at: string
  scope: 'offline_qa' | 'sample'
  menu_scope: 'core' | 'core+bulk'
  restaurant_coverage: {
    allowlist_total: number
    with_menu: number
    without_menu: number
    coverage_pct: number
  }
  menu_coverage: {
    items_audited: number
    items_recommendable: number
    placeholder_count: number
    incomplete_nutrition: number
  }
  accuracy: {
    energy_balance_pass_pct: number
    macro_in_range_pct: number
    portion_plausible_pct: number
  }
  macro_fields: {
    calories_complete_pct: number
    protein_complete_pct: number
    fat_complete_pct: number
    carbs_complete_pct: number
    fiber_coverage_pct: number
    sugar_coverage_pct: number
    sodium_coverage_pct: number
  }
  confidence_distribution: Record<QaConfidenceGrade, number>
  nutrition_outliers: number
  recommendation_samples: {
    scenarios_run: number
    pass_rate_pct: number
    explainability_pass_pct: number
    confidence_ab_pct: number
  }
  top_missing_menus: string[]
  top_missing_nutrition: Array<{ id: string; store: string; name: string }>
  top_outliers: Array<{ id: string; store: string; name: string; issues: string[] }>
  item_results_sample: MenuItemQaResult[]
  recommendation_results: RecommendationQaResult[]
}

export type MenuItemLike = Pick<
  ConvenienceItem,
  'id' | 'name' | 'store' | 'calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'description' | 'tags' | 'role'
> & {
  fiber_g?: number
  sugar_g?: number
  sodium_mg?: number
}
