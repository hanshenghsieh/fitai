'use client'

import { Camera, ClipboardList, Sparkles, X } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import AppOverlay from '@/components/ui/AppOverlay'
import {
  dispatchOpenPhotoSheet,
  dispatchOpenTextLogSheet,
  dispatchRollDice,
  targetMealSlotForFoodSlot,
  type FoodCaptureContext,
} from '@/lib/today-actions'
import type { FoodSlot } from '@/lib/food-slots'
import { getNutritionDayKey } from '@/lib/timezone'
import { traceRecordDate } from '@/lib/record-date-trace'

interface Props {
  open: boolean
  onClose: () => void
  targetDate: string
  targetSlot?: FoodSlot
  captureSource: 'record' | 'global'
}

const actions = [
  {
    id: 'photo',
    icon: Camera,
    title: '拍照記錄',
    description: '拍今天吃的，自動估算熱量',
    onSelect: dispatchOpenPhotoSheet,
  },
  {
    id: 'text',
    icon: ClipboardList,
    title: '文字記錄',
    description: '搜尋或輸入餐點名稱',
    onSelect: dispatchOpenTextLogSheet,
  },
  {
    id: 'recommend',
    icon: Sparkles,
    title: '不知道吃什麼',
    description: '依剩餘熱量推薦下一餐',
    onSelect: dispatchRollDice,
  },
] as const

export default function RecordActionSheet({
  open,
  onClose,
  targetDate,
  targetSlot,
  captureSource,
}: Props) {
  const targetMealSlot = targetMealSlotForFoodSlot(targetSlot)

  function handleSelect(onSelect: (context: FoodCaptureContext) => void) {
    traceRecordDate('record-action-sheet-select', {
      targetDate,
      targetMealSlot,
    })
    onSelect({ targetDate, targetMealSlot, source: captureSource })
    onClose()
  }

  return (
    <AppOverlay open={open} onClose={onClose} variant="sheet">
      <div
        data-target-date={targetDate}
        data-target-slot={targetSlot}
        data-target-meal-slot={targetMealSlot}
        className="ios-bottom-sheet max-w-[640px] mx-auto w-full"
        style={{
          fontFamily: BB_V2.font,
          backgroundColor: BB_V2.bg.card,
          borderRadius: `${BB_V2.radius.sheet}px ${BB_V2.radius.sheet}px 0 0`,
          boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[20px] leading-tight" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
              ＋ 記錄
            </h2>
            <p className="text-[13px] mt-1" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
              選一種方式記錄{targetDate === getNutritionDayKey() ? '今天' : '這天'}的飲食
            </p>
          </div>
          <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center -mr-1 shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" aria-label="關閉">
            <X className="h-5 w-5" strokeWidth={BB_V2.iconStroke} style={{ color: BB_V2.text.secondary }} />
          </button>
        </div>

        <div className="px-5 pb-8 space-y-2">
          {actions.map(({ id, icon: Icon, title, description, onSelect }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleSelect(onSelect)}
              className="w-full flex items-center gap-4 p-4 rounded-[22px] text-left active:scale-[0.99] transition-transform touch-manipulation"
              style={{ backgroundColor: BB_V2.bg.pill }}
            >
              <span
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: BB_V2.bg.surface,
                  color: BB_V2.accent.orange,
                }}
              >
                <Icon className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
                  {title}
                </span>
                <span className="block text-[13px] mt-0.5 leading-snug" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
                  {description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </AppOverlay>
  )
}
