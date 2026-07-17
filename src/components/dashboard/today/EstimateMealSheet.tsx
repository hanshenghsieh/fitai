'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import AppOverlay from '@/components/ui/AppOverlay'
import FoodTypePortionSheet from '@/components/dashboard/today/FoodTypePortionSheet'
import { FOOD_TYPE_LABELS } from '@/lib/nutrition/food-type-ui'
import { defaultFoodRecordDraft } from '@/lib/nutrition/p0-common-foods/calculate'
import type { CommonFoodItem, FoodType } from '@/lib/nutrition/p0-common-foods/types'
import { getNutritionDayKey } from '@/lib/timezone'

const font = 'var(--font-noto-tc), system-ui, sans-serif'

interface Props {
  open: boolean
  targetDate: string
  query: string
  onClose: () => void
  onSave: (item: CommonFoodItem, draft: import('@/lib/nutrition/p0-common-foods/types').FoodRecordDraft) => void
}

const FOOD_TYPES: FoodType[] = ['meal', 'ingredient', 'staple', 'sauce', 'drink', 'snack']

function syntheticItem(name: string, foodType: FoodType): CommonFoodItem {
  return {
    id: `user-custom-${Date.now()}`,
    name,
    category: '自訂估算',
    foodType,
    sourceType: 'user_custom',
    aliases: [name],
    tags: [],
    defaultServing: { amount: 150, unit: foodType === 'drink' ? 'ml' : 'g' },
    servingOptions: [
      { label: '小份', amount: 100, unit: foodType === 'drink' ? 'ml' : 'g' },
      { label: '一般', amount: 150, unit: foodType === 'drink' ? 'ml' : 'g' },
      { label: '大份', amount: 220, unit: foodType === 'drink' ? 'ml' : 'g' },
      { label: '自訂', amount: null, unit: foodType === 'drink' ? 'ml' : 'g' },
    ],
    baseAmount: 100,
    baseUnit: foodType === 'drink' ? 'ml' : 'g',
    kcalBase: 200,
    proteinBase_g: 8,
    fatBase_g: 8,
    carbsBase_g: 20,
    sodiumBase_mg: 300,
    smallAmount: 100,
    normalAmount: 150,
    largeAmount: 220,
    defaultUnit: foodType === 'drink' ? 'ml' : 'g',
    kcalDefault: 300,
    proteinDefault_g: 12,
    fatDefault_g: 12,
    carbsDefault_g: 30,
    sodiumDefault_mg: 450,
    supportsOilOptions: foodType === 'ingredient',
    supportsCookingMethod: foodType === 'ingredient',
    supportsSauce: foodType === 'meal' || foodType === 'ingredient',
    supportsRiceAmount: foodType === 'meal',
    supportsSugarLevel: foodType === 'drink',
    supportsToppings: foodType === 'drink',
  }
}

export default function EstimateMealSheet({ open, targetDate, query, onClose, onSave }: Props) {
  const [foodType, setFoodType] = useState<FoodType>('staple')
  const [step, setStep] = useState<'type' | 'portion'>('type')

  const item = useMemo(() => syntheticItem(query.trim(), foodType), [query, foodType])
  const dateLabel = targetDate === getNutritionDayKey() ? '今日' : '所選日期'

  if (!open) return null

  if (step === 'portion') {
    return (
      <FoodTypePortionSheet
        open
        item={item}
        title="建立估算餐點"
        subtitle={`這次紀錄只會留在${dateLabel}，不會改動資料庫。`}
        saveLabel={`加入${dateLabel}紀錄`}
        initialDraft={defaultFoodRecordDraft(item)}
        onClose={() => setStep('type')}
        onSave={(draft, _n) => {
          onSave(item, { ...draft, sourceType: 'user_custom' })
          setStep('type')
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
            選擇類型，我們會顯示對應欄位
          </p>
          <div className="flex flex-wrap gap-2">
            {FOOD_TYPES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setFoodType(t)}
                className="px-3.5 h-10 rounded-full text-[14px]"
                style={{
                  backgroundColor: foodType === t ? BB_V2.accent.orange : BB_V2.bg.canvas,
                  color: foodType === t ? '#FFF' : BB_V2.text.secondary,
                  fontWeight: foodType === t ? 600 : 400,
                }}
              >
                {FOOD_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep('portion')}
            className="w-full h-14 rounded-[22px] text-[15px] mt-4"
            style={{ backgroundColor: BB_V2.accent.orange, color: '#FFF', fontWeight: 500 }}
          >
            下一步
          </button>
        </div>
      </div>
    </AppOverlay>
  )
}
