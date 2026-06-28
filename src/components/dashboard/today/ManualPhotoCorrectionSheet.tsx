'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import { searchNutritionV2Client } from '@/lib/nutrition/search-v2/search-client'
import { PHOTO_MANUAL_SEARCH_LIMIT } from '@/lib/nutrition/photo-display-limits'
import {
  FOOD_CATEGORIES,
  inferCategoryFromText,
  type FoodCategory,
} from '@/lib/nutrition/food-category-guard'
import type { PhotoVisualParse } from '@/lib/nutrition/photo-visual-parse'
import type { ManualNutritionInput } from '@/lib/nutrition/unknown-food-flow'
import type { SearchV2Candidate } from '@/lib/nutrition/search-v2/types'
import type { ManualPhotoCorrectionResult } from '@/lib/nutrition/photo-manual-correction'
import { buildPhotoAiMeta } from '@/lib/nutrition/photo-manual-correction'
import AppOverlay from '@/components/ui/AppOverlay'

const font = 'var(--font-noto-tc), system-ui, sans-serif'
const ICON_STROKE = 1.8

type Mode = 'search' | 'manual' | 'unknown'

interface Props {
  open: boolean
  initialLabel: string
  initialRestaurant?: string
  visualParse: PhotoVisualParse
  originalCandidates: string[]
  onClose: () => void
  onCommit: (result: ManualPhotoCorrectionResult) => void
}

function parseNum(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? n : null
}

const CATEGORY_LABELS: Record<FoodCategory, string> = {
  burger: '漢堡',
  sandwich: '三明治',
  sushi: '壽司',
  rice_bowl: '飯類 / 丼',
  bento: '便當',
  noodle: '麵食',
  soup: '湯品',
  dumpling: '餃類',
  fried_food: '炸物',
  drink: '飲品',
  dessert: '甜點',
  salad: '沙拉',
  hotpot: '火鍋',
  bbq: '燒烤',
  convenience_item: '便利商店',
  unknown: '不確定',
}

