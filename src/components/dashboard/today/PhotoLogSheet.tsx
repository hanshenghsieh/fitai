'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Camera, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { TODAY } from '@/lib/today-design'
import { BB_V2 } from '@/lib/betterbit-v2'
import BBCard from '@/components/ui/BBCard'
import AppOverlay from '@/components/ui/AppOverlay'
import {
  captureFoodPhotoFromCamera,
  isCapacitorCameraUsable,
  pickFoodPhotoFromGallery,
} from '@/lib/native-camera'
import type { PhotoAccuracyState } from '@/lib/nutrition/photo-log-accuracy'
import { photoAccuracyDisplayMacros } from '@/lib/nutrition/photo-log-accuracy'
import type { PhotoV2State } from '@/lib/nutrition/search-v2/photo-pipeline'
import { photoV2UiMessage } from '@/lib/nutrition/search-v2/photo-pipeline'
import type { ConfirmationQuestion, UserConfirmationAnswers } from '@/lib/nutrition/types'
import { isNativeIOS } from '@/lib/capacitor-native'
import type { FoodPhotoSource } from '@/lib/food-capture'

const ICON_STROKE = TODAY.iconStroke
const IOS_LITE_CANDIDATE_LIMIT = 3

export interface PhotoLogDraft {
  file: File
  source: FoodPhotoSource
  previewUrl: string
  dataUrl?: string
  name: string
  calories: number | null
  protein_g: number | null
  carbs_g?: number | null
  fat_g?: number | null
  loading: boolean
  /** Soft inline hint when AI estimate needs manual follow-up (not a hard failure). */
  recognitionHint?: string
  /** iOS: text-only nutrition match in flight after AI label returns. */
  matchingNutrition?: boolean
  accuracy?: PhotoAccuracyState
  /** iOS: keep slim server snapshot; hydrate accuracy only on save. */
  photo_v2?: PhotoV2State
}

interface Props {
  open: boolean
  targetDate: string
  draft: PhotoLogDraft | null
  processing?: boolean
  accuracyEnabled?: boolean
  onClose: () => void
  onPickFile: (file: File, source: FoodPhotoSource) => void
  onDraftChange: (patch: Partial<Pick<PhotoLogDraft, 'name' | 'calories' | 'protein_g'>>) => void
  onAccuracyChange?: (patch: Partial<UserConfirmationAnswers>) => void
  onSave: () => void
  saving?: boolean
  onBackToCapture?: () => void
  onOpenManualCorrection?: () => void
  onPhotoV2Select?: (candidateId: string) => void
  onSavePhotoOnly?: () => void
  onRetryUpload?: () => void
}

