import type { QaConfidenceGrade } from '../recommendation-qa/types'

/** Official Source Priority — Founder policy */
export type OfficialSourcePriority = 'A' | 'B' | 'C'

export type OfficialSourcePriorityKind =
  | 'official_nutrition_pdf'
  | 'official_nutrition_page'
  | 'official_menu'
  | 'official_announcement'
  | 'mohw'
  | 'usda'

export interface OfficialReferenceMetadata {
  brand_id: string
  canonical_name: string
  store_aliases: string[]
  nutrition_source_url: string
  last_verified: string
  official_version: string
  country: 'TW'
  source_priority: OfficialSourcePriority
  source_priority_kind?: OfficialSourcePriorityKind
}

export interface OfficialMenuItem {
  name: string
  aliases?: string[]
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber?: number | null
  sugar?: number | null
  sodium?: number | null
  serving_size?: string | null
  source_url: string
  verified_at: string
  verified_by: string
  verification_count: number
  confidence: QaConfidenceGrade
}

export interface OfficialBrandReference {
  metadata: OfficialReferenceMetadata
  menu: OfficialMenuItem[]
}

export interface OfficialReferenceIndex {
  version: string
  generated_at: string
  policy: 'official_nutrition_reference'
  brand_count: number
  brands: Array<{
    brand_id: string
    canonical_name: string
    file: string
    menu_count: number
  }>
}

export interface MacroSnapshot {
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber?: number | null
  sugar?: number | null
  sodium?: number | null
}

export type NutritionCompareSource = 'official' | 'food_dna' | 'runtime'

export interface NutritionDiffThresholds {
  calories_pct: number
  protein_g: number
  fat_g: number
  carbs_g: number
}

export interface NutritionDiffResult {
  item_name: string
  brand: string
  official: MacroSnapshot
  compare_source: NutritionCompareSource
  compare: MacroSnapshot
  field_diffs: Array<{
    field: keyof MacroSnapshot
    official: number
    compare: number
    delta: number
    exceeds_threshold: boolean
  }>
  pending_review: boolean
  reasons: string[]
}

export interface BrandCoverageRow {
  brand_id: string
  canonical_name: string
  source_complete: boolean
  menu_count: number
  menu_target: number
  official_menu_coverage_pct: number
  official_nutrition_coverage_pct: number
  recommendable_count: number
  recommendable_pct: number
  pending_manual_count: number
  pending_manual_pct: number
  promote_ready_count: number
}

export interface OfficialCoverageDashboard {
  generated_at: string
  brands_complete: number
  brands_total: number
  menu_items_total: number
  nutrition_complete_total: number
  overall_coverage_pct: number
  pending_review_total: number
  promote_ready_total: number
  missing_official_source: string[]
  brands: BrandCoverageRow[]
}