export default function ManualPhotoCorrectionSheet({
  open,
  initialLabel,
  initialRestaurant,
  visualParse,
  originalCandidates,
  onClose,
  onCommit,
}: Props) {
  const [mode, setMode] = useState<Mode>('search')
  const [label, setLabel] = useState(initialLabel)
  const [restaurant, setRestaurant] = useState(initialRestaurant ?? '')
  const [category, setCategory] = useState<FoodCategory>(visualParse.visual_category)
  const [searchQuery, setSearchQuery] = useState(initialLabel)
  const [selectedCandidate, setSelectedCandidate] = useState<SearchV2Candidate | null>(null)
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

  useEffect(() => {
    if (!open) return
    setMode('search')
    setLabel(initialLabel)
    setRestaurant(initialRestaurant ?? '')
    setCategory(visualParse.visual_category)
    setSearchQuery(initialLabel)
    setSelectedCandidate(null)
    setCalories('')
    setProtein('')
    setFat('')
    setCarbs('')
    setFiber('')
    setSugar('')
    setSodium('')
    setPortion('')
    setNotes('')
    setAdvancedOpen(false)
  }, [open, initialLabel, initialRestaurant, visualParse])

  useEffect(() => {
    if (!open || selectedCandidate || templateCandidates.length !== 1) return
    setSelectedCandidate(templateCandidates[0]!)
  }, [open, selectedCandidate, templateCandidates])

  const searchCandidates = useMemo(() => {
    const queries = [...new Set([searchQuery.trim(), label.trim()].filter(Boolean))]
    const seen = new Set<string>()
    const merged: SearchV2Candidate[] = []
    for (const q of queries) {
      const outcome = searchNutritionV2Client(q, {
        visual_category: category,
        photo_mode: true,
      })
      for (const c of outcome.candidates.filter(c => c.source_tier !== 'unknown')) {
        if (seen.has(c.id)) continue
        seen.add(c.id)
        merged.push(c)
      }
    }
    return merged.slice(0, PHOTO_MANUAL_SEARCH_LIMIT)
  }, [searchQuery, label, category])

  const templateCandidates = useMemo(
    () => searchCandidates.filter(c => c.source_tier === 'food_dna'),
    [searchCandidates]
  )

  const photoAi = buildPhotoAiMeta(visualParse, originalCandidates)

  const canCommit =
    mode === 'search'
      ? Boolean(selectedCandidate)
      : mode === 'unknown'
        ? label.trim().length > 0
        : parseNum(calories) != null ||
          parseNum(protein) != null ||
          parseNum(fat) != null ||
          parseNum(carbs) != null

  const handleCommit = () => {
    const trimmedLabel = label.trim()
    if (!trimmedLabel) return
    const rest = restaurant.trim() || undefined
    const cat = category || inferCategoryFromText(trimmedLabel)

    if (mode === 'search' && selectedCandidate) {
      onCommit({
        mode: 'verified',
        label: trimmedLabel,
        restaurant: rest,
        category: cat,
        candidate: selectedCandidate,
        photoAi,
      })
      return
    }

    if (mode === 'manual') {
      const nutrition: ManualNutritionInput = {
        calories: parseNum(calories),
        protein_g: parseNum(protein),
        fat_g: parseNum(fat),
        carbs_g: parseNum(carbs),
        fiber_g: parseNum(fiber),
        sugar_g: parseNum(sugar),
        sodium_mg: parseNum(sodium),
        portion: portion.trim() || undefined,
        notes: notes.trim() || undefined,
      }
      onCommit({
        mode: 'user_entered',
        label: trimmedLabel,
        restaurant: rest,
        category: cat,
        nutrition,
        photoAi,
      })
      return
    }

    if (mode === 'unknown') {
      onCommit({
        mode: 'unknown_photo',
        label: trimmedLabel,
        restaurant: rest,
        category: cat,
        photoAi,
      })
    }
  }

  const field = (title: string, value: string, onChange: (v: string) => void, unit: string) => (
    <label className="block">
      <span className="text-[13px] mb-1.5 block" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
        {title}
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
        <span className="text-[13px] shrink-0" style={{ color: BB_V2.text.secondary }}>{unit}</span>
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
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[18px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
              手動更改餐點
            </h2>
            <p className="text-[13px] mt-1" style={{ color: BB_V2.text.secondary }}>
              修正 AI 辨識結果，選擇如何記錄營養
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5" aria-label="關閉">
            <X className="h-5 w-5" strokeWidth={ICON_STROKE} style={{ color: BB_V2.text.secondary }} />
          </button>
        </div>

        <div className="ios-bottom-sheet__scroll px-5 pb-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <label className="block space-y-1">
            <span className="text-[13px]" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>餐點名稱</span>
            <input
              type="text"
              value={label}
              onChange={e => {
                setLabel(e.target.value)
                setSearchQuery(e.target.value)
              }}
              className="w-full px-4 py-3 text-base outline-none rounded-2xl"
              style={{ backgroundColor: BB_V2.bg.canvas, color: BB_V2.text.primary }}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[13px]" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>餐廳 / 品牌</span>
            <input
              type="text"
              value={restaurant}
              onChange={e => setRestaurant(e.target.value)}
              className="w-full px-4 py-3 text-base outline-none rounded-2xl"
              style={{ backgroundColor: BB_V2.bg.canvas, color: BB_V2.text.primary }}
              placeholder="選填"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[13px]" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>食物類型</span>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as FoodCategory)}
              className="w-full px-4 py-3 text-base outline-none rounded-2xl"
              style={{ backgroundColor: BB_V2.bg.canvas, color: BB_V2.text.primary }}
            >
              {FOOD_CATEGORIES.map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </label>

          <div className="flex gap-2">
            {(['search', 'manual', 'unknown'] as Mode[]).map(m => {
              const active = mode === m
              const text =
                m === 'search' ? '搜尋可信資料' : m === 'manual' ? '手動輸入營養' : '先保存照片'
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className="flex-1 py-2.5 text-[12px] rounded-xl"
                  style={{
                    backgroundColor: active ? BB_V2.accent.orange : BB_V2.bg.canvas,
                    color: active ? '#fff' : BB_V2.text.primary,
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {text}
                </button>
              )
            })}
          </div>

          {mode === 'search' && (
            <div className="space-y-3">
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                style={{ backgroundColor: BB_V2.bg.canvas }}
              >
                <Search className="h-4 w-4 shrink-0" strokeWidth={ICON_STROKE} style={{ color: BB_V2.text.secondary }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-base outline-none"
                  style={{ color: BB_V2.text.primary }}
                  placeholder="重新搜尋 ONR / 官方資料"
                />
              </div>
              {searchCandidates.length === 0 && searchQuery.trim() && (
                <p className="text-[13px]" style={{ color: BB_V2.text.secondary }}>
                  找不到品牌官方資料。可改用手動輸入營養，或先保存照片紀錄。
                </p>
              )}
              {templateCandidates.length > 0 && (
                <p className="text-[13px]" style={{ color: BB_V2.accent.orange, fontWeight: 500 }}>
                  依辨識結果，找到餐型參考估算（選一個後可加入今天）
                </p>
              )}
              {searchCandidates.map(c => {
                const active = selectedCandidate?.id === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCandidate(c)}
                    className="w-full text-left px-4 py-3 rounded-2xl active:opacity-90"
                    style={{
                      backgroundColor: active ? 'rgba(232, 120, 60, 0.12)' : BB_V2.bg.canvas,
                      border: active ? `1.5px solid ${BB_V2.accent.orange}` : '1.5px solid transparent',
                    }}
                  >
                    <p className="text-[15px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
                      {c.store ? `${c.store} · ${c.name}` : c.name}
                    </p>
                    <p className="text-[13px] mt-0.5" style={{ color: BB_V2.text.secondary }}>
                      {c.source_tier === 'food_dna' ? '餐型參考 · ' : ''}
                      {c.macros.calories ?? '—'} kcal · 蛋白質 {c.macros.protein ?? '—'}g
                    </p>
                  </button>
                )
              })}
            </div>
          )}

          {mode === 'manual' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {field('熱量', calories, setCalories, 'kcal')}
                {field('蛋白質', protein, setProtein, 'g')}
                {field('脂肪', fat, setFat, 'g')}
                {field('碳水', carbs, setCarbs, 'g')}
              </div>
              <button
                type="button"
                onClick={() => setAdvancedOpen(v => !v)}
                className="flex items-center gap-1 text-[13px]"
                style={{ color: BB_V2.text.secondary, fontWeight: 500 }}
              >
                進階欄位
                {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {advancedOpen && (
                <div className="grid grid-cols-2 gap-3">
                  {field('纖維', fiber, setFiber, 'g')}
                  {field('糖', sugar, setSugar, 'g')}
                  {field('鈉', sodium, setSodium, 'mg')}
                </div>
              )}
              <label className="block space-y-1">
                <span className="text-[13px]" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>份量 / serving</span>
                <input
                  type="text"
                  value={portion}
                  onChange={e => setPortion(e.target.value)}
                  className="w-full px-4 py-3 text-base outline-none rounded-2xl"
                  style={{ backgroundColor: BB_V2.bg.canvas, color: BB_V2.text.primary }}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[13px]" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>備註</span>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-4 py-3 text-base outline-none rounded-2xl"
                  style={{ backgroundColor: BB_V2.bg.canvas, color: BB_V2.text.primary }}
                />
              </label>
            </div>
          )}

          {mode === 'unknown' && (
            <p className="text-[13px] leading-relaxed" style={{ color: BB_V2.text.secondary }}>
              先保存照片與文字紀錄，不計入今日營養統計。之後找到可信資料可再更新。
            </p>
          )}
        </div>

        <div className="ios-bottom-sheet__footer px-5 pt-2 pb-4">
          <button
            type="button"
            disabled={!canCommit}
            onClick={handleCommit}
            className="w-full h-14 rounded-[22px] text-[15px] disabled:opacity-40 active:opacity-90"
            style={{ backgroundColor: BB_V2.accent.orange, color: '#fff', fontWeight: 600 }}
          >
            加入今天
          </button>
        </div>
      </div>
    </AppOverlay>
  )
}
