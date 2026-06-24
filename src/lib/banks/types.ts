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

export interface FoodLogEntry {
  id: string
  name: string
  store?: string
  calories: number
  protein_g: number
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
  capture_status?: 'learning' | 'resolved' | 'needs_name'
  ai_confidence_pct?: number
  /** Nutrition Accuracy v1 metadata (client check-in JSON only) */
  nutrition_accuracy_meta?: {
    accuracy_level: 'A' | 'B' | 'C' | 'D'
    source_type: string
    user_confirmed: boolean
    portion_adjustments: Record<string, unknown>
    candidate_label: string
  }
}
