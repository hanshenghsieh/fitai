export type Gender = 'male' | 'female' | 'other'
export type City =
  | '台北' | '新北' | '桃園' | '新竹' | '台中' | '台南' | '高雄'
  | '基隆' | '嘉義' | '彰化' | '屏東' | '宜蘭' | '花蓮' | '台東' | '苗栗' | '南投' | '雲林' | '澎湖' | '金門'

export type Segment =
  | 'office_worker' | 'mother' | 'student' | 'night_nurse' | 'entrepreneur'
  | 'factory_worker' | 'sales' | 'engineer' | 'teacher' | 'driver'
  | 'freelancer' | 'unemployed' | 'retired' | 'food_service' | 'medical_anxiety'

export type Competitor =
  | 'chatgpt' | 'myfitnesspal' | 'noom' | 'apple_health' | 'xiaohongshu'
  | 'threads' | 'youtube' | 'dietician' | 'gym_coach' | 'ozempic' | 'clinic'
  | 'friends' | 'family' | 'nothing'

export type Outcome =
  | 'active' | 'ghost' | 'quit' | 'subscribed' | 'refunded' | 'churned_sub'
  | 'returned' | 'never_activated'

export interface Human {
  id: number
  name: string
  age: number
  gender: Gender
  income_monthly_ntd: number
  occupation: string
  education: string
  relationship: string
  children: number
  city: City
  segment: Segment
  weight_kg: number
  body_fat_pct: number
  goal: string
  personality: string[]
  discipline: number // 1-10
  stress: number // 1-10
  sleep_quality: number // 1-10
  work_schedule: 'standard' | 'shift' | 'irregular'
  exercise_habits: string
  food_prefs: string
  emotional_eating: string
  social_env: string
  tech_ability: number // 1-10
  diet_history: string
  financial: string
  mental_model: string
  motivation: string
  fear: string
  weaknesses: string[]
  daily_routine: string
  life_events_pool: string[]
  friends_influence: string
  family_influence: string
  social_media_influence: string
}

export interface DayState {
  day: number
  active: boolean
  trust: number
  confusion: number
  stress: number
  adherence: number
  emotional: string
  competitor_considered?: Competitor
  life_event?: string
}

export interface HumanResult {
  human: Human
  outcome: Outcome
  quit_day: number | null
  subscribed_day: number | null
  refund_day: number | null
  return_day: number | null
  d1: boolean
  d3: boolean
  d7: boolean
  d14: boolean
  d30: boolean
  d60: boolean
  d90: boolean
  d180: boolean
  trust_d180: number
  would_recommend: boolean
  would_pay_again: boolean
  dropout_reason: string
  competitor_switch: Competitor | null
  diary: string[]
  complaints: string[]
  delights: string[]
  spouse_said: string
  coworker_said: string
  threads_post: string
  xhs_post: string
  self_talk: string
}

export interface ProductAssumptions {
  iteration: number
  trial_days: number
  price_ntd: number
  has_meal_trust: boolean
  has_plateau_story: boolean
  has_night_shift_fix: boolean
  has_home_cook_mode: boolean
  has_life_event_recovery: boolean
  has_d3_mini_win: boolean
  dice_diversity: number // 0-1
  onboarding_friction: number // 0-1 lower better
  /** 進度／目標可見：還差多少、時間軸、脂肪銀行（Phase 10 Progress reassurance） */
  has_goal_visibility?: boolean
  /** 同店組合、菜系合理（store-menu-plausibility） */
  has_plausible_meals?: boolean
  /** 菜品圖準確、不錯圖 */
  has_food_photo_accuracy?: boolean
  /** Today 頁 luxury wellness 視覺重構 */
  has_luxury_today_ui?: boolean
  /** 拍照優先食物紀錄 — 不用填熱量/份量 */
  has_photo_food_capture?: boolean
}

export interface SimAggregate {
  n: number
  d1: number
  d3: number
  d7: number
  d14: number
  d30: number
  d60: number
  d90: number
  d180: number
  subscribed: number
  refunded: number
  would_recommend: number
  would_pay_again: number
  complaint_counts: Map<string, number>
  delight_counts: Map<string, number>
  dropout_counts: Map<string, number>
  competitor_counts: Map<Competitor, number>
  results: HumanResult[]
}
