import { PersonStanding, Footprints, Bike, Waves, Dumbbell, Sparkles, Trophy, Flower2, HeartPulse, type LucideIcon } from 'lucide-react'
import type { ActivityType } from '@/types'
import { resolveActivityCatalogEntry, type ActivityCategory } from '@/lib/exercise/activity-catalog'

export const ACTIVITY_TYPE_ICON: Record<ActivityType, LucideIcon> = {
  walking: Footprints,
  running: PersonStanding,
  cycling: Bike,
  swimming: Waves,
  strength_training: Dumbbell,
  other: Sparkles,
}

const ACTIVITY_CATEGORY_ICON: Record<ActivityCategory, LucideIcon> = {
  cardio: HeartPulse,
  strength: Dumbbell,
  flexibility: Flower2,
  sport: Trophy,
  daily: Footprints,
}

/** For a catalog-matched custom activity, re-resolve at render time to pick a category-appropriate icon rather than storing one. */
export function iconForExerciseLog(log: { activity_type: ActivityType; activity_name: string | null; activity_label: string | null; intensity: string | null }): LucideIcon {
  if (log.activity_type !== 'other') return ACTIVITY_TYPE_ICON[log.activity_type]
  if (log.intensity) return Sparkles
  const match = resolveActivityCatalogEntry(log.activity_name ?? log.activity_label ?? '')
  return match ? ACTIVITY_CATEGORY_ICON[match.category] : Sparkles
}
