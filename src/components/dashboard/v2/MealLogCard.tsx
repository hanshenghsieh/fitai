'use client'

import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { Trash2, ChevronRight } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { FoodLogEntry } from '@/lib/banks/types'
import { calculateDietScore } from '@/lib/nutrition/diet-score'
import BBIcon from '@/components/icons/BBIcon'
import { dietScoreIcon } from '@/components/icons'
import FoodPhotoThumb from '@/components/dashboard/today/FoodPhotoThumb'
import BBCard from '@/components/ui/BBCard'
import {
  formatLogCaloriesLine,
  formatLogProteinLine,
  getFoodLogDisplayLabel,
  isNutritionPendingConfirmation,
  nutritionStatusBadge,
} from '@/lib/nutrition/food-log-display'

interface Props {
  log: FoodLogEntry
  onDelete?: () => void
  onConfirmNutrition?: (log: FoodLogEntry) => void
}

function formatTime(iso: string) {
  try {
    return format(parseISO(iso), 'HH:mm')
  } catch {
    return ''
  }
}

export default function MealLogCard({ log, onDelete, onConfirmNutrition }: Props) {
  const time = formatTime(log.logged_at)
  const hasPhoto = !!(log.photo_data_url || log.source === 'photo')
  const pending = isNutritionPendingConfirmation(log)
  const badge = nutritionStatusBadge(log)
  const clickable = pending && !!onConfirmNutrition
  const dietScore = useMemo(() => {
    if (pending || log.calories == null) return null
    return calculateDietScore({
      name: log.name,
      calories: log.calories,
      protein_g: log.protein_g ?? 0,
      carbs_g: log.carbs_g,
      fat_g: log.fat_g,
    })
  }, [log.name, log.calories, log.protein_g, log.carbs_g, log.fat_g, pending])

  const proteinLine = formatLogProteinLine(log)

  const inner = (
    <BBCard padding="16px 20px" className="flex items-center gap-4">
      {hasPhoto && log.photo_data_url ? (
        <FoodPhotoThumb photo_url={log.photo_data_url} userUploadedPhoto={log.photo_data_url} size={56} radius={16} />
      ) : (
        <div
          className="shrink-0 flex items-center justify-center"
          style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: BB_V2.bg.pill }}
          aria-hidden
        >
          <BBIcon name="meal" size={24} tone="muted" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[16px] truncate" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
          {getFoodLogDisplayLabel(log)}
        </p>
        <p className="text-[13px] mt-0.5" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
          {time && <span>{time}</span>}
          {time && log.store ? <span> · </span> : null}
          {log.store && <span>{log.store}</span>}
          {badge && (
            <span className="ml-1" style={{ color: BB_V2.accent.orange }}>
              · {badge}
            </span>
          )}
          {log.resolution_note && log.nutrition_status === 'auto_resolved' && (
            <span className="block text-[11px] mt-1 line-clamp-2" style={{ color: BB_V2.text.secondary }}>
              {log.resolution_note}
            </span>
          )}
        </p>
      </div>
      <div className="shrink-0 text-right flex items-center gap-1">
        <div>
          <p
            className="text-[16px] tabular-nums"
            style={{
              color: pending ? BB_V2.accent.orange : BB_V2.text.primary,
              fontWeight: pending ? 600 : 700,
            }}
          >
            {formatLogCaloriesLine(log)}
          </p>
          {!pending && proteinLine && (
            <p className="text-[11px]" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
              {proteinLine}
            </p>
          )}
          {dietScore && (
            <p
              className="text-[11px] tabular-nums mt-0.5 flex items-center justify-end gap-1"
              style={{ color: BB_V2.text.secondary, fontWeight: 500 }}
              title={dietScore.label}
              aria-label={`減脂分數 ${dietScore.score}，${dietScore.label}`}
            >
              <BBIcon
                name={dietScoreIcon(dietScore.signal)}
                size={12}
                tone={dietScore.signal === 'green' ? 'success' : dietScore.signal === 'yellow' ? 'warning' : 'danger'}
              />
              {dietScore.score}
            </p>
          )}
        </div>
        {clickable && (
          <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={BB_V2.iconStroke} style={{ color: BB_V2.accent.orange }} />
        )}
        {onDelete && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-2 rounded-full active:opacity-70"
            aria-label="移除"
          >
            <Trash2 className="h-4 w-4" strokeWidth={BB_V2.iconStroke} style={{ color: BB_V2.text.secondary }} />
          </button>
        )}
      </div>
    </BBCard>
  )

  if (clickable) {
    return (
      <button
        type="button"
        onClick={() => onConfirmNutrition(log)}
        className="w-full text-left active:opacity-90"
        aria-label={`${log.name}，${formatLogCaloriesLine(log)}，點擊確認營養`}
      >
        {inner}
      </button>
    )
  }

  return inner
}
