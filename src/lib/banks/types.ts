/** BetterBit OS — internal bank state (NASA inside) */

export interface CalorieBank {
  dailyPaceKcal: number
  todayTargetKcal: number
  todayLoggedKcal: number
  /** Positive = under internal pace */
  runningBalanceKcal: number
  totalBudgetKcal: number
  daysRemaining: number
}

export interface ProteinBank {
  dailyTargetG: number
  todayLoggedG: number
  gapG: number
}

export interface ExerciseBank {
  weeklyTargetSessions: number
  completedSessions: number
  remainingSessions: number
}

export interface UserBanks {
  calorie: CalorieBank
  protein: ProteinBank
  exercise: ExerciseBank
}

export type FoodNutritionStatus =
  | 'official'
  | 'verified'
  | 'user_entered'
  | 'auto_resolved'
  | 'pending_review'
  | 'pending_confirmation'
  | 'estimated_pending_confirmation'
  | 'unknown'

export interface AutoResolvedMeta {
  matched_item_id: string
  matched_item_name: string
  match_score: number
  source_type: string
  source_name: string
  source_url: string
  auto_resolved_at: string
  auto_resolved_by: 'betterbit_system'
  previous_status: 'unknown' | 'pending_review'
  rollback_token: string
}

export interface UserNutritionMeta {
  source_type: 'user_input'
  portion?: string
  notes?: string
  source_note?: string
  entered_at: string
  partial?: boolean
  fiber_g?: number
  sugar_g?: number
  sodium_mg?: number
}

export interface FoodLogEntry {
  id: string
  name: string
  store?: string
  calories: number | null
  protein_g: number | null
  carbs_g?: number
  fat_g?: number
  confidence?: 'high' | 'medium' | 'low'
  slot?: import('@/lib/food-slots').FoodSlot
  logged_at: string
  user_declared: true
  source: 'search' | 'dice' | 'plan' | 'free_text' | 'photo' | 'frequent'
  /** User-captured meal photo (data URL) */
  photo_data_url?: string
  /** Background AI still processing */
  learning?: boolean
  /** AI confidence too low — name-only fallback */
  needs_name?: boolean
  /** Seen ≥2 times in Food DNA cluster */
  community_verified?: boolean
  /** UI category for fixed image pool — not used to search images */
  imageCategory?: import('@/lib/food-image-system').ImageCategory
  capture_status?: 'learning' | 'resolved' | 'needs_name' | 'photo_only'
  nutrition_status?: FoodNutritionStatus | 'estimated'
  nutrition_confidence?: 'A' | 'B' | 'C' | 'Unknown' | 'user_confirmed'
  user_nutrition_meta?: UserNutritionMeta
  auto_resolved_meta?: AutoResolvedMeta
  /** Beta V1 silent auto apply explanation shown in meal detail */
  resolution_note?: string
  ai_confidence_pct?: number
  /** Nutrition Accuracy v1 metadata (client check-in JSON only) */
  nutrition_accuracy_meta?: {
    accuracy_level: 'A' | 'B' | 'C' | 'D' | 'Unknown'
    source_type: string
    user_confirmed: boolean
    portion_adjustments: Record<string, unknown>
    candidate_label: string
  }
}
