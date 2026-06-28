'use client'

import { X } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { FoodLogEntry } from '@/lib/banks/types'
import { formatLogCaloriesLine, NUTRITION_PENDING_LABEL } from '@/lib/nutrition/food-log-display'
import AppOverlay from '@/components/ui/AppOverlay'

const font = 'var(--font-noto-tc), system-ui, sans-serif'
const ICON_STROKE = 1.8

interface Props {
  open: boolean
  logs: FoodLogEntry[]
  onClose: () => void
  onSelectLog: (log: FoodLogEntry) => void
}

export default function PendingNutritionQueueSheet({ open, logs, onClose, onSelectLog }: Props) {
  return (
    <AppOverlay open={open} onClose={onClose} variant="sheet">
      <div
        className="ios-bottom-sheet max-w-lg mx-auto w-full"
        style={{
          fontFamily: font,
          backgroundColor: BB_V2.bg.card,
          borderRadius: '28px 28px 0 0',
          boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[20px] leading-tight" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
              待確認營養
            </h2>
            <p className="text-[13px] mt-1" style={{ color: BB_V2.text.secondary }}>
              共 {logs.length} 筆 · 點選項目開始確認
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 -mr-1 shrink-0" aria-label="關閉">
            <X className="h-5 w-5" strokeWidth={ICON_STROKE} style={{ color: BB_V2.text.secondary }} />
          </button>
        </div>

        <ul className="ios-bottom-sheet__scroll px-5 pb-6 space-y-2">
          {logs.map(log => (
            <li key={log.id}>
              <button
                type="button"
                onClick={() => {
                  onSelectLog(log)
                  onClose()
                }}
                className="w-full text-left px-4 py-3.5 rounded-2xl active:opacity-90 flex items-center justify-between gap-3"
                style={{ backgroundColor: BB_V2.bg.canvas }}
              >
                <span className="text-[16px] truncate" style={{ color: BB_V2.text.primary, fontWeight: 500 }}>
                  {log.name}
                </span>
                <span className="text-[13px] shrink-0" style={{ color: BB_V2.accent.orange, fontWeight: 500 }}>
                  {formatLogCaloriesLine(log) === NUTRITION_PENDING_LABEL ? NUTRITION_PENDING_LABEL : '待確認'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </AppOverlay>
  )
}
