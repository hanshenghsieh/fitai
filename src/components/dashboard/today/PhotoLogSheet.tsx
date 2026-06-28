'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, Camera, Loader2, Search, X } from 'lucide-react'
import { TODAY } from '@/lib/today-design'
import { BB_V2 } from '@/lib/betterbit-v2'
import BBCard from '@/components/ui/BBCard'
import { isNativeIOS } from '@/lib/capacitor-native'
import AppOverlay from '@/components/ui/AppOverlay'
import { captureFoodPhotoFromCamera, pickFoodPhotoFromGallery } from '@/lib/native-camera'
import type { PhotoAccuracyState } from '@/lib/nutrition/photo-log-accuracy'
import type { ConfirmationQuestion, UserConfirmationAnswers } from '@/lib/nutrition/types'

const ICON_STROKE = TODAY.iconStroke

export interface PhotoLogDraft {
  file: File
  previewUrl: string
  dataUrl?: string
  name: string
  calories: number | null
  protein_g: number | null
  carbs_g?: number | null
  fat_g?: number | null
  loading: boolean
  accuracy?: PhotoAccuracyState
}

interface Props {
  open: boolean
  draft: PhotoLogDraft | null
  accuracyEnabled?: boolean
  onClose: () => void
  onPickFile: (file: File) => void
  onDraftChange: (patch: Partial<Pick<PhotoLogDraft, 'name' | 'calories' | 'protein_g'>>) => void
  onAccuracyChange?: (patch: Partial<UserConfirmationAnswers>) => void
  onSave: () => void
  saving?: boolean
  onBackToCapture?: () => void
  onOpenManualCorrection?: () => void
}

function CaptureStep({ onPickFile, onClose }: { onPickFile: (file: File) => void; onClose: () => void }) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [picking, setPicking] = useState(false)
  const useNativeCamera = isNativeIOS()

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onPickFile(f)
    e.target.value = ''
  }

  async function openCamera() {
    if (useNativeCamera) {
      setPicking(true)
      try {
        const file = await captureFoodPhotoFromCamera()
        if (file) onPickFile(file)
      } finally {
        setPicking(false)
      }
      return
    }
    cameraRef.current?.click()
  }

  async function openGallery() {
    if (useNativeCamera) {
      setPicking(true)
      try {
        const file = await pickFoodPhotoFromGallery()
        if (file) onPickFile(file)
      } finally {
        setPicking(false)
      }
      return
    }
    galleryRef.current?.click()
  }

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
      <div className="flex-1 px-5 flex flex-col items-center justify-center gap-6 min-h-[240px] pb-4">
        {!useNativeCamera && (
          <>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFile}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
          </>
        )}

        <button
          type="button"
          disabled={picking}
          onClick={() => void openCamera()}
          className="w-full max-w-xs flex flex-col items-center gap-3 py-6 rounded-[28px] active:opacity-85"
          style={{ backgroundColor: TODAY.surface }}
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
              {picking ? '開啟中…' : '開啟相機拍照'}
            </span>
          </span>
        </button>

        <button
          type="button"
          disabled={picking}
          onClick={() => void openGallery()}
          className="w-full max-w-xs h-14 rounded-[22px] text-[15px] active:opacity-90"
          style={{
            backgroundColor: TODAY.card,
            color: TODAY.mocha,
            fontWeight: 500,
            border: `1.5px solid ${TODAY.mocha}`,
          }}
        >
          從相簿選擇
        </button>
      </div>
    </div>
  )
}

function guessFoodTags(name: string): string[] {
  const parts = name.split(/[+＋、,，]/).map(s => s.trim()).filter(Boolean)
  if (parts.length > 1) return parts.slice(0, 4)
  if (name) return [name]
  return []
}

function FoodTag({ label, style }: { label: string; style?: React.CSSProperties }) {
  return (
    <span
      className="px-3 py-1.5 text-[12px] backdrop-blur-md"
      style={{
        borderRadius: BB_V2.radius.pill,
        backgroundColor: 'rgba(255,255,255,0.88)',
        color: BB_V2.text.primary,
        fontWeight: 600,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        ...style,
      }}
    >
      {label}
    </span>
  )
}

