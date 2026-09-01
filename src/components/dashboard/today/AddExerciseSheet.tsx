'use client'

import { useEffect, useState } from 'react'
import { X, ChevronLeft } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import AppOverlay from '@/components/ui/AppOverlay'
import {
  ACTIVITY_LABEL_ZH,
  ACTIVITY_TYPES,
  EXERCISE_INTENSITIES,
  INTENSITY_LABEL_ZH,
  INTENSITY_MET,
  MAX_ACTIVITY_LABEL_LENGTH,
  MET_VALUES,
  estimateCaloriesForMet,
} from '@/lib/exercise/activity-met'
import { resolveActivityCatalogEntry, searchActivityCatalog, type ActivityCatalogEntry } from '@/lib/exercise/activity-catalog'
import { ACTIVITY_TYPE_ICON } from './exercise-icons'
import type { ActivityType, ExerciseIntensity, ExerciseLog } from '@/types'

const DURATION_PRESETS = [15, 30, 45, 60] as const

export interface ExerciseDraft {
  activity_type: ActivityType
  activity_label: string | null
  duration_minutes: number
  intensity: ExerciseIntensity | null
}

type Step = 'activity' | 'custom-search' | 'duration' | 'intensity'

interface Props {
  open: boolean
  bodyWeightKg?: number | null
  editingLog?: ExerciseLog | null
  onClose: () => void
  onSave: (draft: ExerciseDraft) => void
}

