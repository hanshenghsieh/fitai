import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import type { SourceType } from '@/lib/food-kb/types'
import type { QaConfidenceGrade } from '../recommendation-qa/types'

export type VerificationSourcePriority = 'A' | 'B' | 'C'

export interface VerificationSource {
  priority: VerificationSourcePriority
  source_type: SourceType
  source_url: string
  observed_at: string
  nutrition?: {
    calories?: number
    protein_g?: number
    fat_g?: number
    carbs_g?: number
    fiber_g?: number
    sugar_g?: number
    sodium_mg?: number
  }
}

export interface MenuItemVerification {
  sources: VerificationSource[]
  source: string
  source_url: string
  verified_at: string
  verified_by: string
  verification_count: number
  confidence: QaConfidenceGrade
  canonical_name?: string
  conflict_status: 'none' | 'pending_review' | 'resolved'
}

export type VerifiedMenuItem = ConvenienceItem & {
  verification?: MenuItemVerification
}

export interface NutritionConflict {
  field: 'calories' | 'protein_g' | 'fat_g' | 'carbs_g'
  values: Array<{ source_type: SourceType; value: number }>
  threshold_exceeded: boolean
  message: string
}

export type StagingRestaurantStatus =
  | 'draft'
  | 'qa_pending'
  | 'production_candidate'
  | 'promoted'
  | 'rejected'

export interface StagingRestaurant {
  canonical_name: string
  restaurant_sources: VerificationSource[]
  items: VerifiedMenuItem[]
  status: StagingRestaurantStatus
  top20_rank_basis?: string
  qa_passed_at?: string
  qa_notes?: string[]
  promoted_at?: string
  promoted_item_count?: number
}

export interface StagingManifest {
  version: string
  generated_at: string
  policy: 'zero_hallucination'
  restaurants: StagingRestaurant[]
}

export interface DuplicateGroup {
  canonical_name: string
  store: string
  variants: Array<{ id: string; name: string }>
}

export interface MenuBackfillAcceptanceReport {
  generated_at: string
  restaurant_coverage: {
    allowlist_total: number
    with_runtime_menu: number
    with_staging_menu: number
    missing: number
    coverage_pct: number
  }
  menu_coverage: {
    runtime_items: number
    staging_items: number
    runtime_recommendable: number
    staging_production_candidates: number
  }
  nutrition_coverage: {
    calories_pct: number
    protein_pct: number
    fat_pct: number
    carbs_pct: number
    fiber_pct: number
    sugar_pct: number
    sodium_pct: number
  }
  verification_coverage: {
    restaurants_with_2plus_sources: number
    items_with_traceable_source: number
    items_pending_conflict_review: number
  }
  duplicate_report: DuplicateGroup[]
  conflict_report: Array<{
    item_id: string
    store: string
    name: string
    conflicts: NutritionConflict[]
  }>
  confidence_distribution: Record<QaConfidenceGrade, number>
  missing_restaurants: string[]
  missing_menus: Array<{ restaurant: string; needed: number; have: number }>
  runtime_ready: {
    restaurants_ready: number
    items_ready: number
    blocked_d_count: number
    search_only_c_count: number
  }
}
