import type { LucideIcon } from 'lucide-react'
import {
  Apple,
  Bed,
  Beef,
  BrainCircuit,
  CalendarDays,
  ChartSpline,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleX,
  Coffee,
  CookingPot,
  Droplet,
  Dumbbell,
  Flag,
  Flame,
  Footprints,
  Gauge,
  GlassWater,
  HeartPulse,
  Moon,
  Scale,
  Soup,
  Sparkles,
  Target,
  TrendingUp,
  TriangleAlert,
  Trophy,
  Utensils,
  Wheat,
} from 'lucide-react'
import type { BBIconName } from './types'

export const BB_ICON_REGISTRY: Record<BBIconName, LucideIcon> = {
  calories: Flame,
  protein: Beef,
  carbs: Wheat,
  fat: Droplet,
  water: GlassWater,
  workout: Dumbbell,
  cardio: HeartPulse,
  sleep: Moon,
  weight: Scale,
  progress: TrendingUp,
  target: Target,
  best: Trophy,
  needImprove: TriangleAlert,
  meal: Utensils,
  breakfast: Coffee,
  lunch: Soup,
  dinner: CookingPot,
  snack: Apple,
  neat: Footprints,
  rest: Bed,
  recommendation: Sparkles,
  ai: BrainCircuit,
  analysis: ChartSpline,
  challenge: Flag,
  calendar: CalendarDays,
  weekScore: Gauge,
  success: CircleCheck,
  warning: CircleAlert,
  error: CircleX,
  neutral: Circle,
}

/** Meal / workout strategy slot → icon */
export const MEAL_SLOT_ICON: Record<'breakfast' | 'lunch' | 'dinner' | 'snack', BBIconName> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
  snack: 'snack',
}

export const WORKOUT_TYPE_ICON: Record<'strength' | 'cardio' | 'neat' | 'rest', BBIconName> = {
  strength: 'workout',
  cardio: 'cardio',
  neat: 'neat',
  rest: 'rest',
}

/** Coach insight card icon keys */
export const INSIGHT_ICON_MAP = {
  trend: 'progress',
  droplet: 'protein',
  check: 'success',
  workout: 'workout',
  water: 'water',
} as const satisfies Record<string, BBIconName>

export function scoreSignalIcon(signal: 'green' | 'yellow' | 'red' | 'neutral'): BBIconName {
  if (signal === 'green') return 'success'
  if (signal === 'yellow') return 'warning'
  if (signal === 'red') return 'error'
  return 'neutral'
}

export function dietScoreIcon(signal: 'green' | 'yellow' | 'red'): BBIconName {
  if (signal === 'green') return 'success'
  if (signal === 'yellow') return 'warning'
  return 'error'
}
