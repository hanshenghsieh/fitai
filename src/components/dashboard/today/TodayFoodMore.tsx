'use client'

import { useRef, useState, useEffect, useMemo, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { Check, Search, X, PenLine, ScanBarcode } from 'lucide-react'
import type { FrequentFood } from '@/lib/food-memory'
import { primaryFoodLabel } from '@/lib/food-photography'
import type { FoodSlot } from '@/lib/food-slots'
import { isNativeIOS } from '@/lib/capacitor-native'
import AppOverlay from '@/components/ui/AppOverlay'

import type { FoodSearchHit } from '@/lib/food-search'
import { findP0FoodCandidates } from '@/lib/nutrition/p0-common-foods/resolve-p0-food'
import { TextSearchAiFallbackController } from '@/lib/nutrition/text-search-ai-fallback-controller'
import { fetchTextAiEstimate } from '@/lib/nutrition/text-search-ai-fallback-client'
import { candidateToSearchHit } from '@/lib/nutrition/ai-fallback-search-hit'
import { CONFIDENCE_BADGE } from '@/lib/nutrition/search-v2/confidence'

import { BB_V2 } from '@/lib/betterbit-v2'
import { getNutritionDayKey } from '@/lib/timezone'
import { trackClient } from '@/lib/analytics/track-client'

const DS = {
  text: BB_V2.text.primary,
  textSecondary: BB_V2.text.secondary,
  sheet: BB_V2.bg.card,
  mocha: BB_V2.accent.orange,
  cardShadow: BB_V2.shadow.card,
} as const

const ICON_STROKE = 1.8
const font = 'var(--font-noto-tc), system-ui, sans-serif'

interface Props {
  open: boolean
  targetDate: string
  onClose: () => void
  activeSlot: FoodSlot
  query: string
  onQueryChange: (q: string) => void
  searchResults: FoodSearchHit[]
  onPickSearch: (item: FoodSearchHit) => void
  frequentList: FrequentFood[]
  selectedFrequentId: string
  onSelectFrequent: (id: string) => void
  onCommitFrequent: (frequentId?: string) => void
  onCreateFreeText?: (name: string, options?: { forceUnknown?: boolean }) => void
  onCreateEstimate?: (name: string) => void
  onOpenBarcode?: () => void
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
  targetDate,
  onClose,
  query,
  onQueryChange,
  searchResults,
  onPickSearch,
  frequentList,
  selectedFrequentId,
  onCommitFrequent,
  onCreateFreeText,
  onCreateEstimate,
  onOpenBarcode,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showAllFrequent, setShowAllFrequent] = useState(false)
  const [selectedSearchHit, setSelectedSearchHit] = useState<FoodSearchHit | null>(null)

  // Local trusted search always runs first (searchResults/nearCandidates,
  // computed by the parent/above) — this controller only ever fires on an
  // explicit submit (handlePrimaryAction / Enter), after BOTH have already
  // missed. See text-search-ai-fallback-controller.ts for the cost/
  // cancellation invariants this depends on.
  const aiControllerRef = useRef<TextSearchAiFallbackController | null>(null)
  if (!aiControllerRef.current) {
    aiControllerRef.current = new TextSearchAiFallbackController(fetchTextAiEstimate)
  }
  const aiController = aiControllerRef.current
  const aiPhase = useSyncExternalStore(
    listener => aiController.subscribe(listener),
    () => aiController.getPhase(),
    () => aiController.getPhase()
  )

  useEffect(() => {
    if (!open) return
    // Auto-focus triggers iOS keyboard zoom on <16px inputs; skip on native shell.
    let t: number | undefined
    if (!isNativeIOS()) {
      t = window.setTimeout(() => inputRef.current?.focus(), 120)
    }
    return () => {
      if (t !== undefined) window.clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = 0
  }, [open])

  const topFrequent = frequentList.find(f => f.id === selectedFrequentId) ?? frequentList[0] ?? null
  const trimmed = query.trim()
  const hasSearch = trimmed.length > 0
  const noSearchHits = hasSearch && searchResults.length === 0
  const nearCandidates = useMemo(() => {
    if (!noSearchHits) return []
    return findP0FoodCandidates(trimmed, 5)
  }, [noSearchHits, trimmed])

  useEffect(() => {
    if (noSearchHits && nearCandidates.length === 0) {
      trackClient({ name: 'food_search_no_result', properties: {} })
    }
  }, [noSearchHits, nearCandidates.length, trimmed])

  useEffect(() => {
    if (hasSearch && searchResults.length > 0) {
      trackClient({ name: 'food_search_local_hit', properties: {} })
    }
  }, [hasSearch, searchResults.length])

  // Query text changed (or the sheet closed) — abandon any in-flight/stale
  // AI request rather than let it resolve against a query the user has
  // already moved past.
  useEffect(() => {
    aiController.reset()
  }, [trimmed, aiController])

  useEffect(() => {
    if (!open) aiController.reset()
  }, [open, aiController])

  // AI fallback failed (or was rejected by guardrails) — fall through to the
  // exact same manual-estimate escape hatch a no-AI miss already uses, with
  // no extra tap required. See PART 18 of the fallback spec.
  useEffect(() => {
    if (aiPhase.status === 'failed' && aiPhase.query === trimmed) {
      trackClient({ name: 'food_search_ai_fallback_failed', properties: { reason: aiPhase.reason } })
      toast.message('暫時無法取得結果', { description: '你仍可以自行估算記錄' })
      aiController.reset()
      if (onCreateEstimate) onCreateEstimate(trimmed)
      else onCreateFreeText?.(trimmed)
    }
  }, [aiPhase, trimmed, onCreateEstimate, onCreateFreeText, aiController])

  const triggerAiFallback = async (q: string) => {
    trackClient({ name: 'food_search_ai_fallback_started', properties: {} })
    await aiController.trigger(q)
    const phase = aiController.getPhase()
    if (phase.status === 'success' && phase.query === q) {
      trackClient({ name: 'food_search_ai_fallback_success', properties: { outcome: phase.outcome } })
    }
  }

  const toSearchHit = (item: (typeof nearCandidates)[number]['item']): FoodSearchHit => ({
    id: `p0-${item.id}`,
    name: item.name,
    store: item.category,
    calories: Math.round(item.kcalDefault),
    protein_g: item.proteinDefault_g,
    carbs_g: item.carbsDefault_g,
    fat_g: item.fatDefault_g,
    foodType: item.foodType,
    sourceType: item.sourceType,
    p0FoodId: item.id,
    searchSource: 'p0',
    sourceLabel: '資料庫估算',
  })

  const handleClose = () => {
    setSelectedSearchHit(null)
    setShowAllFrequent(false)
    aiController.reset()
    onClose()
  }

  const handlePrimaryAction = () => {
    if (!trimmed) return
    setShowAllFrequent(false)
    if (selectedSearchHit) {
      const selected = selectedSearchHit
      setSelectedSearchHit(null)
      trackClient({ name: 'food_search_result_selected', properties: { source: selected.searchSource } })
      onPickSearch(selected)
      return
    }
    if (noSearchHits && nearCandidates.length === 0) {
      // Trusted local search (above) and the P0 near-candidate fallback both
      // missed — this is the one intentional trigger point for AI fallback.
      // Never called from a keystroke handler; a second tap while loading is
      // a no-op (the controller itself also guards this).
      if (aiPhase.status === 'success' && aiPhase.query === trimmed) {
        const hit = candidateToSearchHit(aiPhase.candidate, aiPhase.outcome)
        trackClient({ name: 'food_search_result_selected', properties: { source: hit.searchSource } })
        aiController.reset()
        onPickSearch(hit)
        return
      }
      if (aiPhase.status === 'loading') return
      if (aiPhase.status !== 'failed') {
        void triggerAiFallback(trimmed)
      }
      return
    }
    if (onCreateEstimate) {
      onCreateEstimate(trimmed)
      return
    }
    onCreateFreeText?.(trimmed)
  }

  return (
    <AppOverlay open={open} onClose={handleClose} variant="sheet">
      <div
        data-target-date={targetDate}
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
                搜尋或輸入菜名，確認後加入{targetDate === getNutritionDayKey() ? '今日' : '所選日期'}紀錄
              </p>
            </div>
            <button type="button" onClick={handleClose} className="p-1.5 -mr-1 shrink-0" aria-label="關閉">
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
              onChange={e => {
                setSelectedSearchHit(null)
                onQueryChange(e.target.value)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && trimmed) {
                  e.preventDefault()
                  handlePrimaryAction()
                }
              }}
              placeholder="例如：鐵板燒、雞腿便當…"
              className="flex-1 bg-transparent text-base outline-none min-w-0"
              style={{ color: DS.text, fontWeight: 400 }}
            />
          </div>
          {onOpenBarcode ? (
            <button
              type="button"
              onClick={() => {
                setSelectedSearchHit(null)
                onOpenBarcode()
              }}
              className="mt-3 w-full h-11 rounded-[18px] flex items-center justify-center gap-2 active:opacity-90"
              style={{ backgroundColor: BB_V2.bg.canvas, color: DS.mocha, fontWeight: 600 }}
            >
              <ScanBarcode className="h-4 w-4" strokeWidth={ICON_STROKE} />
              掃描包裝食品條碼
            </button>
          ) : null}
        </div>

        <div ref={scrollRef} className="ios-bottom-sheet__scroll px-5 pb-2">
          {hasSearch && searchResults.length > 0 && (
            <div className="mb-5 space-y-5">
              {searchResults.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedSearchHit(item)}
                  className="w-full text-left py-3 px-3 rounded-2xl active:opacity-90"
                  style={{
                    backgroundColor: selectedSearchHit?.id === item.id ? 'rgba(205, 122, 77, 0.10)' : 'transparent',
                    border: selectedSearchHit?.id === item.id ? `1px solid ${DS.mocha}` : '1px solid transparent',
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[16px] font-medium" style={{ color: DS.text, fontWeight: 500 }}>
                      {item.name}
                    </p>
                    {selectedSearchHit?.id === item.id ? (
                      <Check className="h-4 w-4 shrink-0" style={{ color: DS.mocha }} />
                    ) : null}
                  </div>
                  <p className="text-[14px] mt-1" style={{ color: DS.textSecondary }}>
                    {item.portionLabel ? `${item.portionLabel} · ` : ''}
                    {item.store ? `${item.store} · ` : ''}
                    {item.calories} kcal · 蛋白質 {item.protein_g}g
                    {item.sourceLabel ? ` · ${item.sourceLabel}` : ''}
                  </p>
                </button>
              ))}
            </div>
          )}

          {noSearchHits && nearCandidates.length > 0 && (
            <div className="mb-5 space-y-3">
              <p className="text-[14px] leading-relaxed" style={{ color: DS.text, fontWeight: 500 }}>
                我找到幾個相近食材，你可以選一個來估算。
              </p>
              {nearCandidates.map(hit => (
                <button
                  key={hit.item.id}
                  type="button"
                  onClick={() => setSelectedSearchHit(toSearchHit(hit.item))}
                  className="w-full text-left py-2 px-3 rounded-2xl active:opacity-90"
                  style={{
                    backgroundColor:
                      selectedSearchHit?.id === `p0-${hit.item.id}` ? 'rgba(205, 122, 77, 0.10)' : 'transparent',
                    border:
                      selectedSearchHit?.id === `p0-${hit.item.id}` ? `1px solid ${DS.mocha}` : '1px solid transparent',
                  }}
                >
                  <p className="text-[16px] font-medium" style={{ color: DS.text }}>
                    {hit.item.name}
                  </p>
                  <p className="text-[14px] mt-1" style={{ color: DS.textSecondary }}>
                    {hit.item.category} · {Math.round(hit.item.kcalDefault)} kcal · 資料庫估算
                  </p>
                </button>
              ))}
            </div>
          )}

          {noSearchHits && nearCandidates.length === 0 && (onCreateEstimate || onCreateFreeText) && (
            <div
              className="mb-5 py-6 px-4"
              style={{
                borderTop: '1px solid rgba(142, 131, 120, 0.12)',
                borderBottom: '1px solid rgba(142, 131, 120, 0.12)',
              }}
            >
              {aiPhase.status === 'loading' && aiPhase.query === trimmed ? (
                <p className="text-[15px] leading-relaxed text-center" style={{ color: DS.text, fontWeight: 500 }}>
                  ✨ 正在幫你查找「{trimmed}」…
                </p>
              ) : aiPhase.status === 'success' && aiPhase.query === trimmed ? (
                <div>
                  <p className="text-[16px]" style={{ color: DS.text, fontWeight: 600 }}>
                    {aiPhase.candidate.name}
                  </p>
                  <p className="text-[14px] mt-1" style={{ color: DS.textSecondary }}>
                    約 {aiPhase.candidate.macros.calories ?? '—'} kcal · 蛋白質{' '}
                    {aiPhase.candidate.macros.protein ?? '—'}g · 碳水 {aiPhase.candidate.macros.carbs ?? '—'}g · 脂肪{' '}
                    {aiPhase.candidate.macros.fat ?? '—'}g
                  </p>
                  <p className="text-[12px] mt-2" style={{ color: DS.mocha, fontWeight: 500 }}>
                    {aiPhase.outcome === 'ai_fallback'
                      ? `${CONFIDENCE_BADGE.C.emoji} ${CONFIDENCE_BADGE.C.label} · 實際營養可能依產品規格有所差異`
                      : `${aiPhase.candidate.nutrition_source}`}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-[15px] leading-relaxed" style={{ color: DS.text, fontWeight: 500 }}>
                    找不到「{trimmed}」
                  </p>
                  <p className="text-[13px] mt-2 leading-relaxed" style={{ color: DS.textSecondary, fontWeight: 400 }}>
                    你可以先用估算方式記錄，我們會幫你算一個大概值。
                  </p>
                </div>
              )}
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

        {(onCreateEstimate || onCreateFreeText) && (
          <div
            className="ios-bottom-sheet__footer px-5 pt-2 pb-3 border-t"
            style={{ borderColor: 'rgba(142, 131, 120, 0.12)' }}
          >
            <button
              type="button"
              disabled={!trimmed || (aiPhase.status === 'loading' && aiPhase.query === trimmed)}
              onClick={handlePrimaryAction}
              className="w-full h-14 rounded-[22px] text-[15px] flex items-center justify-center gap-2 disabled:opacity-40 active:opacity-90"
              style={{ backgroundColor: DS.mocha, color: '#FFFFFF', fontWeight: 500 }}
            >
              <PenLine className="h-4 w-4" strokeWidth={ICON_STROKE} />
              {trimmed
                ? selectedSearchHit
                  ? `加入${targetDate === getNutritionDayKey() ? '今日' : '所選日期'}紀錄`
                  : noSearchHits && nearCandidates.length === 0 && aiPhase.status === 'loading' && aiPhase.query === trimmed
                    ? '正在查找…'
                    : noSearchHits && nearCandidates.length === 0 && aiPhase.status === 'success' && aiPhase.query === trimmed
                      ? `加入「${aiPhase.candidate.name}」`
                      : `建立「${trimmed}」`
                : '輸入菜名後建立估算餐點'}
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
    </AppOverlay>
  )
}
