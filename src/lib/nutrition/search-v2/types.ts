/** Nutrition Search V2 — shared types (Accuracy First) */

export type NutritionStatus =
  | 'official'
  | 'verified'
  | 'user_entered'
  | 'auto_resolved'
  | 'pending_review'
  | 'pending_confirmation'
  | 'estimated_pending_confirmation'
  | 'estimated'
  | 'unknown'

/** A = official exact, B = official + clarification, C = trusted estimate (future), Unknown = text only */
export type NutritionConfidence = 'A' | 'B' | 'C' | 'Unknown'

export type SearchMatchLevel = 'A' | 'B' | 'C'

export type SearchSourceTier =
  | 'official'
  | 'onr'
  | 'food_dna'
  | 'recent'
  | 'favorite'
  | 'unknown'

export interface NutritionMacros {
  calories: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
  fiber: number | null
  sugar: number | null
  sodium: number | null
}

export const NULL_MACROS: NutritionMacros = {
  calories: null,
  protein: null,
  fat: null,
  carbs: null,
  fiber: null,
  sugar: null,
  sodium: null,
}

export interface SearchV2Candidate {
  id: string
  name: string
  store?: string
  macros: NutritionMacros
  nutrition_status: NutritionStatus
  nutrition_confidence: NutritionConfidence
  nutrition_source: string
  source_tier: SearchSourceTier
  match_score: number
  explanation: string
}

export interface ClarificationOption {
  id: string
  label: string
}

export interface ClarificationQuestion {
  id: string
  prompt: string
  options: ClarificationOption[]
  required: boolean
}

export interface ClarificationSession {
  sessionId: string
  originalQuery: string
  questions: ClarificationQuestion[]
  answers: Record<string, string>
  step: number
  maxSteps: number
}

export type UnknownQueueStatus = 'waiting' | 'matched' | 'dismissed' | 'updated' | 'pending_review'

export interface UnknownQueueEntry {
  id: string
  food_name: string
  restaurant: string | null
  image_hash?: string | null
  created_at: string
  times_used: number
  times_requested: number
  last_used: string
  last_requested: string
  waiting_days: number
  possible_matches: string[]
  user_entered_nutrition?: {
    calories: number | null
    protein_g: number | null
    fat_g: number | null
    carbs_g: number | null
    partial?: boolean
  } | null
  priority_score: number
  status: UnknownQueueStatus
}

export interface SearchV2Outcome {
  level: SearchMatchLevel
  action: 'create_official' | 'clarify' | 'create_unknown' | 'pick_candidate'
  query: string
  explanation: string
  candidates: SearchV2Candidate[]
  clarification?: ClarificationSession
  unknown_record?: {
    food_name: string
    restaurant: string | null
    nutrition_status: 'unknown'
    nutrition_confidence: 'Unknown'
    macros: NutritionMacros
    ui_message: string
  }
  official_record?: SearchV2Candidate
}

export interface RematchProposal {
  queue_entry_id: string
  food_name: string
  candidate: SearchV2Candidate
  match_score: number
  message: string
  actions: ('update_record' | 'keep_text' | 'view_diff')[]
}

export interface UnknownAnalytics {
  unknown_foods: number
  top_unknown: Array<{ food_name: string; times_used: number; priority_score?: number }>
  restaurant_unknown: Array<{ restaurant: string; count: number }>
  most_requested: Array<{ food_name: string; times_used: number; priority_score?: number }>
  longest_waiting: Array<{ food_name: string; waiting_days: number; priority_score?: number }>
  priority_queue: Array<{ food_name: string; priority_score: number; times_requested: number }>
  waiting_days_avg: number
  pending_review: number
}

export interface SearchV2Context {
  recentFoods?: Array<{ id: string; name: string; store?: string }>
  favorites?: Array<{ id: string; name: string; store?: string }>
  /** Photo pipeline — guard candidates by visual category */
  visual_category?: import('@/lib/nutrition/food-category-guard').FoodCategory
  photo_mode?: boolean
}
