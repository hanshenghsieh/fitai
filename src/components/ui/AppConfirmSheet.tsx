'use client'

import { X } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import AppOverlay from '@/components/ui/AppOverlay'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function AppConfirmSheet({
  open,
  title,
  message,
  confirmLabel = '確定',
  cancelLabel = '取消',
  onConfirm,
  onCancel,
}: Props) {
  return (
    <AppOverlay open={open} onClose={onCancel} variant="dialog">
      <div
        className="max-w-sm mx-auto w-[calc(100%-40px)]"
        style={{
          fontFamily: BB_V2.font,
          backgroundColor: BB_V2.bg.card,
          borderRadius: BB_V2.radius.card,
          boxShadow: BB_V2.shadow.card,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <h2 className="text-[18px] leading-snug" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
            {title}
          </h2>
          <button type="button" onClick={onCancel} className="p-1 -mr-1 shrink-0" aria-label="關閉">
            <X className="h-5 w-5" strokeWidth={BB_V2.iconStroke} style={{ color: BB_V2.text.secondary }} />
          </button>
        </div>
        <p className="px-5 pb-5 text-[14px] leading-relaxed" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
          {message}
        </p>
        <div className="px-5 pb-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-12 rounded-[20px] text-[14px] active:opacity-80"
            style={{ backgroundColor: BB_V2.bg.pill, color: BB_V2.text.secondary, fontWeight: 500 }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 h-12 rounded-[20px] text-[14px] active:opacity-90"
            style={{ backgroundColor: BB_V2.accent.orange, color: '#FFFFFF', fontWeight: 600 }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </AppOverlay>
  )
}
