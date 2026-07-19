'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import AppOverlay from '@/components/ui/AppOverlay'
import { OIL_LEVEL_OPTIONS } from '@/lib/nutrition/portion-presets'
import { getFoodTypeFieldVisibility } from '@/lib/nutrition/food-type-ui'
import {
  amountForPreset,
  calculateFoodRecordNutrition,
  defaultFoodRecordDraft,
  foodTypeSubtitle,
} from '@/lib/nutrition/p0-common-foods/calculate'
import { estimatedWeightForDraft } from '@/lib/nutrition/estimated-meal-model'
import type { CommonFoodItem, FoodRecordDraft, PortionPresetId, SugarLevel } from '@/lib/nutrition/p0-common-foods/types'

const font = 'var(--font-noto-tc), system-ui, sans-serif'
const ICON_STROKE = 1.8

const COOKING_OPTIONS = [
  { id: 'boiled' as const, label: '水煮' },
  { id: 'steamed' as const, label: '蒸' },
  { id: 'grilled' as const, label: '烤' },
  { id: 'stir_fried' as const, label: '炒' },
  { id: 'deep_fried' as const, label: '炸' },
]

const SAUCE_OPTIONS = [
  { id: 'none' as const, label: '無' },
  { id: 'light' as const, label: '少' },
  { id: 'normal' as const, label: '正常' },
  { id: 'heavy' as const, label: '多' },
]

const RICE_OPTIONS = [
  { id: 'less' as const, label: '少飯' },
  { id: 'normal' as const, label: '正常' },
  { id: 'extra' as const, label: '加飯' },
]

const SUGAR_OPTIONS: { id: SugarLevel; label: string }[] = [
  { id: 'none', label: '無糖' },
  { id: 'light', label: '微糖' },
  { id: 'half', label: '半糖' },
  { id: 'full', label: '全糖' },
]

export interface FoodTypePortionSheetProps {
  open: boolean
  item: CommonFoodItem
  onClose: () => void
  onSave: (draft: FoodRecordDraft, nutrition: ReturnType<typeof calculateFoodRecordNutrition>) => void
  title?: string
  subtitle?: string
  saveLabel?: string
  initialDraft?: FoodRecordDraft
  contextLabel?: string
  onEditType?: () => void
}

