import type { QaConfidenceGrade } from './recommendation-qa/types'

/** Canonical nutrition provenance — maps to Founder-facing labels */
export type NutritionTraceSourceType =
  | 'official'
  | 'usda'
  | 'mohw'
  | 'food_dna'
  | 'brand'
  | 'estimated'
  | 'unknown'

export const NUTRITION_TRACE_SOURCE_LABELS: Record<NutritionTraceSourceType, string> = {
  official: '官方',
  usda: 'USDA',
  mohw: '衛福部',
  food_dna: 'Food DNA',
  brand: '品牌公開',
  estimated: '待驗證估計',
  unknown: '未標示',
}

export interface NutritionSourceTrace {
  source_type: NutritionTraceSourceType
  source_name: string
  verified_at: string | null
  verification_count: number
  confidence: QaConfidenceGrade
  last_reviewed: string | null
}
