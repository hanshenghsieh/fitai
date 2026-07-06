'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, Scale, ChevronDown, ChevronUp } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import AppOverlay from '@/components/ui/AppOverlay'
import type { ManualNutritionInput } from '@/lib/nutrition/unknown-food-flow'
import {
  calculateHomeCookedMeal,
  isHomeCookedDraftComplete,
  parseMealLabelToDraft,
  type DetectedIngredientLine,
  type HomeCookedMealDraft,
  type MealCookingMethod,
  type MealOilLevel,
  type SauceLevel,
} from '@/lib/nutrition/home-cooked'

const font = 'var(--font-noto-tc), system-ui, sans-serif'
const ICON_STROKE = 1.8

const OIL_OPTIONS: { id: MealOilLevel; label: string }[] = [
  { id: 'none', label: '無油' },
  { id: 'light', label: '少油' },
  { id: 'normal', label: '一般' },
  { id: 'heavy', label: '多油' },
]

const COOKING_OPTIONS: { id: MealCookingMethod; label: string }[] = [
  { id: 'boiled', label: '水煮' },
  { id: 'steamed', label: '蒸' },
  { id: 'grilled', label: '烤' },
  { id: 'stir_fried', label: '炒' },
  { id: 'deep_fried', label: '炸' },
]

const SAUCE_OPTIONS: { id: SauceLevel; label: string }[] = [
  { id: 'none', label: '無' },
  { id: 'light', label: '少' },
  { id: 'normal', label: '正常' },
  { id: 'heavy', label: '多' },
]

interface Props {
  open: boolean
  mealLabel: string
  onClose: () => void
  onSave: (draft: HomeCookedMealDraft) => void
  onManualSave?: (input: ManualNutritionInput) => void
}