function parseNum(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { id: T; label: string; detail?: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <section className="space-y-2">
      <p className="text-[13px]" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const active = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`px-3.5 rounded-2xl text-[14px] ${opt.detail ? 'min-h-14 py-2' : 'h-10'}`}
              style={{
                backgroundColor: active ? BB_V2.accent.orange : BB_V2.bg.canvas,
                color: active ? '#FFF' : BB_V2.text.secondary,
                fontWeight: active ? 600 : 400,
              }}
            >
              <span className="block">{opt.label}</span>
              {opt.detail ? (
                <span
                  className="block text-[11px] mt-0.5"
                  style={{ color: active ? 'rgba(255,255,255,0.82)' : BB_V2.text.secondary, fontWeight: 400 }}
                >
                  {opt.detail}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default function FoodTypePortionSheet({
  open,
  item,
  onClose,
  onSave,
  title = '加入今日紀錄',
  subtitle,
  saveLabel = '加入今日紀錄',
  initialDraft,
  contextLabel,
  onEditType,
}: FoodTypePortionSheetProps) {
  const fields = useMemo(() => getFoodTypeFieldVisibility(item), [item])
  const [draft, setDraft] = useState<FoodRecordDraft>(() => initialDraft ?? defaultFoodRecordDraft(item))
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [customAmount, setCustomAmount] = useState('')
  const [manual, setManual] = useState({ calories: '', protein: '', carbs: '', fat: '', sodium: '' })
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!open) {
      initializedRef.current = false
      return
    }
    if (initializedRef.current) return
    initializedRef.current = true
    const next = initialDraft ?? defaultFoodRecordDraft(item)
    setDraft(next)
    setCustomAmount(next.portionPreset === 'custom' ? String(next.amount) : '')
    setAdvancedOpen(false)
    const mo = next.manualOverride
    setManual({
      calories: mo?.calories != null ? String(mo.calories) : '',
      protein: mo?.protein_g != null ? String(mo.protein_g) : '',
      carbs: mo?.carbs_g != null ? String(mo.carbs_g) : '',
      fat: mo?.fat_g != null ? String(mo.fat_g) : '',
      sodium: mo?.sodium_mg != null ? String(mo.sodium_mg) : '',
    })
  }, [open, item, initialDraft])

  const effectiveDraft = useMemo((): FoodRecordDraft => {
    const hasManual =
      parseNum(manual.calories) != null ||
      parseNum(manual.protein) != null ||
      parseNum(manual.carbs) != null ||
      parseNum(manual.fat) != null ||
      parseNum(manual.sodium) != null
    return {
      ...draft,
      manualOverride: hasManual
        ? {
            calories: parseNum(manual.calories),
            protein_g: parseNum(manual.protein),
            carbs_g: parseNum(manual.carbs),
            fat_g: parseNum(manual.fat),
            sodium_mg: parseNum(manual.sodium),
          }
        : undefined,
    }
  }, [draft, manual])

  const nutrition = useMemo(() => calculateFoodRecordNutrition(item, effectiveDraft), [item, effectiveDraft])
  const portionOptions = useMemo(
    () =>
      item.servingOptions.map((opt, i) => {
        const presetIds: PortionPresetId[] = ['small', 'normal', 'large', 'custom']
        const id = presetIds[i] ?? 'custom'
        const label = item.servingModel === 'whole_meal'
          ? opt.label
          : opt.amount != null
            ? `${opt.label} ${opt.amount}${opt.unit}`
            : opt.label
        const detail = opt.estimatedWeight_g != null ? `約 ${opt.estimatedWeight_g}g` : undefined
        return { id, label, detail }
      }),
    [item.servingModel, item.servingOptions]
  )
  const estimatedWeight = useMemo(
    () => estimatedWeightForDraft(item, effectiveDraft),
    [item, effectiveDraft]
  )

  function applyPreset(preset: PortionPresetId) {
    const amount =
      preset === 'custom'
        ? parseNum(customAmount) ?? draft.amount
        : amountForPreset(item, preset)
    setDraft(prev => ({ ...prev, portionPreset: preset, amount, unit: item.defaultUnit }))
    if (preset !== 'custom') setCustomAmount('')
  }

  const macroField = (label: string, key: keyof typeof manual, unit: string) => (
    <label className="block">
      <span className="text-[13px] mb-1.5 block" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
        {label}
      </span>
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ backgroundColor: BB_V2.bg.canvas }}>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={manual[key]}
          onChange={e => setManual(prev => ({ ...prev, [key]: e.target.value }))}
          className="flex-1 bg-transparent text-base outline-none min-w-0 tabular-nums"
          style={{ color: BB_V2.text.primary }}
          placeholder="—"
        />
        <span className="text-[13px] shrink-0" style={{ color: BB_V2.text.secondary }}>
          {unit}
        </span>
      </div>
    </label>
  )

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
          <div className="min-w-0">
            <h2 className="text-[20px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
              {title}
            </h2>
            {subtitle ? (
              <p className="text-[13px] mt-2 leading-relaxed" style={{ color: BB_V2.text.secondary }}>
                {subtitle}
              </p>
            ) : null}
            <p className="text-[17px] mt-2" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
              {item.name}
            </p>
            {contextLabel ? (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[13px]" style={{ color: BB_V2.text.secondary }}>
                  {contextLabel}
                </p>
                {onEditType ? (
                  <button
                    type="button"
                    onClick={onEditType}
                    className="text-[12px] underline underline-offset-2"
                    style={{ color: BB_V2.accent.orange }}
                  >
                    修改類型
                  </button>
                ) : null}
              </div>
            ) : null}
            <p className="text-[13px] mt-1" style={{ color: BB_V2.text.secondary }}>
              {foodTypeSubtitle(item, nutrition)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 -mr-1 shrink-0" aria-label="關閉">
            <X className="h-5 w-5" strokeWidth={ICON_STROKE} style={{ color: BB_V2.text.secondary }} />
          </button>
        </div>

        <div className="ios-bottom-sheet__scroll px-5 pb-2 space-y-5">
          {fields.mealHint ? (
            <p className="text-[13px] leading-relaxed px-1" style={{ color: BB_V2.text.secondary }}>
              {fields.mealHint}
            </p>
          ) : null}

          {fields.portion && (
            <ChipRow
              label={fields.portionLabel}
              options={portionOptions}
              value={draft.portionPreset}
              onChange={applyPreset}
            />
          )}

          {draft.portionPreset === 'custom' && fields.portion && (
            <label className="block">
              <span className="text-[13px] mb-1.5 block" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
                自訂 {item.defaultUnit}
              </span>
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ backgroundColor: BB_V2.bg.canvas }}>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={customAmount}
                  onChange={e => {
                    setCustomAmount(e.target.value)
                    const n = parseNum(e.target.value)
                    if (n != null) setDraft(prev => ({ ...prev, amount: n, portionPreset: 'custom' }))
                  }}
                  className="flex-1 bg-transparent text-base outline-none min-w-0 tabular-nums"
                  style={{ color: BB_V2.text.primary }}
                />
                <span className="text-[13px] shrink-0" style={{ color: BB_V2.text.secondary }}>
                  {item.defaultUnit}
                </span>
              </div>
            </label>
          )}

          {fields.rice && (
            <ChipRow
              label="飯量"
              options={RICE_OPTIONS}
              value={draft.riceAmount ?? 'normal'}
              onChange={v => setDraft(prev => ({ ...prev, riceAmount: v }))}
            />
          )}

          {fields.oil && (
            <ChipRow
              label="用油量"
              options={OIL_LEVEL_OPTIONS.map(o => ({ id: o.id, label: o.label }))}
              value={draft.oilLevel ?? 'normal'}
              onChange={v => setDraft(prev => ({ ...prev, oilLevel: v }))}
            />
          )}

          {fields.cooking && (
            <ChipRow
              label="烹調方式"
              options={COOKING_OPTIONS}
              value={draft.cookingMethod ?? 'grilled'}
              onChange={v => setDraft(prev => ({ ...prev, cookingMethod: v }))}
            />
          )}

          {fields.sauce && (
            <ChipRow
              label="醬汁"
              options={SAUCE_OPTIONS}
              value={draft.sauceLevel ?? 'normal'}
              onChange={v => setDraft(prev => ({ ...prev, sauceLevel: v }))}
            />
          )}

          {fields.sugar && (
            <ChipRow
              label="糖量"
              options={SUGAR_OPTIONS}
              value={draft.sugarLevel ?? 'none'}
              onChange={v => setDraft(prev => ({ ...prev, sugarLevel: v }))}
            />
          )}

          <section
            className="rounded-2xl px-4 py-3"
            style={{ backgroundColor: BB_V2.bg.canvas, border: `1px solid ${BB_V2.divider}` }}
          >
            <p className="text-[14px]" style={{ color: BB_V2.text.primary, fontWeight: 500 }}>
              估算約 {nutrition.calories} kcal
            </p>
            {estimatedWeight != null ? (
              <p className="text-[12px] mt-1" style={{ color: BB_V2.text.secondary }}>
                估算重量約 {estimatedWeight}g
              </p>
            ) : null}
            {item.foodType === 'ingredient' && (
              <p className="text-[12px] mt-1" style={{ color: BB_V2.text.secondary }}>
                蛋白質 {nutrition.protein_g}g · 碳水 {nutrition.carbs_g}g · 脂肪 {nutrition.fat_g}g
              </p>
            )}
          </section>

          {item.estimationAssumption ? (
            <p className="text-[12px] leading-relaxed px-1" style={{ color: BB_V2.text.secondary }}>
              估算假設：{item.estimationAssumption}
            </p>
          ) : null}

          <section>
            <button
              type="button"
              onClick={() => setAdvancedOpen(v => !v)}
              className="flex items-center gap-1.5 text-[13px] w-full"
              style={{ color: BB_V2.text.secondary, fontWeight: 500 }}
            >
              {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              進階：手動修正營養素
            </button>
            {advancedOpen && (
              <div className="space-y-3 mt-3">
                {fields.advancedFields.includes('calories') && macroField('熱量', 'calories', 'kcal')}
                {fields.advancedFields.includes('protein') && macroField('蛋白質', 'protein', 'g')}
                {fields.advancedFields.includes('carbs') && macroField('碳水', 'carbs', 'g')}
                {fields.advancedFields.includes('fat') && macroField('脂肪', 'fat', 'g')}
                {fields.advancedFields.includes('sodium') && macroField('鈉', 'sodium', 'mg')}
              </div>
            )}
          </section>
        </div>

        <div
          className="ios-bottom-sheet__footer px-5 pt-2 pb-3 border-t"
          style={{ borderColor: 'rgba(142, 131, 120, 0.12)' }}
        >
          <button
            type="button"
            onClick={() => onSave(effectiveDraft, nutrition)}
            className="w-full h-14 rounded-[22px] text-[15px] active:opacity-90"
            style={{ backgroundColor: BB_V2.accent.orange, color: '#FFFFFF', fontWeight: 500 }}
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </AppOverlay>
  )
}
