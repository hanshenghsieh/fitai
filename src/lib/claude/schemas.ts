import { z } from 'zod'

const MealItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  name_zh: z.string(),
  calories: z.number().min(0).max(2000),
  protein_g: z.number().min(0),
  carbs_g: z.number().min(0),
  fat_g: z.number().min(0),
  portion: z.string(),
  preparation: z.string(),
})

const DailyMealSchema = z.object({
  type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  type_zh: z.string(),
  items: z.array(MealItemSchema).min(1),
  total_calories: z.number().min(0),
})

const WorkoutSetSchema = z.object({
  exercise_id: z.string(),
  exercise_name: z.string(),
  exercise_name_zh: z.string(),
  youtube_id: z.string().nullable(),
  sets: z.number().int().min(1).max(10),
  reps: z.number().int().min(1).max(100).nullable(),
  duration_secs: z.number().int().min(5).max(3600).nullable(),
  rest_secs: z.number().int().min(0).max(300),
  notes: z.string(),
})

const DailyWorkoutSchema = z.object({
  type: z.enum(['strength', 'cardio', 'flexibility', 'rest', 'active_recovery']),
  type_zh: z.string(),
  warmup: z.array(WorkoutSetSchema),
  main: z.array(WorkoutSetSchema),
  cooldown: z.array(WorkoutSetSchema),
  estimated_duration_mins: z.number().min(0).max(180),
  calories_burned_est: z.number().min(0),
})

const DayPlanSchema = z.object({
  day: z.number().int().min(1).max(7),
  date: z.string(),
  meals: z.array(DailyMealSchema).min(3).max(5),
  workout: DailyWorkoutSchema,
  daily_targets: z.object({
    calories: z.number().min(1000).max(5000),
    protein_g: z.number().min(50).max(500),
    carbs_g: z.number().min(50).max(600),
    fat_g: z.number().min(20).max(200),
    water_ml: z.number().min(1500).max(5000),
  }),
})

export const WeeklyPlanSchema = z.object({
  week_number: z.number().int().min(1),
  weekly_targets: z.object({
    avg_daily_calories: z.number().min(1000).max(5000),
    avg_daily_protein_g: z.number().min(50).max(500),
    workout_days: z.number().int().min(0).max(7),
  }),
  days: z.array(DayPlanSchema).length(7),
  grocery_list: z.array(z.object({
    category: z.string(),
    items: z.array(z.string()),
  })),
  coach_note: z.string().max(1000),
})

export type WeeklyPlanOutput = z.infer<typeof WeeklyPlanSchema>

export const InBodyParseSchema = z.object({
  weight_kg: z.number().nullable(),
  body_fat_pct: z.number().nullable(),
  muscle_mass_kg: z.number().nullable(),
  bmi: z.number().nullable(),
  waist_cm: z.number().nullable(),
  visceral_fat_level: z.number().nullable(),
  basal_metabolic_rate: z.number().nullable(),
  confidence: z.enum(['high', 'medium', 'low']),
  raw_values: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
})

export const FoodPhotoParseSchema = z.object({
  items: z.array(z.object({
    name: z.string(),
    portion: z.string().optional(),
    confidence: z.enum(['high', 'medium', 'low']),
  })).min(1).max(8),
  meal_summary: z.string().optional(),
})
