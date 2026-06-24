'use client'

import { useRef, useState, useEffect } from 'react'
import { Search, X, PenLine } from 'lucide-react'
import type { FrequentFood } from '@/lib/food-memory'
import { primaryFoodLabel } from '@/lib/food-photography'
import type { FoodSlot } from '@/lib/food-slots'
import { isNativeIOS } from '@/lib/capacitor-native'

const DS = {
  text: '#2F241D',
  textSecondary: '#8E8378',
  sheet: '#FDFCFA',
  mocha: '#8B7355',
  cardShadow: '0 12px 40px rgba(0, 0, 0, 0.05)',
} as const

const ICON_STROKE = 1.8
const font = 'var(--font-noto-tc), system-ui, sans-serif'

interface Props {
  open: boolean
  onClose: () => void
  activeSlot: FoodSlot
  query: string
  onQueryChange: (q: string) => void
  searchResults: Array<{ id: string; name: string; store?: string; calories: number; protein_g: number }>
  onPickSearch: (item: { id: string; name: string; store?: string; calories: number; protein_g: number }) => void
  frequentList: FrequentFood[]
  selectedFrequentId: string
  onSelectFrequent: (id: string) => void
  onCommitFrequent: (frequentId?: string) => void
  onCreateFreeText?: (name: string) => void
}

function FrequentRow({ food, onClick, compact }: { food: FrequentFood; onClick: () => void; compact?: boolean }) {
  const label = primaryFoodLabel(food.name)
  const store = food.store ?? (food.name.includes('·') ? food.name.split('·')[0]?.trim() : undefined)
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left active:opacity-90"
      style={{
        fontFamily: font,
        padding: compact ? '12px 0' : '14px 0',
      }}
    >
      <p className="text-[16px] leading-snug line-clamp-2" style={{ color: DS.text, fontWeight: 500 }}>
        {label}
        {store && !label.includes(store) ? ` · ${store}` : ''}
      </p>
      <p className="text-[14px] mt-1" style={{ color: DS.textSecondary, fontWeight: 400 }}>
        {food.calories} kcal · 蛋白質 {food.protein_g}g
      </p>
    </button>
  )
}

