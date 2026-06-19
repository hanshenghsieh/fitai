import type { GoalType } from '@/types'

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  lose_fat: '減脂',
  lose_weight: '減重',
  gain_muscle: '增肌',
  maintain: '維持體態',
  body_recomp: '體態重組',
}

export function getGoalTypeLabel(goalType: string): string {
  return GOAL_TYPE_LABELS[goalType as GoalType] ?? goalType
}
