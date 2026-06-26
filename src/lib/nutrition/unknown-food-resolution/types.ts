import type { FoodLogEntry, FoodNutritionStatus } from '@/lib/banks/types'
import type { NutritionMacros } from '@/lib/nutrition/search-v2/types'

export const AUTO_APPLY_MIN_SCORE = 0.99

export type AutoApplySourceType = 'onr' | 'food_dna' | 'verified_database' | 'official'

export interface NutritionTraceRef {
  source_type: AutoApplySourceType
  source_name: string
  source_url: string
  confidence: 'A' | 'B'
}

export interface VerifiedMatchCandidate {
  matched_item_id: string
  matched_item_name: string
  store?: string
  macros: NutritionMacros
  match_score: number
  nutrition_trace: NutritionTraceRef
  match_kind: 'exact' | 'strong_alias'
}

export interface AutoApplyQaResult {
  pass: boolean
  reasons: string[]
}

export interface AutoApplyDecision {
  eligible: boolean
  candidate?: VerifiedMatchCandidate
  qa: AutoApplyQaResult
  pending_review: boolean
}

export interface AutoApplyAuditEntry {
  id: string
  rollback_token: string
  unknown_record_id: string
  original_food_name: string
  matched_item_id: string
  matched_item_name: string
  match_score: number
  source_type: AutoApplySourceType
  source_name: string
  source_url: string
  before_nutrition: {
    nutrition_status?: FoodNutritionStatus
    calories: number | null
    protein_g: number | null
    fat_g: number | null
    carbs_g: number | null
  }
  after_nutrition: {
    nutrition_status: 'auto_resolved'
    calories: number
    protein_g: number
    fat_g: number
    carbs_g: number
  }
  auto_resolved_at: string
  qa_result: AutoApplyQaResult
  rolled_back?: boolean
  rolled_back_at?: string
}

export interface DailyRematchJobResult {
  scanned: number
  applied: number
  pending_review: number
  skipped: number
  audits: AutoApplyAuditEntry[]
  updated_logs: FoodLogEntry[]
}

export interface AutoApplyAnalytics {
  unknown_count: number
  auto_resolved_count: number
  pending_review_count: number
  auto_apply_success_rate: number
  rollback_count: number
  top_unresolved_foods: Array<{ food_name: string; count: number }>
  top_auto_resolved_foods: Array<{ food_name: string; count: number }>
}
