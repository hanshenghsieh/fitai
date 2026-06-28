'use client'

import { useEffect, useState } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { ManualNutritionInput } from '@/lib/nutrition/unknown-food-flow'
import AppOverlay from '@/components/ui/AppOverlay'

const font = 'var(--font-noto-tc), system-ui, sans-serif'
const ICON_STROKE = 1.8

interface Props {
  open: boolean
  foodName: string
  onClose: () => void
  onCancel: () => void
  onSave: (input: ManualNutritionInput) => void
}

function parseNum(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export default function ManualNutritionSheet({ open, foodName, onClose, onCancel, onSave }: Props) {
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [fat, setFat] = useState('')
  const [carbs, setCarbs] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [fiber, setFiber] = useState('')
  const [sugar, setSugar] = useState('')
  const [sodium, setSodium] = useState('')
  const [portion, setPortion] = useState('')
  const [notes, setNotes] = useState('')
  const [source, setSource] = useState('')

  useEffect(() => {
    if (!open) return
    setCalories('')
    setProtein('')
    setFat('')
    setCarbs('')
    setFiber('')
    setSugar('')
    setSodium('')
    setPortion('')
    setNotes('')
    setSource('')
    setAdvancedOpen(false)
  }, [open, foodName])

  const handleSave = () => {
    onSave({
      calories: parseNum(calories),
      protein_g: parseNum(protein),
      fat_g: parseNum(fat),
      carbs_g: parseNum(carbs),
      fiber_g: parseNum(fiber),
      sugar_g: parseNum(sugar),
      sodium_mg: parseNum(sodium),
      portion: portion.trim() || undefined,
      notes: notes.trim() || undefined,
      source_note: source.trim() || undefined,
    })
  }

  const field = (label: string, value: string, onChange: (v: string) => void, unit: string) => (
    <label className="block">
      <span className="text-[13px] mb-1.5 block" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
        {label}
      </span>
      <div
        className="flex items-center gap-2 px-4 py-3 rounded-2xl"
        style={{ backgroundColor: BB_V2.bg.canvas }}
      >
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
    <AppOverlay open={open} onClose={onCancel} variant="sheet">
      <div
        className="ios-bottom-sheet max-w-lg mx-auto w-full"
        style={{
          fontFamily: font,
          backgroundColor: BB_V2.bg.card,
          borderRadius: '28px 28px 0 0',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[18px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
              手動輸入營養
            </h2>
            <p className="text-[13px] mt-1" style={{ color: BB_V2.text.secondary }}>
              {foodName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5" aria-label="關閉">
            <X className="h-5 w-5" strokeWidth={ICON_STROKE} style={{ color: BB_V2.text.secondary }} />
          </button>
        </div>

        <div className="ios-bottom-sheet__scroll px-5 pb-2 space-y-3">
          {field('熱量', calories, setCalories, 'kcal')}
          {field('蛋白質', protein, setProtein, 'g')}
          {field('脂肪', fat, setFat, 'g')}
          {field('碳水', carbs, setCarbs, 'g')}

          <button
            type="button"
            onClick={() => setAdvancedOpen(v => !v)}
            className="flex items-center gap-1 text-[13px] py-1"
            style={{ color: BB_V2.text.secondary, fontWeight: 500 }}
          >
            {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            進階欄位
          </button>

          {advancedOpen && (
            <div className="space-y-3">
              {field('纖維', fiber, setFiber, 'g')}
              {field('糖', sugar, setSugar, 'g')}
              {field('鈉', sodium, setSodium, 'mg')}
              <label className="block">
                <span className="text-[13px] mb-1.5 block" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
                  份量
                </span>
                <input
                  value={portion}
                  onChange={e => setPortion(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl text-base outline-none"
                  style={{ backgroundColor: BB_V2.bg.canvas, color: BB_V2.text.primary }}
                  placeholder="例如：2 顆"
                />
              </label>
              <label className="block">
                <span className="text-[13px] mb-1.5 block" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
                  備註
                </span>
                <input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl text-base outline-none"
                  style={{ backgroundColor: BB_V2.bg.canvas, color: BB_V2.text.primary }}
                />
              </label>
              <label className="block">
                <span className="text-[13px] mb-1.5 block" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
                  來源
                </span>
                <input
                  value={source}
                  onChange={e => setSource(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl text-base outline-none"
                  style={{ backgroundColor: BB_V2.bg.canvas, color: BB_V2.text.primary }}
                  placeholder="例如：包裝營養標示"
                />
              </label>
            </div>
          )}

          <p className="text-[11px] leading-relaxed pt-1" style={{ color: BB_V2.text.secondary }}>
            儲存後會標記為「使用者輸入」，可計入今日統計。
          </p>
        </div>

        <div className="ios-bottom-sheet__footer px-5 py-3 space-y-2 border-t" style={{ borderColor: 'rgba(142, 131, 120, 0.12)' }}>
          <button
            type="button"
            onClick={handleSave}
            className="w-full h-14 rounded-[22px] text-[15px]"
            style={{ backgroundColor: BB_V2.accent.orange, color: '#FFFFFF', fontWeight: 500 }}
          >
            儲存營養資料
          </button>
          <button type="button" onClick={onCancel} className="w-full h-10 text-[13px]" style={{ color: BB_V2.text.secondary }}>
            取消，保持營養待確認
          </button>
        </div>
      </div>
    </AppOverlay>
  )
}