function CaptureStep({
  onPickFile,
  onClose,
}: {
  onPickFile: (file: File, source: FoodPhotoSource) => void
  onClose: () => void
}) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [picking, setPicking] = useState(false)
  const nativeCamera = isCapacitorCameraUsable()

  useEffect(() => {
    const clearPicking = () => setPicking(false)
    window.addEventListener('focus', clearPicking)
    return () => window.removeEventListener('focus', clearPicking)
  }, [])

  const handleFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    source: FoodPhotoSource
  ) => {
    setPicking(false)
    const f = e.target.files?.[0]
    if (f) onPickFile(f, source)
    e.target.value = ''
  }

  async function handleNativePick(mode: 'camera' | 'gallery') {
    setPicking(true)
    const result =
      mode === 'camera' ? await captureFoodPhotoFromCamera() : await pickFoodPhotoFromGallery()
    setPicking(false)
    if (result.ok) {
      onPickFile(result.file, result.source)
      return
    }
    if (result.reason === 'denied') {
      toast.error(
        mode === 'camera'
          ? '需要相機權限，請到 iPhone 設定中開啟。'
          : '需要相簿權限，請到 iPhone 設定中開啟。'
      )
      return
    }
    if (result.reason === 'unavailable') {
      toast.error('無法開啟相機，請稍後再試')
    }
  }

  function openCamera() {
    if (nativeCamera) {
      void handleNativePick('camera')
      return
    }
    setPicking(true)
    cameraRef.current?.click()
  }

  function openGallery() {
    if (nativeCamera) {
      void handleNativePick('gallery')
      return
    }
    setPicking(true)
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
        <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" aria-label="關閉">
          <X className="h-5 w-5" strokeWidth={ICON_STROKE} style={{ color: TODAY.textSecondary }} />
        </button>
      </div>
      <div className="flex-1 px-5 flex flex-col items-center justify-center gap-6 min-h-[240px] pb-4">
        {!nativeCamera && (
          <>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={event => handleFile(event, 'camera')}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={event => handleFile(event, 'library')}
            />
          </>
        )}

        <button
          type="button"
          disabled={picking}
          onClick={openCamera}
          className="w-full max-w-xs flex flex-col items-center gap-3 py-6 rounded-[28px] active:opacity-85 touch-manipulation"
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
          onClick={openGallery}
          className="w-full max-w-xs h-14 rounded-[22px] text-[15px] active:opacity-90 touch-manipulation"
          style={{
            backgroundColor: TODAY.card,
            color: TODAY.mocha,
            fontWeight: 500,
            border: `1.5px solid ${TODAY.mocha}`,
          }}
        >
          從相簿選擇
        </button>
        <p className="text-[11px] text-center px-2 leading-relaxed max-w-xs" style={{ color: TODAY.textSecondary }}>
          AI 估算僅供參考，不能代替專業營養或醫療建議。
        </p>
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

function PhotoFlowStepHint({ step, loading }: { step: 1 | 2 | 3; loading?: boolean }) {
  const current = loading ? 1 : step
  const label =
    current === 1
      ? '步驟 1/3 · AI 幫你估算'
      : current === 2
        ? '步驟 2/3 · 你確認或修正'
        : '步驟 3/3 · 加入今日紀錄'
  return (
    <p className="text-[12px] text-center" style={{ color: TODAY.textSecondary, fontWeight: 500 }}>
      {label}
    </p>
  )
}

function PhotoReviewFooter({
  draft,
  saving,
  readyForLog,
  iosLiteMode,
  onSave,
  onSavePhotoOnly,
  onOpenManualCorrection,
  onClose,
}: {
  draft: PhotoLogDraft
  saving?: boolean
  readyForLog: boolean
  iosLiteMode: boolean
  onSave: () => void
  onSavePhotoOnly?: () => void
  onOpenManualCorrection?: () => void
  onClose: () => void
}) {
  const step: 1 | 2 | 3 = draft.loading ? 1 : readyForLog || iosLiteMode ? 3 : 2
  const primaryDisabled =
    draft.loading ||
    saving ||
    !draft.name.trim() ||
    (iosLiteMode ? !onSavePhotoOnly : !readyForLog)
  const handlePrimary = iosLiteMode && onSavePhotoOnly ? onSavePhotoOnly : onSave

  return (
    <div className="ios-bottom-sheet__footer shrink-0 px-5 pt-2 pb-3 space-y-2">
      <PhotoFlowStepHint step={step} loading={draft.loading} />
      <p className="text-[11px] text-center leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400, opacity: 0.85 }}>
        {iosLiteMode
          ? '可先保存照片；營養確認後才會計入今日總量。'
          : readyForLog
            ? '確認沒問題就加入今日紀錄。'
            : '選好最接近的品項，或用手動修正微調。'}
      </p>
      <button
        type="button"
        disabled={primaryDisabled}
        onClick={handlePrimary}
        className="w-full text-[17px] disabled:opacity-40 active:scale-[0.99] transition-transform"
        style={{
          height: 56,
          borderRadius: BB_V2.radius.button,
          backgroundColor: BB_V2.accent.orange,
          color: '#FFFFFF',
          fontWeight: 600,
        }}
      >
        {saving ? '加入中…' : '加入今日紀錄'}
      </button>
      {onOpenManualCorrection ? (
        <button
          type="button"
          disabled={draft.loading || saving}
          onClick={onOpenManualCorrection}
          className="w-full h-12 text-[15px] disabled:opacity-40 active:opacity-90"
          style={{
            borderRadius: BB_V2.radius.button,
            backgroundColor: TODAY.pillBg,
            color: TODAY.mocha,
            fontWeight: 600,
          }}
        >
          手動修正
        </button>
      ) : null}
      <button
        type="button"
        onClick={onClose}
        className="w-full h-11 text-[14px] active:opacity-80"
        style={{ color: TODAY.textSecondary, fontWeight: 500 }}
      >
        稍後再說
      </button>
    </div>
  )
}

function IosLiteConfirmSection({
  photoV2,
  selectedId,
  onPhotoV2Select,
}: {
  photoV2: PhotoV2State
  selectedId?: string
  onPhotoV2Select?: (candidateId: string) => void
}) {
  const unknown = photoV2.outcome.action === 'create_unknown'
  const candidates = photoV2.outcome.candidates.slice(0, IOS_LITE_CANDIDATE_LIMIT)

  if (unknown) {
    return (
      <div className="space-y-3 p-4" style={{ backgroundColor: TODAY.surface, borderRadius: 24 }}>
        <p className="text-[14px]" style={{ color: TODAY.text, fontWeight: 600 }}>
          這餐我先幫你記下來
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
          {photoV2UiMessage(photoV2)}不確定的項目會先標成估算，之後可以再微調。
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-4" style={{ backgroundColor: TODAY.surface, borderRadius: 24 }}>
      <p className="text-[14px]" style={{ color: TODAY.text, fontWeight: 600 }}>
        這餐看起來像這樣
      </p>
      <p className="text-[13px] leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
        選最接近的一項；不確定可以點下方「手動修正」。
      </p>
      {candidates.length > 0 && (
        <div className="flex flex-col gap-2">
          {candidates.map(c => {
            const active = c.id === selectedId
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onPhotoV2Select?.(c.id)}
                className="w-full px-4 py-3 text-[14px] text-left active:opacity-85"
                style={{
                  borderRadius: 20,
                  backgroundColor: active ? TODAY.pillActiveBg : TODAY.card,
                  color: active ? TODAY.pillActiveText : TODAY.text,
                  fontWeight: active ? 600 : 500,
                  border: active ? 'none' : `1.5px solid ${TODAY.pillBg}`,
                }}
              >
                {c.store ? `${c.store} · ${c.name}` : c.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AccuracyConfirmSection({
  accuracy,
  onAccuracyChange,
}: {
  accuracy: PhotoAccuracyState
  onAccuracyChange: NonNullable<Props['onAccuracyChange']>
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
          這餐我先幫你記下來
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
          {accuracy.ui_message}不確定的項目會先標成估算，修正後 Betterbit 會算得更準。
        </p>
      </div>
    )
  }

  // CASE 1 (trusted Level A) / CASE 3 (AI estimate): a confirmed answer
  // already exists — never show the "pick one of these" picker alongside
  // it. Only CASE 2 (ambiguous Level B, not yet picked) renders a picker.
  if (!accuracy.show_candidate_picker) {
    return (
      <div className="space-y-1 p-4" style={{ backgroundColor: TODAY.surface, borderRadius: 24 }}>
        <p className="text-[14px]" style={{ color: TODAY.text, fontWeight: 600 }}>
          {accuracy.is_ai_estimate ? '🟡 AI 營養估算' : '這餐看起來像這樣'}
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
          {accuracy.is_ai_estimate
            ? '資料庫查無資料，以下為 AI 估算僅供參考，請確認或手動修正。'
            : '營養資料來自官方資料庫，確認後點下方「加入今日紀錄」。'}
        </p>
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
          這餐看起來像這樣
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
          選最接近的品項；不確定可以點下方「手動修正」。
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

      {!confirmed && questions.length > 0 && (
        <p className="text-[12px] leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
          選好之後，點下方「加入今日紀錄」。
        </p>
      )}

      {selectedId && !confirmed && (
        <button
          type="button"
          onClick={() => onAccuracyChange({ user_confirmed: true })}
          className="w-full h-11 text-[14px] active:opacity-90"
          style={{
            borderRadius: 20,
            backgroundColor: TODAY.card,
            color: TODAY.mocha,
            fontWeight: 600,
            border: `1px solid ${BB_V2.divider}`,
          }}
        >
          這樣記錄可以
        </button>
      )}

      {confirmed && ready && accuracy.show_macros && (
        <p className="text-[13px] text-center leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
          好，我記下來了。營養資料來自官方資料庫。
        </p>
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
  onPhotoV2Select,
  onSavePhotoOnly,
  onRetryUpload,
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
  onPhotoV2Select?: Props['onPhotoV2Select']
  onSavePhotoOnly?: () => void
  onRetryUpload?: () => void
}) {
  const iosLiteMode = isNativeIOS() && accuracyEnabled && !draft.accuracy
  const accuracyMode = accuracyEnabled && !!draft.accuracy
  const macroDisplay = draft.accuracy
    ? photoAccuracyDisplayMacros(draft.accuracy)
    : {
        calories: draft.calories,
        protein_g: draft.protein_g,
        carbs_g: draft.carbs_g ?? null,
        fat_g: draft.fat_g ?? null,
      }
  const readyForLog = !accuracyMode || draft.accuracy!.ready_for_food_log
  // Build 38 Task C — in accuracyMode, the three CASEs are mutually
  // exclusive: trust PhotoAccuracyState.show_macros as the single source of
  // truth. The old fallback (macroDisplay.calories != null) leaked a
  // "preview" of the top (possibly wrong) candidate's macros during CASE 2,
  // showing a nutrition card alongside the still-unresolved candidate
  // picker — exactly the duplicate-confirmation-UI bug.
  const showMacros = iosLiteMode
    ? false
    : accuracyMode
      ? draft.accuracy!.show_macros
      : true

  const [calText, setCalText] = useState(draft.calories != null ? String(draft.calories) : '')
  const [proText, setProText] = useState(draft.protein_g != null ? String(draft.protein_g) : '')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCalText(draft.calories != null ? String(draft.calories) : '')
      setProText(draft.protein_g != null ? String(draft.protein_g) : '')
    }, 0)
    return () => window.clearTimeout(timer)
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
        <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" aria-label="關閉">
          <X className="h-5 w-5" strokeWidth={ICON_STROKE} style={{ color: TODAY.textSecondary }} />
        </button>
      </div>

      <div className="ios-bottom-sheet__scroll flex-1 overflow-y-auto overscroll-contain px-5 pb-4 space-y-5 min-h-0">
        <div
          className="relative w-full overflow-hidden"
          style={{
            height: isNativeIOS() ? 120 : 360,
            borderRadius: BB_V2.radius.sheet,
            backgroundColor: BB_V2.bg.pill,
          }}
        >
          {draft.previewUrl && !isNativeIOS() ? (
            <img
              src={draft.previewUrl}
              alt={draft.name || '食物照片'}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : !draft.loading && draft.name && isNativeIOS() ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 py-3 text-center">
              <Camera className="h-7 w-7 shrink-0" strokeWidth={ICON_STROKE} style={{ color: TODAY.mocha }} />
              <p className="text-[14px] leading-snug line-clamp-3" style={{ color: TODAY.text, fontWeight: 600 }}>
                {draft.name}
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 max-w-full">
                {guessFoodTags(draft.name).slice(0, 4).map(tag => (
                  <FoodTag key={tag} label={tag} />
                ))}
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin" strokeWidth={ICON_STROKE} style={{ color: TODAY.mocha }} />
              <p className="text-[13px]" style={{ color: TODAY.textSecondary, fontWeight: 500 }}>
                {draft.loading ? '正在辨識…' : '照片預覽'}
              </p>
            </div>
          )}
          {!draft.loading && draft.name && !accuracyMode && !isNativeIOS() ? (
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
          ) : null}
        </div>

        {draft.recognitionHint ? (
          <div
            className="p-4 space-y-2"
            style={{ backgroundColor: TODAY.surface, borderRadius: 24 }}
          >
            <p className="text-[14px]" style={{ color: TODAY.text, fontWeight: 600 }}>
              需要你再確認一下
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
              {draft.recognitionHint}
            </p>
            {onRetryUpload ? (
              <button
                type="button"
                onClick={onRetryUpload}
                className="text-[13px] underline underline-offset-2"
                style={{ color: TODAY.mocha, fontWeight: 600 }}
              >
                重新嘗試辨識
              </button>
            ) : null}
          </div>
        ) : null}

        {draft.loading ? (
          <p className="text-[14px] flex items-center gap-2" style={{ color: TODAY.textSecondary, fontWeight: 400 }} aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={ICON_STROKE} aria-hidden />
            {draft.previewUrl ? '正在辨識…' : '正在準備照片…'}
          </p>
        ) : draft.matchingNutrition ? (
          <p className="text-[14px] flex items-center gap-2" style={{ color: TODAY.textSecondary, fontWeight: 400 }} aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={ICON_STROKE} aria-hidden />
            載入營養選項…
          </p>
        ) : iosLiteMode && draft.photo_v2 ? (
          <IosLiteConfirmSection
            photoV2={draft.photo_v2}
            selectedId={draft.photo_v2.selected_candidate_id}
            onPhotoV2Select={onPhotoV2Select}
          />
        ) : iosLiteMode ? (
          <div className="space-y-2 p-4" style={{ backgroundColor: TODAY.surface, borderRadius: 24 }}>
            <p className="text-[14px]" style={{ color: TODAY.text, fontWeight: 600 }}>
              AI 幫你估算好了
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
              若要記錄熱量，請用手動修正搜尋確認；也可以先保存照片，營養標成待確認。
            </p>
          </div>
        ) : accuracyMode && draft.accuracy && onAccuracyChange ? (
          <AccuracyConfirmSection accuracy={draft.accuracy} onAccuracyChange={onAccuracyChange} />
        ) : (
          <p className="text-[13px] leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            這餐看起來像這樣，你可以微調一下。
          </p>
        )}

        {showMacros && (
          <BBCard padding={20}>
            <p className="text-[18px] mb-1" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
              {draft.name || '這餐'}
            </p>
            <p className="text-[32px] tabular-nums mb-4" style={{ color: BB_V2.accent.orange, fontWeight: 700 }}>
              {macroDisplay.calories ?? '—'}
              <span className="text-[16px] ml-1" style={{ fontWeight: 600 }}>kcal</span>
            </p>
            {accuracyMode && !draft.accuracy!.show_macros && macroDisplay.calories != null && (
              <p className="text-[12px] mb-3" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
                參考最接近選項的營養，確認後入帳。
              </p>
            )}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '蛋白質', value: macroDisplay.protein_g, unit: 'g', color: BB_V2.macro.protein },
                { label: '碳水', value: macroDisplay.carbs_g, unit: 'g', color: BB_V2.macro.carbs },
                { label: '脂肪', value: macroDisplay.fat_g, unit: 'g', color: BB_V2.macro.fat },
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

      <PhotoReviewFooter
        draft={draft}
        saving={saving}
        readyForLog={readyForLog}
        iosLiteMode={iosLiteMode}
        onSave={onSave}
        onSavePhotoOnly={onSavePhotoOnly}
        onOpenManualCorrection={onOpenManualCorrection}
        onClose={onClose}
      />
    </div>
  )
}

function ProcessingStep({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col flex-1 min-h-[320px]">
      <div className="shrink-0 px-5 pt-5 pb-3 flex items-center justify-end">
        <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" aria-label="關閉">
          <X className="h-5 w-5" strokeWidth={ICON_STROKE} style={{ color: TODAY.textSecondary }} />
        </button>
      </div>
      <div className="flex-1 px-5 flex flex-col items-center justify-center gap-4 pb-8">
        <Loader2 className="h-8 w-8 animate-spin" strokeWidth={ICON_STROKE} style={{ color: TODAY.mocha }} />
        <p className="text-[15px]" style={{ color: TODAY.textSecondary, fontWeight: 500 }}>
          正在準備照片…
        </p>
        <p className="text-[12px] text-center leading-relaxed max-w-xs" style={{ color: TODAY.textSecondary, opacity: 0.85 }}>
          大圖會先壓縮再上傳，避免 App 當掉
        </p>
      </div>
    </div>
  )
}

export default function PhotoLogSheet({
  open,
  targetDate,
  draft,
  processing = false,
  accuracyEnabled,
  onClose,
  onPickFile,
  onDraftChange,
  onAccuracyChange,
  onSave,
  saving,
  onBackToCapture,
  onOpenManualCorrection,
  onPhotoV2Select,
  onSavePhotoOnly,
  onRetryUpload,
}: Props) {
  return (
    <AppOverlay open={open} onClose={onClose} variant="sheet">
      <div
        data-target-date={targetDate}
        className="ios-bottom-sheet max-w-lg mx-auto w-full"
        style={{
          fontFamily: BB_V2.font,
          backgroundColor: BB_V2.bg.card,
          borderRadius: `${BB_V2.radius.sheet}px ${BB_V2.radius.sheet}px 0 0`,
          boxShadow: BB_V2.shadow.card,
        }}
        onClick={e => e.stopPropagation()}
      >
        {processing ? (
          <ProcessingStep onClose={onClose} />
        ) : draft ? (
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
            onPhotoV2Select={onPhotoV2Select}
            onSavePhotoOnly={onSavePhotoOnly}
            onRetryUpload={onRetryUpload}
          />
        ) : (
          <CaptureStep onPickFile={onPickFile} onClose={onClose} />
        )}
      </div>
    </AppOverlay>
  )
}
