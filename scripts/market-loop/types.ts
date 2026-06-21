export type Gender = 'male' | 'female' | 'nonbinary'
export type City =
  | '台北' | '新北' | '桃園' | '新竹' | '台中' | '台南' | '高雄'
  | '基隆' | '嘉義' | '彰化' | '屏東' | '宜蘭' | '苗栗' | '南投'

export type Segment =
  | 'office_woman' | 'office_man' | 'engineer' | 'sales' | 'mother'
  | 'night_nurse' | 'teacher' | 'student' | 'freelancer' | 'factory_worker'
  | 'business_traveler' | 'postpartum' | 'emotional_eater' | 'data_lover'
  | 'tracking_hater' | 'high_income_pro' | 'low_income_worker'

export type Competitor =
  | 'chatgpt' | 'myfitnesspal' | 'noom' | 'apple_health' | 'google'
  | 'xiaohongshu' | 'threads' | 'instagram' | 'youtube' | 'dietician'
  | 'gym_coach' | 'ozempic' | 'clinic' | 'nothing'

export type Outcome =
  | 'active' | 'ghost' | 'quit' | 'subscribed' | 'refunded' | 'churned_sub'
  | 'returned' | 'never_activated'

export interface BigFive {
  openness: number
  conscientiousness: number
  extraversion: number
  agreeableness: number
  neuroticism: number
}

export interface CharacterCard {
  id: number
  name: string
  age: number
  gender: Gender
  city: City
  income_monthly_ntd: number
  occupation: string
  education: string
  relationship: string
  children: number
  height_cm: number
  weight_kg: number
  body_fat_pct: number
  bmi: number
  goal: string
  timeline: string
  work_schedule: 'standard' | 'shift' | 'irregular' | 'travel_heavy'
  sleep_pattern: string
  stress_level: number
  exercise_habit: string
  diet_habit: string
  eating_weakness: string
  emotional_eating: number
  self_discipline: number
  technology_literacy: number
  previous_diet_failures: string
  app_fatigue: number
  payment_willingness: number
  trust_level: number
  personality: string
  big_five: BigFive
  daily_routine: string
  social_influence: string
  competitor_preference: Competitor
  life_constraints: string
  unique_quote: string
  segment: Segment
}

export interface ProductModel {
  version: string
  trial_days: number
  price_ntd: number
  has_adherence_engine: boolean
  has_meal_trust: boolean
  has_plateau_story: boolean
  has_night_shift_timeline: boolean
  has_dice_variants: boolean
  has_health_sync: boolean
  has_photo_log: boolean
  onboarding_steps: number
  onboarding_friction: number
  dice_diversity: number
  paywall_blocks_progress: boolean
  has_early_win: boolean
  has_value_framing: boolean
  has_quick_log: boolean
  has_family_meal: boolean
  has_first_run_guide: boolean
  /** Phase 10.1 — hero Today, quiet trial, 3-tab nav, 更多記錄 sheet */
  has_premium_today_ui: boolean
  /** Phase 10.2 — journal Week timeline, 2-tap reflection, no stats grid */
  has_premium_week_ui: boolean
  /** Phase 10.3 — reassurance Progress, single trend, no dashboard metrics */
  has_premium_progress_ui: boolean
  /** Phase 10.4 — trust Settings, linear sparse, premium health sync copy */
  has_premium_settings_ui: boolean
  /** Phase 10.5 — invitation Premium, feelings not features, gentle trial */
  has_premium_invitation_ui: boolean
  /** Progress: 目標距離、脂肪銀行、平台期 — 有進度感但不變儀表板 */
  has_goal_visibility: boolean
}

export interface SimMetrics {
  first_impression: number
  confusion: number
  trust: number
  friction: number
  emotional_response: number
  food_input_rate: number
  photo_usage: number
  search_usage: number
  frequent_usage: number
  dice_usage: number
  adherence: number
  dropout_risk: number
  subscription_willingness: number
  refund_risk: number
}

export interface SimResult {
  character: CharacterCard
  outcome: Outcome
  milestones: Record<'d1' | 'd3' | 'd7' | 'd14' | 'd30' | 'd60' | 'd90' | 'd180', boolean>
  metrics: SimMetrics
  quit_day: number | null
  subscribed_day: number | null
  refund_day: number | null
  return_day: number | null
  competitor_switch: Competitor | null
  life_events: string[]
  complaints: string[]
  delights: string[]
  user_quotes: string[]
  dropout_reason: string
  would_recommend: boolean
  would_pay_again: boolean
}

export interface LoopAggregate {
  run_id: string
  product: ProductModel
  characters: CharacterCard[]
  results: SimResult[]
  complaint_counts: Map<string, number>
  delight_counts: Map<string, number>
  friction_counts: Map<string, number>
  trust_counts: Map<string, number>
  conversion_blockers: Map<string, number>
  retention_blockers: Map<string, number>
  competitor_counts: Map<Competitor, number>
}

export interface ExpertReview {
  role: string
  verdict: string
  attack: string
}
