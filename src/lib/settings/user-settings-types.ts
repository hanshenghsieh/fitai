/** Extended user settings stored in user_profiles.settings_preferences (jsonb) */

export type GoalPace = 'conservative' | 'standard' | 'aggressive'
export type CalorieMode = 'auto' | 'manual'
export type CalorieBankIntensity = 'gentle' | 'standard' | 'aggressive'
export type PhotoRecognitionMode = 'fast' | 'standard' | 'precise'
export type PhotoConfirmMode = 'always' | 'low_confidence' | 'auto'
export type PortionUnit = 'g' | 'serving' | 'bowl' | 'plate' | 'piece'
export type UiDensity = 'comfortable' | 'standard' | 'compact'
export type HomeFocus = 'remaining_calories' | 'protein_gap' | 'meal_suggest' | 'weight_trend'
export type NumberDisplay = 'simple' | 'detailed'
export type NutrientDisplay = 'macros' | 'macros_fiber' | 'full'
export type PrimaryFab = 'photo' | 'log_food' | 'recommend'
export type ThemeColor = 'betterbit_green' | 'fresh_green' | 'deep_forest' | 'cream_white'
export type DefaultMealSlotPref = 'auto' | 'manual' | 'meal1' | 'meal2' | 'meal3' | 'other' | 'before_sleep'

export interface NotificationSettings {
  breakfast_enabled: boolean
  breakfast_time: string
  lunch_enabled: boolean
  lunch_time: string
  dinner_enabled: boolean
  dinner_time: string
  snack_enabled: boolean
  snack_time: string
  water_enabled: boolean
  water_interval_hours: number
  weight_log_enabled: boolean
  weight_log_per_week: number
  weekly_review_enabled: boolean
  weekly_review_day: number
  weekly_review_time: string
  over_target_comfort_enabled: boolean
  in_app_enabled: boolean
  push_enabled: boolean
  email_enabled: boolean
  quiet_hours_enabled?: boolean
  quiet_hours_start?: string
  quiet_hours_end?: string
}

export interface PhotoSettings {
  recognition_mode: PhotoRecognitionMode
  confirm_mode: PhotoConfirmMode
  low_confidence_alert: boolean
  default_meal_slot: DefaultMealSlotPref
  portion_unit: PortionUnit
  portion_hint: boolean
  show_portion_picker: boolean
  prefer_brand_menu: boolean
  allow_estimate_fallback: boolean
  show_confidence: boolean
}

export interface DietSettingsExtras {
  diet_restrictions: string[]
  favorite_meal_times: string[]
  favorite_locations: string[]
  taste_preference: string
  budget_range: string
  blocked_foods: string[]
}

export interface UiSettings {
  home_focus: HomeFocus
  number_display: NumberDisplay
  nutrient_display: NutrientDisplay
  card_density: UiDensity
  primary_fab: PrimaryFab
}

export interface UserSettingsPreferences {
  location?: string
  timezone?: string
  job_activity_level?: string
  daily_activity_level?: string
  weekly_exercise_frequency?: string
  sleep_level?: string
  goal_pace?: GoalPace
  /** Canonical pace field — preferred over goal_pace */
  fat_loss_pace?: GoalPace
  calorie_mode?: CalorieMode
  manual_calorie_target?: number | null
  manual_protein_g?: number | null
  manual_carbs_g?: number | null
  manual_fat_g?: number | null
  calorie_bank_enabled?: boolean
  calorie_bank_days?: 3 | 5 | 10
  calorie_bank_intensity?: CalorieBankIntensity
  notifications?: NotificationSettings
  photo?: PhotoSettings
  diet_extras?: DietSettingsExtras
  ui?: UiSettings
  language?: string
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  breakfast_enabled: true,
  breakfast_time: '08:00',
  lunch_enabled: true,
  lunch_time: '12:00',
  dinner_enabled: true,
  dinner_time: '18:30',
  snack_enabled: false,
  snack_time: '15:30',
  water_enabled: true,
  water_interval_hours: 2,
  weight_log_enabled: true,
  weight_log_per_week: 2,
  weekly_review_enabled: true,
  weekly_review_day: 0,
  weekly_review_time: '20:00',
  over_target_comfort_enabled: true,
  in_app_enabled: true,
  push_enabled: false,
  email_enabled: false,
  quiet_hours_enabled: true,
  quiet_hours_start: '22:30',
  quiet_hours_end: '08:00',
}

export const DEFAULT_PHOTO_SETTINGS: PhotoSettings = {
  recognition_mode: 'standard',
  confirm_mode: 'low_confidence',
  low_confidence_alert: true,
  default_meal_slot: 'auto',
  portion_unit: 'serving',
  portion_hint: true,
  show_portion_picker: true,
  prefer_brand_menu: true,
  allow_estimate_fallback: true,
  show_confidence: true,
}

export const DEFAULT_UI_SETTINGS: UiSettings = {
  home_focus: 'protein_gap',
  number_display: 'detailed',
  nutrient_display: 'macros_fiber',
  card_density: 'comfortable',
  primary_fab: 'photo',
  theme_color: 'betterbit_green',
  animations_enabled: true,
  dark_mode: false,
  reduced_motion: false,
  large_text: false,
}

export function mergePreferences(
  raw: UserSettingsPreferences | null | undefined
): UserSettingsPreferences {
  return {
    ...raw,
    notifications: { ...DEFAULT_NOTIFICATION_SETTINGS, ...raw?.notifications },
    photo: { ...DEFAULT_PHOTO_SETTINGS, ...raw?.photo },
    diet_extras: {
      diet_restrictions: [],
      favorite_meal_times: [],
      favorite_locations: [],
      taste_preference: 'normal',
      budget_range: '100-200',
      blocked_foods: [],
      ...raw?.diet_extras,
    },
    ui: { ...DEFAULT_UI_SETTINGS, ...raw?.ui },
    language: raw?.language ?? 'zh-TW',
    calorie_mode: raw?.calorie_mode ?? 'auto',
    goal_pace: raw?.goal_pace ?? 'standard',
    fat_loss_pace: raw?.fat_loss_pace ?? raw?.goal_pace ?? 'standard',
    calorie_bank_enabled: raw?.calorie_bank_enabled ?? true,
    calorie_bank_days: raw?.calorie_bank_days ?? 5,
    calorie_bank_intensity: raw?.calorie_bank_intensity ?? 'standard',
    timezone: raw?.timezone ?? 'Asia/Taipei',
    location: raw?.location ?? 'TW',
  }
}
