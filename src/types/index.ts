export type Gender = 'male' | 'female' | 'other'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced'
export type GoalType = 'lose_fat' | 'lose_weight' | 'gain_muscle' | 'maintain' | 'body_recomp'
export type FoodBudget = 'low' | 'medium' | 'high'
export type WorkoutIntensity = 'too_easy' | 'just_right' | 'too_hard'

export interface UserProfile {
  id: string
  display_name: string | null
  gender: Gender | null
  age: number | null
  height_cm: number | null
  weight_kg: number | null
  body_fat_pct: number | null
  muscle_mass_kg: number | null
  activity_level: ActivityLevel
  is_vegetarian: boolean
  is_vegan: boolean
  is_halal: boolean
  is_gluten_free: boolean
  allergens: string[]
  disliked_foods: string[]
  cuisine_preference: string
  cooking_time_mins: number
  food_budget: FoodBudget
  equipment: string[]
  injuries: string[]
  health_conditions: string[]
  fitness_level: FitnessLevel
  sleep_hours_target: number
  water_ml_target: number
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface Goal {
  id: string
  user_id: string
  goal_type: GoalType
  target_weight_kg: number | null
  target_body_fat_pct: number | null
  start_date: string
  end_date: string
  start_weight_kg: number | null
  start_body_fat_pct: number | null
  is_active: boolean
  created_at: string
}

export interface Exercise {
  id: string
  name: string
  name_zh: string
  category: string
  equipment_required: string[]
  difficulty: FitnessLevel
  youtube_id: string | null
  duration_secs: number | null
  sets_default: number | null
  reps_default: number | null
  contraindications: string[]
  instructions: string
}

// Plan data structures (stored as JSON in weekly_plans.plan_data)
export interface MealItem {
  id: string
  name: string
  name_zh: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  portion: string
  preparation: string
}

export interface DailyMeal {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  type_zh: string
  items: MealItem[]
  total_calories: number
}

export interface WorkoutSet {
  exercise_id: string
  exercise_name: string
  exercise_name_zh: string
  youtube_id: string | null
  sets: number
  reps: number | null
  duration_secs: number | null
  rest_secs: number
  notes: string
}

export interface DailyWorkout {
  type: 'strength' | 'cardio' | 'flexibility' | 'rest' | 'active_recovery'
  type_zh: string
  warmup: WorkoutSet[]
  main: WorkoutSet[]
  cooldown: WorkoutSet[]
  estimated_duration_mins: number
  calories_burned_est: number
}

export interface DayPlan {
  day: number
  date: string
  meals: DailyMeal[]
  workout: DailyWorkout
  daily_targets: {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
    water_ml: number
  }
}

export interface WeeklyPlanData {
  week_number: number
  weekly_targets: {
    avg_daily_calories: number
    avg_daily_protein_g: number
    workout_days: number
  }
  days: DayPlan[]
  grocery_list: { category: string; items: string[] }[]
  coach_note: string
}

export interface WeeklyPlan {
  id: string
  user_id: string
  week_start: string
  week_number: number
  plan_data: WeeklyPlanData
  coach_note: string
  generation_status: 'pending' | 'generating' | 'completed' | 'failed'
  previous_completion_rate: number | null
  previous_workout_rate: number | null
  created_at: string
}

// Checkin item types
export interface DietCheckinItem {
  meal_id: string
  meal_type: string
  completed: boolean
  convenience_item_id?: string
  convenience_item?: any
}

export interface WorkoutCheckinItem {
  exercise_id: string
  exercise_name: string
  completed: boolean
  actual_sets?: number
  actual_reps?: number
  weight_kg?: number
}

export interface DailyCheckin {
  id: string
  user_id: string
  checkin_date: string
  weekly_plan_id: string | null
  diet_items: DietCheckinItem[]
  workout_items: WorkoutCheckinItem[]
  water_ml: number
  sleep_hours: number | null
  energy_level: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BodyMeasurement {
  id: string
  user_id: string
  measured_at: string
  weight_kg: number | null
  body_fat_pct: number | null
  muscle_mass_kg: number | null
  waist_cm: number | null
  hip_cm: number | null
  chest_cm: number | null
  created_at: string
}

export interface WeeklyFeedback {
  id: string
  user_id: string
  week_start: string
  hardest_part: string | null
  diet_satisfaction: number | null
  workout_intensity: WorkoutIntensity | null
  had_sick_days: boolean
  had_travel: boolean
  additional_notes: string | null
}