function parseNum(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function unitLabel(unit: DetectedIngredientLine['unit']): string {
  if (unit === 'ml') return 'ml'
  if (unit === 'piece') return '份'
  return 'g'
}

function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { id: T; label: string }[]
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
              className="px-3.5 h-10 rounded-full text-[14px]"
              style={{
                backgroundColor: active ? BB_V2.accent.orange : BB_V2.bg.canvas,
                color: active ? '#FFF' : BB_V2.text.secondary,
                fontWeight: active ? 600 : 400,
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default function IngredientPortionSheet({
  open,
  mealLabel,
  onClose,
  onSave,
  onManualSave,
}: Props) {
  const [draft, setDraft] = useState<HomeCookedMealDraft>(() => parseMealLabelToDraft(mealLabel))
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [fat, setFat] = useState('')
  const [carbs, setCarbs] = useState('')

  useEffect(() => {
    if (!open) return
    setDraft(parseMealLabelToDraft(mealLabel))
    setAdvancedOpen(false)
    setCalories('')
    setProtein('')
    setFat('')
    setCarbs('')
  }, [open, mealLabel])

  const weightLines = useMemo(
    () => draft.ingredients.filter(i => i.food_id != null),
    [draft.ingredients]
  )

  const preview = useMemo(() => calculateHomeCookedMeal(draft), [draft])
  const canSaveWeight = isHomeCookedDraftComplete(draft)

  const hasManualOverride =
    parseNum(calories) != null ||
    parseNum(protein) != null ||
    parseNum(fat) != null ||
    parseNum(carbs) != null

  function updateLine(index: number, patch: Partial<DetectedIngredientLine>) {
    setDraft(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    }))
  }

  function handleSave() {
    if (hasManualOverride && onManualSave) {
      onManualSave({
        calories: parseNum(calories),
        protein_g: parseNum(protein),
        fat_g: parseNum(fat),
        carbs_g: parseNum(carbs),
        portion: weightLines
          .filter(l => l.amount)
          .map(l => `${l.name_zh} ${l.amount}${unitLabel(l.unit)}`)
          .join('、'),
        source_note: 'manual_override',
      })
      return
    }
    if (canSaveWeight) onSave(draft)
  }

  const macroField = (label: string, value: string, onChange: (v: string) => void, unit: string) => (
    <label className="block">
      <span className="text-[13px] mb-1.5 block" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
        {label}
      </span>
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ backgroundColor: BB_V2.bg.canvas }}>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={value}
          onChange={e => onChange(e.target.value)}
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
              填重量算營養
            </h2>
            <p className="text-[15px] mt-2" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
              {mealLabel}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 -mr-1 shrink-0" aria-label="關閉">
            <X className="h-5 w-5" strokeWidth={ICON_STROKE} style={{ color: BB_V2.text.secondary }} />
          </button>
        </div>

        <div className="ios-bottom-sheet__scroll px-5 pb-2 space-y-5">
          <section className="space-y-2">
            <p className="text-[13px]" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
              重量
            </p>
            {weightLines.length === 0 ? (
              <p className="text-[14px]" style={{ color: BB_V2.text.secondary }}>
                資料庫尚無對應食材，請用下方進階手動輸入。
              </p>
            ) : (
              weightLines.map(line => {
                const index = draft.ingredients.indexOf(line)
                return (
                  <div key={`${line.raw_label}-${index}`} className="flex items-center gap-3">
                    <span className="flex-1 text-[15px] truncate" style={{ color: BB_V2.text.primary, fontWeight: 500 }}>
                      {line.raw_label}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="200"
                      value={line.amount ?? ''}
                      onChange={e => {
                        const v = e.target.value
                        updateLine(index, { amount: v === '' ? null : Number(v) })
                      }}
                      className="w-24 h-12 px-3 rounded-xl text-[16px] tabular-nums text-right outline-none"
                      style={{
                        backgroundColor: BB_V2.bg.canvas,
                        color: BB_V2.text.primary,
                        border: `1px solid ${BB_V2.divider}`,
                      }}
                    />
                    <span className="text-[14px] w-6 shrink-0" style={{ color: BB_V2.text.secondary }}>
                      {unitLabel(line.unit)}
                    </span>
                  </div>
                )
              })
            )}
          </section>

          <ChipRow
            label="用油量"
            options={OIL_OPTIONS}
            value={draft.meal_oil_level}
            onChange={meal_oil_level => setDraft(prev => ({ ...prev, meal_oil_level }))}
          />

          <ChipRow
            label="烹調方式"
            options={COOKING_OPTIONS}
            value={draft.meal_cooking_method}
            onChange={meal_cooking_method => setDraft(prev => ({ ...prev, meal_cooking_method }))}
          />

          <ChipRow
            label="醬汁"
            options={SAUCE_OPTIONS}
            value={draft.sauce_level}
            onChange={sauce_level => setDraft(prev => ({ ...prev, sauce_level }))}
          />

          {preview && !hasManualOverride && (
            <p className="text-[13px] text-center tabular-nums" style={{ color: BB_V2.text.secondary }}>
              預估約 <span style={{ color: BB_V2.text.primary, fontWeight: 600 }}>{preview.calories} kcal</span>
              {' · '}蛋白 {preview.protein_g}g
              {preview.meal_oil_g != null && preview.meal_oil_g > 0 ? ` · 油 +${preview.meal_oil_g}g` : ''}
            </p>
          )}

          <button
            type="button"
            onClick={() => setAdvancedOpen(v => !v)}
            className="flex items-center gap-1 text-[13px] py-1"
            style={{ color: BB_V2.text.secondary, fontWeight: 500 }}
          >
            {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            進階（手動輸入熱量、蛋白質…）
          </button>

          {advancedOpen && (
            <div className="space-y-3">
              {macroField('熱量', calories, setCalories, 'kcal')}
              {macroField('蛋白質', protein, setProtein, 'g')}
              {macroField('脂肪', fat, setFat, 'g')}
              {macroField('碳水', carbs, setCarbs, 'g')}
              <p className="text-[11px] leading-relaxed" style={{ color: BB_V2.text.secondary }}>
                填了進階數值會優先用手動資料，略過重量估算。
              </p>
            </div>
          )}
        </div>

        <div className="px-5 pt-3 pb-8 space-y-2">
          <button
            type="button"
            disabled={!canSaveWeight && !hasManualOverride}
            onClick={handleSave}
            className="w-full h-12 rounded-[20px] text-[15px] flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ backgroundColor: BB_V2.accent.orange, color: '#FFFFFF', fontWeight: 600 }}
          >
            <Scale className="h-4 w-4" strokeWidth={ICON_STROKE} />
            儲存並計入今日
          </button>
          <button type="button" onClick={onClose} className="w-full h-10 text-[13px]" style={{ color: BB_V2.text.secondary }}>
            取消，保持待確認
          </button>
        </div>
      </div>
    </AppOverlay>
  )
}
