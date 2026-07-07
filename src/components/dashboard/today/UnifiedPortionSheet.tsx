'use client'

import { useMemo } from 'react'
import type { FoodLogEntry } from '@/lib/banks/types'
import FoodTypePortionSheet from '@/components/dashboard/today/FoodTypePortionSheet'
import IngredientPortionSheet from '@/components/dashboard/today/IngredientPortionSheet'
import type { HomeCookedMealDraft } from '@/lib/nutrition/home-cooked'
import type { ManualNutritionInput } from '@/lib/nutrition/unknown-food-flow'
import { resolvePortionContextFromLabel, resolvePortionContextFromLog } from '@/lib/nutrition/p0-common-foods/portion-context'
import type { CommonFoodItem, FoodRecordDraft } from '@/lib/nutrition/p0-common-foods/types'

interface Props {
  open: boolean
  mealLabel: string
  log?: FoodLogEntry | null
  onClose: () => void
  onFoodRecordSave: (item: CommonFoodItem, draft: FoodRecordDraft) => void
  onHomeCookedSave: (draft: HomeCookedMealDraft) => void
  onManualSave?: (input: ManualNutritionInput) => void
  title?: string
  subtitle?: string
  saveLabel?: string
  cancelLabel?: string
  initialManual?: {
    calories?: number | null
    protein_g?: number | null
    fat_g?: number | null
    carbs_g?: number | null
  }
}

export default function UnifiedPortionSheet({
  open,
  mealLabel,
  log,
  onClose,
  onFoodRecordSave,
  onHomeCookedSave,
  onManualSave,
  title = '填份量算營養',
  subtitle,
  saveLabel = '儲存並計入今日',
  cancelLabel,
  initialManual,
}: Props) {
  const ctx = useMemo(
    () => (log ? resolvePortionContextFromLog(log) : resolvePortionContextFromLabel(mealLabel)),
    [log, mealLabel]
  )

  if (ctx.kind === 'p0') {
    return (
      <FoodTypePortionSheet
        open={open}
        item={ctx.item}
        title={title}
        subtitle={subtitle ?? '依資料庫估算份量、油量與烹調方式。'}
        saveLabel={saveLabel}
        initialDraft={ctx.draft}
        onClose={onClose}
        onSave={(draft, _nutrition) => onFoodRecordSave(ctx.item, draft)}
      />
    )
  }

  if (ctx.kind === 'home_cooked') {
    return (
      <IngredientPortionSheet
        open={open}
        mealLabel={ctx.label}
        title={title}
        subtitle={subtitle}
        saveLabel={saveLabel}
        cancelLabel={cancelLabel}
        initialDraft={ctx.draft}
        initialManual={initialManual}
        onClose={onClose}
        onSave={onHomeCookedSave}
        onManualSave={onManualSave}
      />
    )
  }

  return (
    <IngredientPortionSheet
      open={open}
      mealLabel={mealLabel}
      title={title}
      subtitle={subtitle}
      saveLabel={saveLabel}
      cancelLabel={cancelLabel}
      initialManual={initialManual}
      onClose={onClose}
      onSave={onHomeCookedSave}
      onManualSave={onManualSave}
    />
  )
}
