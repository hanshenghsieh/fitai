'use client'

import { Camera, ClipboardList, RefreshCw } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'

export type TodayPrimaryAction = 'record-first' | 'record-meal' | 'recommend-meal'

interface Props {
  primaryAction: TodayPrimaryAction
  primaryLoading?: boolean
  primaryDisabled?: boolean
  rerollDisabled?: boolean
  textPhotoDisabled?: boolean
  onPrimary: () => void
  onTextLog: () => void
  onPhotoLog: () => void
  onReroll: () => void
  showReroll?: boolean
}

const primaryLabels: Record<TodayPrimaryAction, string> = {
  'record-first': '記錄第一餐',
  'record-meal': '記錄這餐',
  'recommend-meal': '幫我推薦下一餐',
}

export default function TodayMealActions({
  primaryAction,
  primaryLoading = false,
  primaryDisabled = false,
  rerollDisabled = false,
  textPhotoDisabled = false,
  onPrimary,
  onTextLog,
  onPhotoLog,
  onReroll,
  showReroll = true,
}: Props) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={primaryLoading || primaryDisabled}
        onClick={onPrimary}
        className="w-full h-14 rounded-[22px] text-[16px] disabled:opacity-40 touch-manipulation active:scale-[0.99] transition-transform"
        style={{ backgroundColor: BB_V2.accent.orange, color: '#FFFFFF', fontWeight: 600 }}
      >
        {primaryLoading ? '處理中…' : primaryLabels[primaryAction]}
      </button>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={textPhotoDisabled}
          onClick={onTextLog}
          className="flex-1 h-11 rounded-[18px] text-[13px] flex items-center justify-center gap-1.5 disabled:opacity-40 touch-manipulation"
          style={{ backgroundColor: BB_V2.bg.pill, color: BB_V2.text.primary, fontWeight: 500 }}
        >
          <ClipboardList className="h-4 w-4" strokeWidth={BB_V2.iconStroke} />
          文字記錄
        </button>
        <button
          type="button"
          disabled={textPhotoDisabled}
          onClick={onPhotoLog}
          className="flex-1 h-11 rounded-[18px] text-[13px] flex items-center justify-center gap-1.5 disabled:opacity-40 touch-manipulation"
          style={{ backgroundColor: BB_V2.bg.pill, color: BB_V2.text.primary, fontWeight: 500 }}
        >
          <Camera className="h-4 w-4" strokeWidth={BB_V2.iconStroke} />
          拍照記錄
        </button>
        {showReroll ? (
          <button
            type="button"
            disabled={rerollDisabled}
            onClick={onReroll}
            className="flex-1 h-11 rounded-[18px] text-[13px] flex items-center justify-center gap-1.5 disabled:opacity-40 touch-manipulation"
            style={{ backgroundColor: BB_V2.bg.pill, color: BB_V2.text.primary, fontWeight: 500 }}
          >
            <RefreshCw className="h-4 w-4" strokeWidth={BB_V2.iconStroke} />
            換推薦
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function resolveTodayPrimaryAction(input: {
  hasAnyFoodLogs: boolean
  hasDicePreview: boolean
}): TodayPrimaryAction {
  if (input.hasDicePreview) return 'record-meal'
  if (!input.hasAnyFoodLogs) return 'record-first'
  return 'recommend-meal'
}
