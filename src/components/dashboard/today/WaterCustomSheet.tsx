'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import AppOverlay from '@/components/ui/AppOverlay'

const font = 'var(--font-noto-tc), system-ui, sans-serif'
const ICON_STROKE = 1.8

interface Props {
  open: boolean
  currentMl: number
  onClose: () => void
  onSaveTotal: (totalMl: number) => void
  onReset: () => void
}

export default function WaterCustomSheet({ open, currentMl, onClose, onSaveTotal, onReset }: Props) {
  const [value, setValue] = useState(String(currentMl))

  useEffect(() => {
    if (open) setValue(String(currentMl))
  }, [open, currentMl])

  function handleSave() {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return
    onSaveTotal(parsed)
  }

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
              自訂喝水量
            </h2>
            <p className="text-[13px] mt-1" style={{ color: BB_V2.text.secondary }}>
              輸入今日總量（ml）
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 -mr-1 shrink-0" aria-label="關閉">
            <X className="h-5 w-5" strokeWidth={ICON_STROKE} style={{ color: BB_V2.text.secondary }} />
          </button>
        </div>

        <div className="px-5 pb-6 space-y-4">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={50}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="例如 600"
            className="w-full h-14 px-4 rounded-2xl text-[18px] tabular-nums outline-none"
            style={{
              backgroundColor: BB_V2.bg.pill,
              color: BB_V2.text.primary,
              fontWeight: 500,
            }}
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                onReset()
                onClose()
              }}
              className="flex-1 h-12 rounded-[20px] text-[14px]"
              style={{ backgroundColor: BB_V2.bg.pill, color: BB_V2.text.secondary, fontWeight: 500 }}
            >
              重設今日
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-[1.4] h-12 rounded-[20px] text-[14px]"
              style={{ backgroundColor: BB_V2.accent.orange, color: '#FFFFFF', fontWeight: 600 }}
            >
              儲存
            </button>
          </div>
        </div>
      </div>
    </AppOverlay>
  )
}
