import type { FoodLogEntry } from '@/lib/banks/types'
import { isNutritionPendingConfirmation } from '@/lib/nutrition/food-log-display'

export const MEAL_STATUS_PENDING = '待確認'
export const MEAL_STATUS_LOGGED = '已記錄'
export const MEAL_STATUS_RECOMMENDATION = '推薦中 · 尚未記錄'

export const SOURCE_OFFICIAL = '官方資料'
export const SOURCE_AI_ESTIMATE = 'AI 估算'
export const SOURCE_MANUAL = '手動記錄'
export const SOURCE_DATABASE = '資料庫估算'
export const SOURCE_ESTIMATE = '估算'

export type MealTrustTone = 'pending' | 'official' | 'manual' | 'estimate' | 'neutral'

export interface MealTrustDisplay {
  statusLabel: string
  sourceLabel: string | null
  isPending: boolean
  tone: MealTrustTone
}

type TrustLog = Pick<
  FoodLogEntry,
  'nutrition_status' | 'calories' | 'protein_g' | 'source' | 'nutrition_confidence' | 'capture_status'
>

export function resolveNutritionSourceLabel(log: TrustLog): string | null {
  if (log.nutrition_status === 'auto_resolved') return SOURCE_ESTIMATE
  if (log.nutrition_status === 'official' || log.nutrition_status === 'verified') return SOURCE_OFFICIAL
  if (log.nutrition_confidence === 'A' || log.nutrition_confidence === 'B') return SOURCE_OFFICIAL
  if (log.nutrition_status === 'user_entered') return SOURCE_MANUAL
  if (log.source === 'photo' && log.capture_status !== 'resolved') return SOURCE_AI_ESTIMATE
  if (log.nutrition_status === 'estimated' || log.nutrition_status === 'auto_resolved') return SOURCE_ESTIMATE
  if (log.source === 'search' || log.source === 'dice' || log.source === 'frequent') return SOURCE_DATABASE
  if (log.source === 'photo') return SOURCE_AI_ESTIMATE
  return SOURCE_ESTIMATE
}

export function getMealTrustDisplay(log: TrustLog): MealTrustDisplay {
  if (isNutritionPendingConfirmation(log)) {
    return {
      statusLabel: MEAL_STATUS_PENDING,
      sourceLabel: null,
      isPending: true,
      tone: 'pending',
    }
  }

  const sourceLabel = resolveNutritionSourceLabel(log)
  const tone: MealTrustTone =
    sourceLabel === SOURCE_OFFICIAL
      ? 'official'
      : sourceLabel === SOURCE_MANUAL
        ? 'manual'
        : sourceLabel === SOURCE_ESTIMATE || sourceLabel === SOURCE_AI_ESTIMATE
          ? 'estimate'
          : 'neutral'

  return {
    statusLabel: MEAL_STATUS_LOGGED,
    sourceLabel,
    isPending: false,
    tone,
  }
}
