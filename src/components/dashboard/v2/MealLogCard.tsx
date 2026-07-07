'use client'

import { Pencil, Trash2, ChevronRight } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { FoodLogEntry } from '@/lib/banks/types'
import BBIcon from '@/components/icons/BBIcon'
import FoodPhotoThumb from '@/components/dashboard/today/FoodPhotoThumb'
import BBCard from '@/components/ui/BBCard'
import MealStatusBadge from '@/components/dashboard/today/MealStatusBadge'
import {
  formatLogCaloriesLine,
  formatLogProteinLine,
  getFoodLogDisplayLabel,
  isNutritionPendingConfirmation,
} from '@/lib/nutrition/food-log-display'
import { getMealTrustDisplay } from '@/lib/nutrition/meal-trust-display'

interface Props {
  log: FoodLogEntry
  onDelete?: () => void
  onEdit?: (log: FoodLogEntry) => void
  onConfirmNutrition?: (log: FoodLogEntry) => void
}

export default function MealLogCard({ log, onDelete, onEdit, onConfirmNutrition }: Props) {
  const hasPhoto = !!(log.photo_data_url || log.source === 'photo')
  const pending = isNutritionPendingConfirmation(log)
  const trust = getMealTrustDisplay(log)
  const clickable = pending && !!onConfirmNutrition
  const proteinLine = formatLogProteinLine(log)
  const subLine = pending
    ? null
    : [proteinLine, trust.sourceLabel].filter(Boolean).join(' · ')

  const card = (
    <BBCard padding="16px 20px" className="space-y-3">
      <div className="flex items-start gap-3">
        {hasPhoto && log.photo_data_url ? (
          <FoodPhotoThumb photo_url={log.photo_data_url} userUploadedPhoto={log.photo_data_url} size={48} radius={14} />
        ) : (
          <div
            className="shrink-0 flex items-center justify-center"
            style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: BB_V2.bg.pill }}
            aria-hidden
          >
            <BBIcon name="meal" size={22} tone="muted" />
          </div>
        )}

        <div
          className={`flex-1 min-w-0${clickable ? ' cursor-pointer active:opacity-90' : ''}`}
          onClick={clickable ? () => onConfirmNutrition?.(log) : undefined}
          onKeyDown={
            clickable
              ? e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onConfirmNutrition?.(log)
                  }
                }
              : undefined
          }
          role={clickable ? 'button' : undefined}
          tabIndex={clickable ? 0 : undefined}
          aria-label={clickable ? `${log.name}，${formatLogCaloriesLine(log)}，點擊確認營養` : undefined}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[16px] truncate flex-1" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
              {getFoodLogDisplayLabel(log)}
            </p>
            <p
              className="text-[16px] tabular-nums shrink-0"
              style={{
                color: pending ? BB_V2.accent.orange : BB_V2.text.primary,
                fontWeight: pending ? 600 : 700,
              }}
            >
              {formatLogCaloriesLine(log)}
            </p>
          </div>

          {subLine ? (
            <p className="text-[13px] mt-1" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
              {subLine}
            </p>
          ) : null}

          {log.resolution_note && log.nutrition_status === 'auto_resolved' && (
            <p className="text-[11px] mt-1 line-clamp-2" style={{ color: BB_V2.text.secondary }}>
              {log.resolution_note}
            </p>
          )}
        </div>

        {clickable && (
          <ChevronRight className="h-4 w-4 shrink-0 mt-1" strokeWidth={BB_V2.iconStroke} style={{ color: BB_V2.accent.orange }} />
        )}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap pl-[60px]">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <MealStatusBadge label={trust.statusLabel} tone={trust.tone} />
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {onEdit ? (
            <button
              type="button"
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                onEdit(log)
              }}
              className="flex items-center gap-1 px-3 py-2 rounded-full text-[13px] active:opacity-80"
              style={{
                color: BB_V2.accent.orange,
                fontWeight: 600,
                backgroundColor: 'rgba(232, 146, 74, 0.1)',
              }}
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={BB_V2.iconStroke} />
              修正
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                onDelete()
              }}
              className="flex items-center gap-1 px-3 py-2 rounded-full text-[13px] active:opacity-80"
              style={{ color: BB_V2.text.secondary, fontWeight: 500, backgroundColor: BB_V2.bg.pill }}
              aria-label="刪除"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={BB_V2.iconStroke} />
              刪除
            </button>
          ) : null}
        </div>
      </div>
    </BBCard>
  )

  return card
}
