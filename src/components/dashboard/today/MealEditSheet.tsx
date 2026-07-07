'use client'

import { useMemo } from 'react'
import type { FoodLogEntry } from '@/lib/banks/types'
import UnifiedPortionSheet from '@/components/dashboard/today/UnifiedPortionSheet'
import type { HomeCookedMealDraft } from '@/lib/nutrition/home-cooked'
import type { ManualNutritionInput } from '@/lib/nutrition/unknown-food-flow'
import { resolvePortionContextFromLog } from '@/lib/nutrition/p0-common-foods/portion-context'

interface Props {
  open: boolean
  log: FoodLogEntry | null
  onClose: () => void
  onHomeCookedSave: (logId: string, draft: HomeCookedMealDraft) => void
  onManualSave: (logId: string, input: ManualNutritionInput) => void
  onFoodRecordSave: (logId: string, item: CommonFoodItem, draft: FoodRecordDraft) => void
}

export default function MealEditSheet({
  open,
  log,
  onClose,
  onHomeCookedSave,
  onManualSave,
  onFoodRecordSave,
}: Props) {
  const initialManual = useMemo(
    () =>
      log
        ? {
            calories: log.calories,
            protein_g: log.protein_g,
            fat_g: log.fat_g,
            carbs_g: log.carbs_g,
          }
        : undefined,
    [log?.id, log?.calories, log?.protein_g, log?.fat_g, log?.carbs_g]
  )

  if (!log) return null

  const mealLabel = log.display_label ?? log.name

  return (
    <UnifiedPortionSheet
      key={log.id}
      open={open}
      mealLabel={mealLabel}
      log={log}
      title="修正餐點"
      subtitle="調整份量或營養數字，BetterBit 會重新計算今天狀態。"
      saveLabel="儲存修正"
      initialManual={initialManual}
      onClose={onClose}
      onFoodRecordSave={(item, draft) => {
        onFoodRecordSave(log.id, item, draft)
        onClose()
      }}
      onHomeCookedSave={draft => {
        onHomeCookedSave(log.id, draft)
        onClose()
      }}
      onManualSave={input => {
        onManualSave(log.id, input)
        onClose()
      }}
    />
  )
}
