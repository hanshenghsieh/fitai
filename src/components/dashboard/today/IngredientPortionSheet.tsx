'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Scale, ChevronDown, ChevronUp } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import AppOverlay from '@/components/ui/AppOverlay'
import type { ManualNutritionInput } from '@/lib/nutrition/unknown-food-flow'
import { getHomeCookedFieldVisibility } from '@/lib/nutrition/food-type-ui'
import {
  calculateHomeCookedMeal,
  isHomeCookedDraftComplete,
  parseMealLabelToDraft,
  withSuggestedDefaults,
  type DetectedIngredientLine,
  type HomeCookedMealDraft,
  type MealCookingMethod,
  type MealOilLevel,
  type SauceLevel,
} from '@/lib/nutrition/home-cooked'
import {
  DEFAULT_PORTION_GRAMS,
  gramsForPreset,
  inferPresetFromGrams,
  OIL_LEVEL_OPTIONS,
  PORTION_PRESET_LABELS,
  type PortionPresetId,
} from '@/lib/nutrition/portion-presets'

const font = 'var(--font-noto-tc), system-ui, sans-serif'
const ICON_STROKE = 1.8

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

export interface IngredientPortionSheetProps {
  open: boolean
  mealLabel: string
  onClose: () => void
  onSave: (draft: HomeCookedMealDraft) => void
  onManualSave?: (input: ManualNutritionInput) => void
  title?: string
  subtitle?: string
  saveLabel?: string
  cancelLabel?: string
  initialDraft?: HomeCookedMealDraft
  initialManual?: {
    calories?: number | null
    protein_g?: number | null
    fat_g?: number | null
    carbs_g?: number | null
  }
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
  title = '填重量算營養',
  subtitle,
  saveLabel = '儲存並計入今日',
  cancelLabel = '取消，保持待確認',
  initialDraft,
  initialManual,
}: IngredientPortionSheetProps) {
  const [draft, setDraft] = useState<HomeCookedMealDraft>(() => initialDraft ?? parseMealLabelToDraft(mealLabel))
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [fat, setFat] = useState('')
  const [carbs, setCarbs] = useState('')
  const [portionPreset, setPortionPreset] = useState<PortionPresetId>('normal')
  const initializedForOpenRef = useRef(false)
  const userEditedMacrosRef = useRef(false)

  useEffect(() => {
    if (!open) {
      initializedForOpenRef.current = false
      userEditedMacrosRef.current = false
      return
    }
    if (initializedForOpenRef.current) return
    initializedForOpenRef.current = true

    const nextDraft = withSuggestedDefaults(initialDraft ?? parseMealLabelToDraft(mealLabel))
    setDraft(nextDraft)
    setAdvancedOpen(false)
    setCalories(initialManual?.calories != null ? String(initialManual.calories) : '')
    setProtein(initialManual?.protein_g != null ? String(initialManual.protein_g) : '')
    setFat(initialManual?.fat_g != null ? String(initialManual.fat_g) : '')
    setCarbs(initialManual?.carbs_g != null ? String(initialManual.carbs_g) : '')
    if (
      initialManual?.calories != null ||
      initialManual?.protein_g != null ||
      initialManual?.fat_g != null ||
      initialManual?.carbs_g != null
    ) {
      userEditedMacrosRef.current = true
      setAdvancedOpen(true)
    }
    const firstAmount = nextDraft.ingredients.find(i => i.food_id != null)?.amount
    setPortionPreset(inferPresetFromGrams(firstAmount))
  }, [open, mealLabel, initialDraft, initialManual])

  const weightLines = useMemo(
    () => draft.ingredients.filter(i => i.food_id != null),
    [draft.ingredients]
  )
  const noDbMatch = weightLines.length === 0
  const singleWeightLine = weightLines.length === 1
  const isComposite = weightLines.length > 1
  const fields = useMemo(() => getHomeCookedFieldVisibility(draft), [draft])

  const preview = useMemo(() => calculateHomeCookedMeal(draft), [draft])
  const canSaveWeight = isHomeCookedDraftComplete(draft)

  const hasManualOverride =
    userEditedMacrosRef.current &&
    (parseNum(calories) != null ||
      parseNum(protein) != null ||
      parseNum(fat) != null ||
      parseNum(carbs) != null)

  function updateLine(index: number, patch: Partial<DetectedIngredientLine>) {
    setDraft(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    }))
  }

  function applyPortionPreset(preset: PortionPresetId) {
    setPortionPreset(preset)
    if (preset === 'custom') return
    const grams = gramsForPreset(preset)!
    if (singleWeightLine) {
      const index = draft.ingredients.indexOf(weightLines[0]!)
      updateLine(index, { amount: grams })
    } else if (weightLines.length > 0) {
      setDraft(prev => ({
        ...prev,
        ingredients: prev.ingredients.map(line =>
          line.food_id != null ? { ...line, amount: grams } : line
        ),
      }))
    }
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
    if (noDbMatch && onManualSave) {
      onManualSave({
        calories: parseNum(calories),
        protein_g: parseNum(protein),
        fat_g: parseNum(fat),
        carbs_g: parseNum(carbs),
        portion: mealLabel,
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
          onChange={e => {
            userEditedMacrosRef.current = true
            onChange(e.target.value)
          }}
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
            <p className="text-[15px] mt-2" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
              {mealLabel}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 -mr-1 shrink-0" aria-label="關閉">
            <X className="h-5 w-5" strokeWidth={ICON_STROKE} style={{ color: BB_V2.text.secondary }} />
          </button>
        </div>

        <div className="ios-bottom-sheet__scroll px-5 pb-2 space-y-5">
          {noDbMatch ? (
            <section
              className="rounded-2xl px-4 py-4 space-y-3"
              style={{ backgroundColor: BB_V2.bg.canvas, border: `1px solid ${BB_V2.divider}` }}
            >
              <p className="text-[14px] leading-relaxed" style={{ color: BB_V2.text.primary, fontWeight: 500 }}>
                資料庫尚無「{mealLabel}」的對應食材。
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: BB_V2.text.secondary }}>
                請展開下方進階欄位，手動填寫營養素。
              </p>
            </section>
          ) : (
            <>
              {isComposite ? (
                <p className="text-[13px] leading-relaxed" style={{ color: BB_V2.text.secondary }}>
                  已辨識 {weightLines.length} 項食材，選份量與烹調方式後會自動估算。
                </p>
              ) : null}

              {weightLines.length > 0 ? (
                <ChipRow
                  label={fields.portionLabel}
                  options={(Object.keys(PORTION_PRESET_LABELS) as PortionPresetId[]).map(id => ({
                    id,
                    label:
                      id === 'custom'
                        ? PORTION_PRESET_LABELS.custom
                        : `${PORTION_PRESET_LABELS[id]} ${DEFAULT_PORTION_GRAMS[id as Exclude<PortionPresetId, 'custom'>]}g`,
                  }))}
                  value={portionPreset}
                  onChange={applyPortionPreset}
                />
              ) : null}

              {weightLines.length > 0 ? (
                <section className="space-y-2">
                  <p className="text-[13px]" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
                    食材重量
                  </p>
                  {weightLines.map(line => {
                    const index = draft.ingredients.indexOf(line)
                    return (
                      <div key={`${line.raw_label}-${index}`} className="flex items-center gap-3">
                        <span className="flex-1 text-[15px] truncate" style={{ color: BB_V2.text.primary, fontWeight: 500 }}>
                          {line.raw_label}
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="150"
                          value={line.amount ?? ''}
                          onChange={e => {
                            const v = e.target.value
                            setPortionPreset('custom')
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
                  })}
                </section>
              ) : null}

              {fields.oil ? (
                <ChipRow
                  label="用油量"
                  options={OIL_LEVEL_OPTIONS.map(o => ({ id: o.id, label: o.label }))}
                  value={draft.meal_oil_level}
                  onChange={meal_oil_level => setDraft(prev => ({ ...prev, meal_oil_level }))}
                />
              ) : null}

              {fields.cooking ? (
                <ChipRow
                  label="烹調方式"
                  options={COOKING_OPTIONS}
                  value={draft.meal_cooking_method}
                  onChange={meal_cooking_method => setDraft(prev => ({ ...prev, meal_cooking_method }))}
                />
              ) : null}

              {fields.sauce ? (
                <ChipRow
                  label="醬汁"
                  options={SAUCE_OPTIONS}
                  value={draft.sauce_level}
                  onChange={sauce_level => setDraft(prev => ({ ...prev, sauce_level }))}
                />
              ) : null}

              {preview && !hasManualOverride ? (
                <section
                  className="rounded-2xl px-4 py-3"
                  style={{ backgroundColor: BB_V2.bg.canvas, border: `1px solid ${BB_V2.divider}` }}
                >
                  <p className="text-[14px]" style={{ color: BB_V2.text.primary, fontWeight: 500 }}>
                    估算約 {preview.calories} kcal
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: BB_V2.text.secondary }}>
                    蛋白質 {preview.protein_g}g · 碳水 {preview.carbs_g}g · 脂肪 {preview.fat_g}g
                  </p>
                </section>
              ) : null}
            </>
          )}

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
            {advancedOpen ? (
              <div className="space-y-3 mt-3">
                {macroField('熱量', calories, setCalories, 'kcal')}
                {macroField('蛋白質', protein, setProtein, 'g')}
                {macroField('碳水', carbs, setCarbs, 'g')}
                {macroField('脂肪', fat, setFat, 'g')}
                <p className="text-[11px] leading-relaxed" style={{ color: BB_V2.text.secondary }}>
                  只有在你主動填寫時，才會覆蓋上方的份量估算。
                </p>
              </div>
            ) : null}
          </section>
        </div>

        <div className="px-5 pt-3 pb-8 space-y-2">
          <button
            type="button"
            disabled={
              noDbMatch
                ? !hasManualOverride || !onManualSave
                : !canSaveWeight && !hasManualOverride
            }
            onClick={handleSave}
            className="w-full h-12 rounded-[20px] text-[15px] flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ backgroundColor: BB_V2.accent.orange, color: '#FFFFFF', fontWeight: 600 }}
          >
            <Scale className="h-4 w-4" strokeWidth={ICON_STROKE} />
            {saveLabel}
          </button>
          <button type="button" onClick={onClose} className="w-full h-10 text-[13px]" style={{ color: BB_V2.text.secondary }}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </AppOverlay>
  )
}