export default function TodayFoodMore({
  open,
  onClose,
  activeSlot: _activeSlot,
  query,
  onQueryChange,
  searchResults,
  onPickSearch,
  frequentList,
  selectedFrequentId,
  onSelectFrequent: _onSelectFrequent,
  onCommitFrequent,
  onCreateFreeText,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showAllFrequent, setShowAllFrequent] = useState(false)

  useEffect(() => {
    if (!open) {
      setShowAllFrequent(false)
      return
    }
    document.body.style.overflow = 'hidden'
    // Auto-focus triggers iOS keyboard zoom on <16px inputs; skip on native shell.
    let t: number | undefined
    if (!isNativeIOS()) {
      t = window.setTimeout(() => inputRef.current?.focus(), 120)
    }
    return () => {
      document.body.style.overflow = ''
      if (t !== undefined) window.clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = 0
  }, [open])

  if (!open) return null

  const topFrequent = frequentList.find(f => f.id === selectedFrequentId) ?? frequentList[0] ?? null
  const trimmed = query.trim()
  const hasSearch = trimmed.length > 0
  const noSearchHits = hasSearch && searchResults.length === 0

  const handleCreate = () => {
    if (!trimmed || !onCreateFreeText) return
    onCreateFreeText(trimmed)
  }

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
        className="ios-bottom-sheet max-w-lg mx-auto w-full"
        style={{
          fontFamily: font,
          backgroundColor: DS.sheet,
          borderRadius: '28px 28px 0 0',
          boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 pt-5 pb-3">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h2 className="text-[20px] leading-tight" style={{ color: DS.text, fontWeight: 700 }}>
                文字紀錄
              </h2>
              <p className="text-[13px] leading-relaxed mt-1" style={{ color: DS.textSecondary, fontWeight: 400 }}>
                輸入或搜尋菜名，手動建立這餐
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 -mr-1 shrink-0" aria-label="關閉">
              <X className="h-5 w-5" strokeWidth={ICON_STROKE} style={{ color: DS.textSecondary }} />
            </button>
          </div>

          <div
            className="flex items-center gap-2.5 px-4 py-3 rounded-full"
            style={{ backgroundColor: '#FFFFFF', boxShadow: DS.cardShadow }}
          >
            <Search className="h-4 w-4 shrink-0" strokeWidth={ICON_STROKE} style={{ color: DS.textSecondary }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && trimmed && onCreateFreeText) {
                  e.preventDefault()
                  handleCreate()
                }
              }}
              placeholder="例如：鐵板燒、雞腿便當…"
              className="flex-1 bg-transparent text-base outline-none min-w-0"
              style={{ color: DS.text, fontWeight: 400 }}
            />
          </div>
        </div>

        <div ref={scrollRef} className="ios-bottom-sheet__scroll px-5 pb-2">
          {hasSearch && searchResults.length > 0 && (
            <div className="mb-5 space-y-5">
              {searchResults.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onPickSearch(item)}
                  className="w-full text-left py-1 active:opacity-90"
                >
                  <p className="text-[16px] font-medium" style={{ color: DS.text, fontWeight: 500 }}>
                    {item.name}
                  </p>
                  <p className="text-[14px] mt-1" style={{ color: DS.textSecondary }}>
                    {item.store ? `${item.store} · ` : ''}{item.calories} kcal · 蛋白質 {item.protein_g}g
                  </p>
                </button>
              ))}
            </div>
          )}

          {noSearchHits && onCreateFreeText && (
            <div
              className="mb-5 py-6 px-4 text-center"
              style={{
                borderTop: '1px solid rgba(142, 131, 120, 0.12)',
                borderBottom: '1px solid rgba(142, 131, 120, 0.12)',
              }}
            >
              <p className="text-[15px] leading-relaxed" style={{ color: DS.text, fontWeight: 500 }}>
                找不到「{trimmed}」
              </p>
              <p className="text-[13px] mt-2 leading-relaxed" style={{ color: DS.textSecondary, fontWeight: 400 }}>
                沒關係，可以直接建立文字紀錄。
              </p>
            </div>
          )}

          {frequentList.length > 0 && (
            <section className="mb-5">
              <p className="text-[13px] mb-3 px-0.5" style={{ color: DS.textSecondary, fontWeight: 500 }}>
                常吃
              </p>

              {!showAllFrequent && topFrequent && (
                <FrequentRow food={topFrequent} onClick={() => onCommitFrequent(topFrequent.id)} />
              )}

              {showAllFrequent && (
                <ul className="space-y-1 max-h-[168px] overflow-y-auto overscroll-contain">
                  {frequentList.map(f => (
                    <li key={f.id}>
                      <FrequentRow
                        compact
                        food={f}
                        onClick={() => {
                          onCommitFrequent(f.id)
                          setShowAllFrequent(false)
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={() => setShowAllFrequent(v => !v)}
                className="w-full text-center text-[12px] mt-2 py-0.5"
                style={{ color: DS.textSecondary, fontWeight: 400 }}
              >
                {showAllFrequent ? '收起常吃紀錄' : '查看我的常吃紀錄 >'}
              </button>
            </section>
          )}
        </div>

        {onCreateFreeText && (
          <div
            className="ios-bottom-sheet__footer px-5 pt-2 pb-3 border-t"
            style={{ borderColor: 'rgba(142, 131, 120, 0.12)' }}
          >
            <button
              type="button"
              disabled={!trimmed}
              onClick={handleCreate}
              className="w-full h-14 rounded-[22px] text-[15px] flex items-center justify-center gap-2 disabled:opacity-40 active:opacity-90"
              style={{ backgroundColor: DS.mocha, color: '#FFFFFF', fontWeight: 500 }}
            >
              <PenLine className="h-4 w-4" strokeWidth={ICON_STROKE} />
              {trimmed ? `建立「${trimmed}」紀錄` : '輸入食物名稱後建立紀錄'}
            </button>
          </div>
        )}

        <p
          className="ios-bottom-sheet__footer shrink-0 text-center text-[11px] py-2 px-5"
          style={{ color: DS.textSecondary, fontWeight: 400 }}
        >
          每一餐，都是照顧自己的練習
        </p>
      </div>
    </div>
  )
}