function AccuracyConfirmSection({
  accuracy,
  onAccuracyChange,
  onOpenManualCorrection,
}: {
  accuracy: PhotoAccuracyState
  onAccuracyChange: NonNullable<Props['onAccuracyChange']>
  onOpenManualCorrection?: () => void
}) {
  const selectedId = accuracy.answers.selected_candidate_id ?? accuracy.candidates[0]?.id
  const questions = accuracy.confirmation_questions.slice(0, 3)
  const confirmed = accuracy.answers.user_confirmed === true
  const ready = accuracy.ready_for_food_log
  const unknown = accuracy.nutrition_status === 'unknown'

  const answerFor = (qid: ConfirmationQuestion['id']) => accuracy.answers[qid]

  if (unknown) {
    return (
      <div className="space-y-3 p-4" style={{ backgroundColor: TODAY.surface, borderRadius: 24 }}>
        <p className="text-[14px]" style={{ color: TODAY.text, fontWeight: 600 }}>
          目前沒有可信營養資料
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
          {accuracy.ui_message}
        </p>
        {onOpenManualCorrection && (
          <button
            type="button"
            onClick={onOpenManualCorrection}
            className="w-full h-12 text-[15px] active:opacity-90"
            style={{
              borderRadius: 22,
              backgroundColor: TODAY.card,
              color: TODAY.mocha,
              fontWeight: 600,
              border: `1.5px solid ${TODAY.mocha}`,
            }}
          >
            搜尋全部菜品 / 手動更改
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className="space-y-4 p-4"
      style={{ backgroundColor: TODAY.surface, borderRadius: 24 }}
    >
      <div className="space-y-1">
        <p className="text-[14px]" style={{ color: TODAY.text, fontWeight: 600 }}>
          我想先確認一下
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
          這餐看起來像（僅最相近 {accuracy.candidates.length} 筆，資料庫還有更多）：
        </p>
      </div>

      {accuracy.candidates.length > 0 && (
        <div
          className="max-h-[220px] overflow-y-auto overscroll-contain -mx-1 px-1"
        >
          <div className="flex flex-wrap gap-2">
            {accuracy.candidates.map(c => {
              const active = c.id === selectedId
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onAccuracyChange({ selected_candidate_id: c.id, user_confirmed: false })}
                  className="px-4 py-2.5 text-[14px] active:opacity-85 text-left"
                  style={{
                    borderRadius: 20,
                    backgroundColor: active ? TODAY.pillActiveBg : TODAY.card,
                    color: active ? TODAY.pillActiveText : TODAY.text,
                    fontWeight: active ? 600 : 500,
                    border: active ? 'none' : `1.5px solid ${TODAY.pillBg}`,
                    maxWidth: '100%',
                  }}
                >
                  {c.display_name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {onOpenManualCorrection && (
        <button
          type="button"
          onClick={onOpenManualCorrection}
          className="w-full h-12 text-[15px] flex items-center justify-center gap-2 active:opacity-90"
          style={{
            borderRadius: 22,
            backgroundColor: TODAY.pillBg,
            color: TODAY.mocha,
            fontWeight: 600,
          }}
        >
          <Search className="h-4 w-4" strokeWidth={ICON_STROKE} />
          搜尋全部菜品
        </button>
      )}

      {questions.map(q => (
        <div key={q.id} className="space-y-2">
          <p className="text-[13px]" style={{ color: TODAY.textSecondary, fontWeight: 500 }}>
            {q.prompt}
          </p>
          <div className="flex flex-wrap gap-2">
            {q.options.map(opt => {
              const active = answerFor(q.id) === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onAccuracyChange({ [q.id]: opt.id, user_confirmed: false })}
                  className="px-3.5 py-2 text-[13px] active:opacity-85"
                  style={{
                    borderRadius: 18,
                    backgroundColor: active ? TODAY.pillBg : TODAY.card,
                    color: TODAY.text,
                    fontWeight: active ? 600 : 500,
                    border: `1.5px solid ${active ? TODAY.mocha : 'rgba(142, 131, 120, 0.18)'}`,
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {!confirmed && (
        <button
          type="button"
          onClick={() => onAccuracyChange({ user_confirmed: true })}
          className="w-full h-12 text-[15px] active:opacity-90"
          style={{
            borderRadius: 22,
            backgroundColor: TODAY.pillBg,
            color: TODAY.mocha,
            fontWeight: 600,
          }}
        >
          確認後我再幫你記錄
        </button>
      )}

      {confirmed && ready && accuracy.show_macros && (
        <p className="text-[13px] text-center leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
          好，我記下來了。營養資料來自官方資料庫。
        </p>
      )}

      {onOpenManualCorrection && (
        <button
          type="button"
          onClick={onOpenManualCorrection}
          className="w-full h-12 text-[15px] active:opacity-90"
          style={{
            borderRadius: 22,
            backgroundColor: TODAY.card,
            color: TODAY.mocha,
            fontWeight: 600,
            border: `1.5px solid rgba(142, 131, 120, 0.35)`,
          }}
        >
          都不是？搜尋全部或手動更改
        </button>
      )}
    </div>
  )
}

function ReviewStep({
  draft,
  accuracyEnabled,
  onBack,
  onClose,
  onDraftChange,
  onAccuracyChange,
  onSave,
  saving,
  onOpenManualCorrection,
}: {
  draft: PhotoLogDraft
  accuracyEnabled?: boolean
  onBack: () => void
  onClose: () => void
  onDraftChange: Props['onDraftChange']
  onAccuracyChange?: Props['onAccuracyChange']
  onSave: () => void
  saving?: boolean
  onOpenManualCorrection?: () => void
}) {
  const accuracyMode = accuracyEnabled && !!draft.accuracy
  const readyForLog = !accuracyMode || draft.accuracy!.ready_for_food_log
  const showMacros = !accuracyMode || draft.accuracy!.show_macros

  const [calText, setCalText] = useState(draft.calories != null ? String(draft.calories) : '')
  const [proText, setProText] = useState(draft.protein_g != null ? String(draft.protein_g) : '')

  useEffect(() => {
    setCalText(draft.calories != null ? String(draft.calories) : '')
    setProText(draft.protein_g != null ? String(draft.protein_g) : '')
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

      <div className="ios-bottom-sheet__scroll flex-1 overflow-y-auto overscroll-contain px-5 pb-4 space-y-5 min-h-0">
        <div
          className="relative w-full overflow-hidden"
          style={{ height: 360, borderRadius: BB_V2.radius.sheet, backgroundColor: BB_V2.bg.pill }}
        >
          <Image src={draft.previewUrl} alt="" fill unoptimized className="object-cover" sizes="100vw" />
          {!draft.loading && draft.name && !accuracyMode && (
            <div className="absolute inset-0 p-4 flex flex-wrap content-start gap-2 pointer-events-none">
              {guessFoodTags(draft.name).map((tag, i) => (
                <FoodTag
                  key={tag}
                  label={tag}
                  style={{
                    marginTop: i === 0 ? '12%' : undefined,
                    marginLeft: i === 1 ? '45%' : i === 2 ? '8%' : undefined,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {draft.loading ? (
          <p className="text-[14px] flex items-center gap-2" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={ICON_STROKE} />
            正在辨識…
          </p>
        ) : accuracyMode && draft.accuracy && onAccuracyChange ? (
          <AccuracyConfirmSection
            accuracy={draft.accuracy}
            onAccuracyChange={onAccuracyChange}
            onOpenManualCorrection={onOpenManualCorrection}
          />
        ) : (
          <p className="text-[13px] leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            辨識不準也沒關係，你可以改一下。
          </p>
        )}

        {showMacros && (
          <BBCard padding={20}>
            <p className="text-[18px] mb-1" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
              {draft.name || '這餐'}
            </p>
            <p className="text-[32px] tabular-nums mb-4" style={{ color: BB_V2.accent.orange, fontWeight: 700 }}>
              {draft.calories ?? '—'}
              <span className="text-[16px] ml-1" style={{ fontWeight: 600 }}>kcal</span>
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '蛋白質', value: draft.protein_g, unit: 'g', color: BB_V2.macro.protein },
                { label: '碳水', value: draft.carbs_g, unit: 'g', color: BB_V2.macro.carbs },
                { label: '脂肪', value: draft.fat_g, unit: 'g', color: BB_V2.macro.fat },
              ].map(row => (
                <div
                  key={row.label}
                  className="text-center py-3"
                  style={{ borderRadius: 16, backgroundColor: BB_V2.bg.canvas }}
                >
                  <p className="text-[11px] mb-1" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>{row.label}</p>
                  <p className="text-[18px] tabular-nums" style={{ color: row.color, fontWeight: 700 }}>
                    {row.value ?? '—'}
                    <span className="text-[11px] font-medium">{row.unit}</span>
                  </p>
                </div>
              ))}
            </div>
            {!accuracyMode && (
              <div className="mt-4 space-y-3 pt-4" style={{ borderTop: `1px solid ${BB_V2.divider}` }}>
                <label className="block space-y-1">
                  <span className="text-[12px]" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>食物名稱</span>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={e => onDraftChange({ name: e.target.value })}
                    placeholder="例如：雞腿便當"
                    className="w-full px-4 py-3 text-[16px] outline-none"
                    style={{
                      color: BB_V2.text.primary,
                      fontWeight: 500,
                      borderRadius: BB_V2.radius.input,
                      backgroundColor: BB_V2.bg.canvas,
                    }}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className="text-[12px]" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>熱量 kcal</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={calText}
                      onChange={e => {
                        setCalText(e.target.value)
                        const n = parseInt(e.target.value, 10)
                        onDraftChange({ calories: Number.isFinite(n) ? n : 0 })
                      }}
                      className="w-full px-4 py-3 text-[16px] outline-none tabular-nums"
                      style={{
                        color: BB_V2.text.primary,
                        fontWeight: 600,
                        borderRadius: BB_V2.radius.input,
                        backgroundColor: BB_V2.bg.canvas,
                      }}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[12px]" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>蛋白質 g</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={proText}
                      onChange={e => {
                        setProText(e.target.value)
                        const n = parseInt(e.target.value, 10)
                        onDraftChange({ protein_g: Number.isFinite(n) ? n : 0 })
                      }}
                      className="w-full px-4 py-3 text-[16px] outline-none tabular-nums"
                      style={{
                        color: BB_V2.text.primary,
                        fontWeight: 600,
                        borderRadius: BB_V2.radius.input,
                        backgroundColor: BB_V2.bg.canvas,
                      }}
                    />
                  </label>
                </div>
              </div>
            )}
          </BBCard>
        )}
      </div>

      <div className="ios-bottom-sheet__footer shrink-0 px-5 pt-2 pb-3 space-y-2">
        <p className="text-[11px] text-center leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400, opacity: 0.8 }}>
          {accuracyMode && draft.accuracy?.nutrition_status === 'unknown'
            ? '此筆為照片紀錄，不含營養統計。'
            : '營養資料僅來自官方資料庫，經確認後入帳。'}
        </p>
        <button
          type="button"
          disabled={draft.loading || saving || !draft.name.trim() || !readyForLog}
          onClick={onSave}
          className="w-full text-[17px] disabled:opacity-40 active:scale-[0.99] transition-transform"
          style={{
            height: 60,
            borderRadius: BB_V2.radius.button,
            backgroundColor: BB_V2.accent.orange,
            color: '#FFFFFF',
            fontWeight: 600,
          }}
        >
          {saving ? '加入中…' : accuracyMode && !readyForLog ? '請先確認這餐' : '加入今天'}
        </button>
      </div>
    </div>
  )
}

export default function PhotoLogSheet({
  open,
  draft,
  accuracyEnabled,
  onClose,
  onPickFile,
  onDraftChange,
  onAccuracyChange,
  onSave,
  saving,
  onBackToCapture,
  onOpenManualCorrection,
}: Props) {
  return (
    <AppOverlay open={open} onClose={onClose} variant="sheet">
      <div
        className="ios-bottom-sheet max-w-lg mx-auto w-full"
        style={{
          fontFamily: BB_V2.font,
          backgroundColor: BB_V2.bg.card,
          borderRadius: `${BB_V2.radius.sheet}px ${BB_V2.radius.sheet}px 0 0`,
          boxShadow: BB_V2.shadow.card,
        }}
        onClick={e => e.stopPropagation()}
      >
        {draft ? (
          <ReviewStep
            draft={draft}
            accuracyEnabled={accuracyEnabled}
            onBack={onBackToCapture ?? onClose}
            onClose={onClose}
            onDraftChange={onDraftChange}
            onAccuracyChange={onAccuracyChange}
            onSave={onSave}
            saving={saving}
            onOpenManualCorrection={onOpenManualCorrection}
          />
        ) : (
          <CaptureStep onPickFile={onPickFile} onClose={onClose} />
        )}
      </div>
    </AppOverlay>
  )
}