export default function AddExerciseSheet({ open, bodyWeightKg, editingLog, onClose, onSave }: Props) {
  const [step, setStep] = useState<Step>('activity')
  const [activityType, setActivityType] = useState<ActivityType | null>(null)
  const [customText, setCustomText] = useState('')
  const [resolvedEntry, setResolvedEntry] = useState<ActivityCatalogEntry | null>(null)
  const [intensity, setIntensity] = useState<ExerciseIntensity | null>(null)
  const [duration, setDuration] = useState('30')

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      if (editingLog) {
        setDuration(String(editingLog.duration_minutes))
        if (editingLog.activity_type !== 'other') {
          setActivityType(editingLog.activity_type)
          setResolvedEntry(null)
          setCustomText('')
          setIntensity(null)
          setStep('duration')
          return
        }
        const rawName = editingLog.activity_name ?? editingLog.activity_label ?? ''
        setActivityType('other')
        setCustomText(rawName)
        if (editingLog.intensity) {
          setResolvedEntry(null)
          setIntensity(editingLog.intensity)
          setStep('intensity')
        } else {
          const match = resolveActivityCatalogEntry(rawName)
          if (match) {
            setResolvedEntry(match)
            setIntensity(null)
            setStep('duration')
          } else {
            setResolvedEntry(null)
            setIntensity(null)
            setStep('intensity')
          }
        }
      } else {
        setActivityType(null)
        setCustomText('')
        setResolvedEntry(null)
        setIntensity(null)
        setDuration('30')
        setStep('activity')
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [open, editingLog])

  const durationMinutes = Number(duration)
  const durationValid = Number.isFinite(durationMinutes) && durationMinutes > 0

  const previewMet =
    step === 'intensity'
      ? (intensity ? INTENSITY_MET[intensity] : null)
      : resolvedEntry
        ? resolvedEntry.met
        : activityType
          ? MET_VALUES[activityType]
          : null

  const previewCalories =
    previewMet != null && durationValid ? estimateCaloriesForMet(previewMet, durationMinutes, bodyWeightKg) : null

  const suggestions = step === 'custom-search' ? searchActivityCatalog(customText) : []

  function handleClose() {
    onClose()
  }

  function selectActivity(type: ActivityType) {
    setActivityType(type)
    if (type === 'other') {
      setCustomText('')
      setResolvedEntry(null)
      setStep('custom-search')
    } else {
      setResolvedEntry(null)
      setStep('duration')
    }
  }

  function selectSuggestion(entry: ActivityCatalogEntry) {
    setCustomText(entry.name_zh)
    setResolvedEntry(entry)
    setStep('duration')
  }

  function continueFromCustomSearch() {
    const trimmed = customText.trim()
    if (!trimmed) return
    const match = resolveActivityCatalogEntry(trimmed)
    if (match) {
      setResolvedEntry(match)
      setStep('duration')
    } else {
      setResolvedEntry(null)
      setIntensity(null)
      setStep('intensity')
    }
  }

  function goBack() {
    if (step === 'duration') setStep(activityType === 'other' ? 'custom-search' : 'activity')
    else if (step === 'intensity') setStep('custom-search')
    else if (step === 'custom-search') setStep('activity')
  }

  function handleSave() {
    if (!activityType || !durationValid) return
    if (activityType === 'other') {
      if (step === 'intensity') {
        if (!intensity) return
        onSave({
          activity_type: 'other',
          activity_label: customText.trim().slice(0, MAX_ACTIVITY_LABEL_LENGTH) || null,
          duration_minutes: Math.round(durationMinutes),
          intensity,
        })
        return
      }
      onSave({
        activity_type: 'other',
        activity_label: (resolvedEntry?.name_zh ?? customText.trim()).slice(0, MAX_ACTIVITY_LABEL_LENGTH) || null,
        duration_minutes: Math.round(durationMinutes),
        intensity: null,
      })
      return
    }
    onSave({
      activity_type: activityType,
      activity_label: null,
      duration_minutes: Math.round(durationMinutes),
      intensity: null,
    })
  }

  const titleForStep =
    editingLog
      ? '編輯運動紀錄'
      : step === 'activity'
        ? '記錄運動'
        : step === 'custom-search'
          ? '其他運動'
          : step === 'intensity'
            ? customText || '其他運動'
            : resolvedEntry?.name_zh ?? ACTIVITY_LABEL_ZH[activityType ?? 'other']

  return (
    <AppOverlay open={open} onClose={handleClose} variant="sheet" ariaLabel="記錄運動">
      <div
        className="ios-bottom-sheet max-w-lg mx-auto w-full"
        style={{
          fontFamily: BB_V2.font,
          backgroundColor: BB_V2.bg.card,
          borderRadius: '28px 28px 0 0',
          boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {step !== 'activity' && !editingLog && (
              <button type="button" onClick={goBack} className="p-1 -ml-1 shrink-0" aria-label="返回">
                <ChevronLeft className="h-5 w-5" strokeWidth={BB_V2.iconStroke} style={{ color: BB_V2.text.secondary }} />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="text-[20px] leading-tight truncate" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
                {titleForStep}
              </h2>
              <p className="text-[13px] mt-1" style={{ color: BB_V2.text.secondary }}>
                {step === 'activity'
                  ? '選擇你剛剛做的運動'
                  : step === 'custom-search'
                    ? '輸入運動項目，找不到也沒關係'
                    : step === 'intensity'
                      ? '這項運動不在清單中，告訴我們大概強度就好'
                      : '記錄實際花費的時間就好'}
              </p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="p-1.5 -mr-1 shrink-0" aria-label="關閉">
            <X className="h-5 w-5" strokeWidth={BB_V2.iconStroke} style={{ color: BB_V2.text.secondary }} />
          </button>
        </div>

        {step === 'activity' && (
          <div className="px-5 pb-6 grid grid-cols-3 gap-3">
            {ACTIVITY_TYPES.map(type => {
              const Icon = ACTIVITY_TYPE_ICON[type]
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => selectActivity(type)}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl py-4 active:scale-[0.97] transition-transform"
                  style={{ backgroundColor: BB_V2.bg.pill }}
                >
                  <Icon className="h-6 w-6" strokeWidth={BB_V2.iconStroke} style={{ color: BB_V2.accent.green }} />
                  <span className="text-[13px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
                    {ACTIVITY_LABEL_ZH[type]}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {step === 'custom-search' && (
          <div className="px-5 pb-6 space-y-3">
            <input
              type="text"
              autoFocus
              value={customText}
              onChange={e => {
                setCustomText(e.target.value.slice(0, MAX_ACTIVITY_LABEL_LENGTH))
                setResolvedEntry(null)
              }}
              placeholder="運動項目，例如：羽球"
              className="w-full h-12 px-4 rounded-2xl text-[15px] outline-none"
              style={{ backgroundColor: BB_V2.bg.pill, color: BB_V2.text.primary, fontWeight: 500 }}
            />

            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestions.map(entry => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => selectSuggestion(entry)}
                    className="px-3 py-1.5 rounded-full text-[13px] active:opacity-80"
                    style={{ backgroundColor: BB_V2.accent.greenSoft, color: BB_V2.accent.greenDeep, fontWeight: 600 }}
                  >
                    {entry.name_zh}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={continueFromCustomSearch}
              disabled={!customText.trim()}
              className="w-full h-12 rounded-[20px] text-[14px] disabled:opacity-40"
              style={{ backgroundColor: BB_V2.accent.green, color: '#FFFFFF', fontWeight: 600 }}
            >
              繼續
            </button>
          </div>
        )}

        {step === 'intensity' && (
          <div className="px-5 pb-6 space-y-4">
            <div>
              <p className="text-[13px] mb-2" style={{ color: BB_V2.text.secondary }}>
                運動強度
              </p>
              <div className="flex gap-2">
                {EXERCISE_INTENSITIES.map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setIntensity(level)}
                    className="flex-1 h-11 rounded-[16px] text-[13px] active:scale-[0.98] transition-transform"
                    style={{
                      backgroundColor: intensity === level ? BB_V2.accent.greenSoft : BB_V2.bg.pill,
                      color: intensity === level ? BB_V2.accent.greenDeep : BB_V2.text.secondary,
                      fontWeight: 600,
                      border: `1px solid ${intensity === level ? BB_V2.accent.greenSoftBorder : 'transparent'}`,
                    }}
                  >
                    {INTENSITY_LABEL_ZH[level]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[13px] mb-2" style={{ color: BB_V2.text.secondary }}>
                時間（分鐘）
              </p>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={600}
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="例如 30"
                className="w-full h-14 px-4 rounded-2xl text-[18px] tabular-nums outline-none"
                style={{ backgroundColor: BB_V2.bg.pill, color: BB_V2.text.primary, fontWeight: 500 }}
              />
              <div className="flex gap-2 mt-3">
                {DURATION_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDuration(String(preset))}
                    className="flex-1 h-10 rounded-[16px] text-[13px] active:scale-[0.98] transition-transform"
                    style={{
                      backgroundColor: duration === String(preset) ? BB_V2.accent.greenSoft : BB_V2.bg.canvas,
                      color: duration === String(preset) ? BB_V2.accent.greenDeep : BB_V2.text.secondary,
                      fontWeight: 600,
                      border: `1px solid ${duration === String(preset) ? BB_V2.accent.greenSoftBorder : BB_V2.border}`,
                    }}
                  >
                    {preset} 分鐘
                  </button>
                ))}
              </div>
            </div>

            {previewCalories != null && (
              <div
                className="px-4 py-3 rounded-2xl text-[13px]"
                style={{ backgroundColor: BB_V2.bg.pill, color: BB_V2.text.secondary }}
              >
                預估消耗 <span style={{ color: BB_V2.text.primary, fontWeight: 700 }}>{previewCalories}</span> kcal（估計值，僅供參考）
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={!intensity || !durationValid}
              className="w-full h-12 rounded-[20px] text-[14px] disabled:opacity-40"
              style={{ backgroundColor: BB_V2.accent.green, color: '#FFFFFF', fontWeight: 600 }}
            >
              儲存
            </button>
          </div>
        )}

        {step === 'duration' && activityType && (
          <div className="px-5 pb-6 space-y-4">
            <div>
              <p className="text-[13px] mb-2" style={{ color: BB_V2.text.secondary }}>
                時間（分鐘）
              </p>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={600}
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="例如 30"
                className="w-full h-14 px-4 rounded-2xl text-[18px] tabular-nums outline-none"
                style={{ backgroundColor: BB_V2.bg.pill, color: BB_V2.text.primary, fontWeight: 500 }}
              />
              <div className="flex gap-2 mt-3">
                {DURATION_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDuration(String(preset))}
                    className="flex-1 h-10 rounded-[16px] text-[13px] active:scale-[0.98] transition-transform"
                    style={{
                      backgroundColor: duration === String(preset) ? BB_V2.accent.greenSoft : BB_V2.bg.canvas,
                      color: duration === String(preset) ? BB_V2.accent.greenDeep : BB_V2.text.secondary,
                      fontWeight: 600,
                      border: `1px solid ${duration === String(preset) ? BB_V2.accent.greenSoftBorder : BB_V2.border}`,
                    }}
                  >
                    {preset} 分鐘
                  </button>
                ))}
              </div>
            </div>

            {previewCalories != null && (
              <div
                className="px-4 py-3 rounded-2xl text-[13px]"
                style={{ backgroundColor: BB_V2.bg.pill, color: BB_V2.text.secondary }}
              >
                預估消耗 <span style={{ color: BB_V2.text.primary, fontWeight: 700 }}>{previewCalories}</span> kcal（估計值，僅供參考）
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={!durationValid}
              className="w-full h-12 rounded-[20px] text-[14px] disabled:opacity-40"
              style={{ backgroundColor: BB_V2.accent.green, color: '#FFFFFF', fontWeight: 600 }}
            >
              儲存
            </button>
          </div>
        )}
      </div>
    </AppOverlay>
  )
}
