import type { QaConfidenceGrade } from '../nutrition/recommendation-qa/types'

/** Founder freeze lifted 2026-06-25 — Sprint 3 resumed under BDGS pipeline */
export const BDGS_DATA_FREEZE = false

export const REVIEW_CYCLE_DAYS = 180

export type GovernedRecordStatus = 'active' | 'deprecated'

export type PromotionStage =
  | 'draft'
  | 'staging'
  | 'qa'
  | 'founder_review'
  | 'production_candidate'
  | 'runtime'

export const PROMOTION_PIPELINE: PromotionStage[] = [
  'draft',
  'staging',
  'qa',
  'founder_review',
  'production_candidate',
  'runtime',
]

export type ReviewQueueReason =
  | 'review_due'
  | 'source_updated'
  | 'nutrition_diff'
  | 'qa_failed'
  | 'founder_hold'

export type ReviewQueueStatus = 'need_review' | 'pending_review'

export interface GovernedMenuRecord {
  record_id: string
  brand: string
  item_name: string
  created_at: string
  updated_at: string
  verified_at: string | null
  review_due_at: string
  version: string
  status: GovernedRecordStatus
  promotion_stage: PromotionStage
  confidence: QaConfidenceGrade | null
  source_url: string | null
  source_fingerprint: string | null
}

export interface SourceFingerprint {
  brand: string
  source_url: string
  official_version: string | null
  content_hash: string
  last_checked_at: string
}

export interface SourceMonitorResult {
  brand: string
  source_url: string
  changed: boolean
  change_type: 'url' | 'version' | 'hash' | 'pdf' | null
  previous_hash: string | null
  current_hash: string
  requires_pending_review: boolean
}

export interface PromotionTransition {
  record_id: string
  from_stage: PromotionStage
  to_stage: PromotionStage
  actor: string
  reason: string
  at: string
  allowed: boolean
  block_reason?: string
}

export interface PromotionSnapshot {
  snapshot_id: string
  created_at: string
  actor: string
  reason: string
  stage: PromotionStage
  records: GovernedMenuRecord[]
}

export interface RollbackResult {
  success: boolean
  snapshot_id: string
  restored_count: number
  message: string
}

export type AuditEntityType = 'menu' | 'nutrition' | 'food_dna' | 'confidence' | 'promotion' | 'source'

export interface AuditLogEntry {
  id: string
  at: string
  actor: string
  entity_type: AuditEntityType
  entity_id: string
  action: string
  reason: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
}

export interface ReviewQueueItem {
  record_id: string
  brand: string
  item_name: string
  queue_status: ReviewQueueStatus
  reason: ReviewQueueReason
  due_at: string
  promotion_stage: PromotionStage
}

export interface CoverageMetrics {
  restaurant_coverage_pct: number
  restaurant_with_menu: number
  restaurant_allowlist_total: number
  menu_coverage_pct: number
  menu_items_total: number
  menu_items_target: number
  onr_coverage_pct: number
  onr_brands: number
  onr_items: number
  food_dna_coverage_pct: number
  food_dna_templates: number
  recommendation_coverage_pct: number
  recommendable_items: number
  qa_coverage_pct: number
  qa_passed_items: number
  pending_review_count: number
  need_review_count: number
  deprecated_count: number
}

export interface BrandRiskRow {
  brand: string
  risk_score: number
  pending_review: number
  need_review: number
  deprecated: number
  onr_missing: boolean
  reasons: string[]
}

export interface DatabaseHealthReport {
  generated_at: string
  freeze_active: boolean
  coverage: CoverageMetrics
  health_score: number
  health_grade: 'A' | 'B' | 'C' | 'D' | 'F'
  top_risk_brands: BrandRiskRow[]
  next_review_date: string | null
  promotion_pipeline_summary: Record<PromotionStage, number>
  missing_onr_brands: string[]
}
