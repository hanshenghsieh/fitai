'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, Camera, Loader2, X } from 'lucide-react'
import { TODAY } from '@/lib/today-design'

const ICON_STROKE = TODAY.iconStroke

export interface PhotoLogDraft {
  file: File
  previewUrl: string
  name: string
  calories: number
  protein_g: number
  loading: boolean
}

interface Props {
  open: boolean
  draft: PhotoLogDraft | null
  onClose: () => void
  onPickFile: (file: File) => void
  onDraftChange: (patch: Partial<Pick<PhotoLogDraft, 'name' | 'calories' | 'protein_g'>>) => void
  onSave: () => void
  saving?: boolean
  onBackToCapture?: () => void
}

function CaptureStep({ onPickFile, onClose }: { onPickFile: (file: File) => void; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0 px-5 pt-5 pb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-[13px]"
          style={{ color: TODAY.textSecondary, fontWeight: 500 }}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={ICON_STROKE} />
          返回
        </button>
        <button type="button" onClick={onClose} className="p-1.5" aria-label="關閉">
          <X className="h-5 w-5" strokeWidth={ICON_STROKE} style={{ color: TODAY.textSecondary }} />
        </button>
      </div>
      <div className="flex-1 px-5 flex flex-col items-center justify-center min-h-[240px]">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) onPickFile(f)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center gap-3 active:opacity-85"
        >
          <span
            className="flex items-center justify-center rounded-full"
            style={{ width: 72, height: 72, backgroundColor: TODAY.mocha, boxShadow: TODAY.thumbShadow }}
          >
            <Camera className="h-8 w-8 text-white" strokeWidth={ICON_STROKE} />
          </span>
          <span className="text-center">
            <span className="block text-[16px]" style={{ color: TODAY.text, fontWeight: 600 }}>
              拍今天吃的
            </span>
            <span className="block text-[13px] mt-1" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
              或從相簿選一張
            </span>
          </span>
        </button>
      </div>
    </div>
  )
}

function ReviewStep({
  draft,
  onBack,
  onClose,
  onDraftChange,
  onSave,
  saving,
}: {
  draft: PhotoLogDraft
  onBack: () => void
  onClose: () => void
  onDraftChange: Props['onDraftChange']
  onSave: () => void
  saving?: boolean
}) {
  const [calText, setCalText] = useState(String(draft.calories || ''))
  const [proText, setProText] = useState(String(draft.protein_g || ''))

  useEffect(() => {
    setCalText(String(draft.calories || ''))
    setProText(String(draft.protein_g || ''))
  }, [draft.calories, draft.protein_g])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0 px-5 pt-5 pb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13px]"
          style={{ color: TODAY.textSecondary, fontWeight: 500 }}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={ICON_STROKE} />
          重選照片
        </button>
        <button type="button" onClick={onClose} className="p-1.5" aria-label="關閉">
          <X className="h-5 w-5" strokeWidth={ICON_STROKE} style={{ color: TODAY.textSecondary }} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4 space-y-5 min-h-0">
        <div
          className="relative w-full overflow-hidden"
          style={{ height: 200, borderRadius: 28, backgroundColor: TODAY.surface }}
        >
          <Image src={draft.previewUrl} alt="" fill unoptimized className="object-cover" sizes="100vw" />
        </div>

        {draft.loading ? (
          <p className="text-[14px] flex items-center gap-2" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={ICON_STROKE} />
            正在辨識…
          </p>
        ) : (
          <p className="text-[13px] leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            辨識不準也沒關係，你可以改一下。
          </p>
        )}

        <label className="block space-y-1.5">
          <span className="text-[12px]" style={{ color: TODAY.textSecondary, fontWeight: 500 }}>食物名稱</span>
          <input
            type="text"
            value={draft.name}
            onChange={e => onDraftChange({ name: e.target.value })}
            placeholder="例如：雞腿便當"
            className="w-full px-0 py-2 text-[16px] border-b outline-none bg-transparent"
            style={{ color: TODAY.text, fontWeight: 500, borderColor: 'rgba(142, 131, 120, 0.2)' }}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[12px]" style={{ color: TODAY.textSecondary, fontWeight: 500 }}>熱量（kcal）</span>
          <input
            type="number"
            inputMode="numeric"
            value={calText}
            onChange={e => {
              setCalText(e.target.value)
              const n = parseInt(e.target.value, 10)
              onDraftChange({ calories: Number.isFinite(n) ? n : 0 })
            }}
            className="w-full px-0 py-2 text-[16px] border-b outline-none bg-transparent tabular-nums"
            style={{ color: TODAY.text, fontWeight: 500, borderColor: 'rgba(142, 131, 120, 0.2)' }}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[12px]" style={{ color: TODAY.textSecondary, fontWeight: 500 }}>蛋白質（g）</span>
          <input
            type="number"
            inputMode="numeric"
            value={proText}
            onChange={e => {
              setProText(e.target.value)
              const n = parseInt(e.target.value, 10)
              onDraftChange({ protein_g: Number.isFinite(n) ? n : 0 })
            }}
            className="w-full px-0 py-2 text-[16px] border-b outline-none bg-transparent tabular-nums"
            style={{ color: TODAY.text, fontWeight: 500, borderColor: 'rgba(142, 131, 120, 0.2)' }}
          />
        </label>
      </div>

      <div className="shrink-0 px-5 pt-2 pb-5 space-y-2">
        <button
          type="button"
          disabled={draft.loading || saving || !draft.name.trim()}
          onClick={onSave}
          className="w-full h-14 rounded-[22px] text-[16px] disabled:opacity-40"
          style={{ backgroundColor: TODAY.mocha, color: '#FFFFFF', fontWeight: 500 }}
        >
          {saving ? '加入中…' : '加入今天'}
        </button>
      </div>
    </div>
  )
}

export default function PhotoLogSheet({
  open,
  draft,
  onClose,
  onPickFile,
  onDraftChange,
  onSave,
  saving,
  onBackToCapture,
}: Props) {
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{
        backgroundColor: 'rgba(47, 36, 29, 0.22)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        className="max-w-lg mx-auto w-full flex flex-col overflow-hidden"
        style={{
          fontFamily: TODAY.font,
          backgroundColor: TODAY.card,
          borderRadius: '28px 28px 0 0',
          boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.08)',
          maxHeight: 'min(85vh, 640px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {draft ? (
          <ReviewStep
            draft={draft}
            onBack={onBackToCapture ?? onClose}
            onClose={onClose}
            onDraftChange={onDraftChange}
            onSave={onSave}
            saving={saving}
          />
        ) : (
          <CaptureStep onPickFile={onPickFile} onClose={onClose} />
        )}
      </div>
    </div>
  )
}
