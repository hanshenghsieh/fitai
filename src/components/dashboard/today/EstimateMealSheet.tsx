'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import AppOverlay from '@/components/ui/AppOverlay'
import FoodTypePortionSheet from '@/components/dashboard/today/FoodTypePortionSheet'
import { FOOD_TYPE_LABELS } from '@/lib/nutrition/food-type-ui'
import { defaultFoodRecordDraft } from '@/lib/nutrition/p0-common-foods/calculate'
import type { CommonFoodItem, FoodType } from '@/lib/nutrition/p0-common-foods/types'
import {
  classifyEstimatedFood,
  createEstimatedFoodItem,
  FOOD_TYPE_EXAMPLES,
  type SelectedEstimateMetadata,
} from '@/lib/nutrition/estimated-meal-model'
import type { FoodSearchHit } from '@/lib/food-search'
import { getNutritionDayKey } from '@/lib/timezone'

const font = 'var(--font-noto-tc), system-ui, sans-serif'

interface Props {
  open: boolean
  targetDate: string
  query: string
  selectedHit?: FoodSearchHit
  onClose: () => void
  onSave: (item: CommonFoodItem, draft: import('@/lib/nutrition/p0-common-foods/types').FoodRecordDraft) => void
}

const FOOD_TYPES: FoodType[] = ['meal', 'ingredient', 'staple', 'sauce', 'drink', 'snack']

export default function EstimateMealSheet({ open, targetDate, query, selectedHit, onClose, onSave }: Props) {
  const selectedMetadata = useMemo((): SelectedEstimateMetadata | undefined => {
    if (!selectedHit) return undefined
    return {
      canonicalName: selectedHit.name,
      category: selectedHit.canonicalCategory ?? selectedHit.store,
      foodType: selectedHit.foodType,
      sourceType: selectedHit.sourceType,
      calories: selectedHit.calories,
      protein_g: selectedHit.protein_g,
      carbs_g: selectedHit.carbs_g,
      fat_g: selectedHit.fat_g,
      aliases: selectedHit.aliases,
      dishTemplateId: selectedHit.dishTemplateId,
      dishVariantId: selectedHit.dishVariantId,
    }
  }, [selectedHit])
  const classification = useMemo(
    () => classifyEstimatedFood(query, selectedMetadata),
    [query, selectedMetadata]
  )
  const autoClassified = classification.foodType != null && classification.confidence !== 'low'
  const [foodType, setFoodType] = useState<FoodType | null>(() => classification.foodType)
  const [manualOverride, setManualOverride] = useState(false)
  const [step, setStep] = useState<'type' | 'portion'>(() => autoClassified ? 'portion' : 'type')
  const item = useMemo(
    () => foodType ? createEstimatedFoodItem(query.trim(), classification, manualOverride ? foodType : undefined) : null,
    [query, classification, foodType, manualOverride]
  )
  const dateLabel = targetDate === getNutritionDayKey() ? '今日' : '所選日期'

  if (!open) return null

  if (step === 'portion' && item && foodType) {
    const contextLabel = manualOverride
      ? `${FOOD_TYPE_LABELS[foodType]}・手動選擇`
      : `${FOOD_TYPE_LABELS[foodType]}・${classification.familyLabel}・${
          selectedHit ? '已選搜尋結果' : '系統估算'
        }`
    return (
      <FoodTypePortionSheet
        open
        item={item}
        title={selectedHit ? '確認餐點份量' : '建立估算餐點'}
        subtitle={`這次紀錄只會留在${dateLabel}，不會改動資料庫。`}
        contextLabel={contextLabel}
        onEditType={() => {
          setManualOverride(true)
          setStep('type')
        }}
        saveLabel={`加入${dateLabel}紀錄`}
        initialDraft={defaultFoodRecordDraft(item)}
        onClose={() => {
          if (manualOverride || !autoClassified) setStep('type')
          else onClose()
        }}
        onSave={draft => {
          onSave(item, { ...draft, sourceType: item.sourceType })
        }}
      />
    )
  }

  return (
    <AppOverlay open={open} onClose={onClose} variant="sheet">
      <div
        data-target-date={targetDate}
        className="ios-bottom-sheet max-w-lg mx-auto w-full"
        style={{
          fontFamily: font,
          backgroundColor: BB_V2.bg.card,
          borderRadius: '28px 28px 0 0',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 flex items-start justify-between">
          <div>
            <h2 className="text-[20px] font-bold" style={{ color: BB_V2.text.primary }}>
              建立估算餐點
            </h2>
            <p className="text-[14px] mt-2" style={{ color: BB_V2.text.secondary }}>
              {query.trim()}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="關閉">
            <X className="h-5 w-5" style={{ color: BB_V2.text.secondary }} />
          </button>
        </div>
        <div className="px-5 pb-5 space-y-3">
          <p className="text-[13px]" style={{ color: BB_V2.text.secondary }}>
            無法可靠判定時才需要選擇。選擇後會立即套用對應份量與估算模型。
          </p>
          <div className="grid grid-cols-1 gap-2">
            {FOOD_TYPES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setFoodType(t)
                  setManualOverride(true)
                }}
                className="px-4 py-3 rounded-2xl text-left"
                style={{
                  backgroundColor: foodType === t ? BB_V2.accent.orange : BB_V2.bg.canvas,
                  color: foodType === t ? '#FFF' : BB_V2.text.secondary,
                  fontWeight: foodType === t ? 600 : 400,
                }}
              >
                <span className="block text-[14px]">{FOOD_TYPE_LABELS[t]}</span>
                <span
                  className="block text-[12px] mt-0.5"
                  style={{ color: foodType === t ? 'rgba(255,255,255,0.82)' : BB_V2.text.secondary }}
                >
                  {FOOD_TYPE_EXAMPLES[t]}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!foodType}
            onClick={() => {
              if (foodType) setStep('portion')
            }}
            className="w-full h-14 rounded-[22px] text-[15px] mt-4"
            style={{
              backgroundColor: foodType ? BB_V2.accent.orange : BB_V2.bg.canvas,
              color: foodType ? '#FFF' : BB_V2.text.secondary,
              fontWeight: 500,
            }}
          >
            套用類型並查看估算
          </button>
        </div>
      </div>
    </AppOverlay>
  )
}
