'use client'

import { useMemo, useState } from 'react'
import { X, PenLine, Search, Sparkles } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { FoodLogEntry } from '@/lib/banks/types'
import type { MenuLookupHit } from '@/lib/food-menu-lookup'
import { findSimilarVerifiedItems } from '@/lib/nutrition/unknown-food-flow'
import { NUTRITION_PENDING_LABEL } from '@/lib/nutrition/food-log-display'
import ManualNutritionSheet from '@/components/dashboard/today/ManualNutritionSheet'
import UnknownClarificationSheet from '@/components/dashboard/today/UnknownClarificationSheet'

const font = 'var(--font-noto-tc), system-ui, sans-serif'
const ICON_STROKE = 1.8

interface Props {
  open: boolean
  log: FoodLogEntry | null
  onClose: () => void
  onPickVerified: (hit: MenuLookupHit) => void
  onManualSave: (logId: string, input: import('@/lib/nutrition/unknown-food-flow').ManualNutritionInput) => void
  onClarificationResolved: (
    logId: string,
    result: import('@/lib/nutrition/unknown-food-flow').ClarificationResolveResult
  ) => void
}

export default function UnknownFoodFlowSheet({
  open,
  log,
  onClose,
  onPickVerified,
  onManualSave,
  onClarificationResolved,
}: Props) {
  const [manualOpen, setManualOpen] = useState(false)
  const [clarifyOpen, setClarifyOpen] = useState(false)

  const similar = useMemo(
    () => (log ? findSimilarVerifiedItems(log.name, 6) : []),
    [log?.name, log]
  )

  if (!open || !log) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[55] flex flex-col justify-end"
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
            backgroundColor: BB_V2.bg.card,
            borderRadius: '28px 28px 0 0',
            boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.08)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="shrink-0 px-5 pt-5 pb-3">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <h2 className="text-[20px] leading-tight" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
                  {log.name}
                </h2>
                <p className="text-[14px] mt-1" style={{ color: BB_V2.accent.orange, fontWeight: 500 }}>
                  {NUTRITION_PENDING_LABEL}
                </p>
                <p className="text-[13px] leading-relaxed mt-1" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
                  目前沒有可信營養資料。你可以選相近品項、手動輸入，或回答幾個問題幫助比對。
                </p>
              </div>
              <button type="button" onClick={onClose} className="p-1.5 -mr-1 shrink-0" aria-label="關閉">
                <X className="h-5 w-5" strokeWidth={ICON_STROKE} style={{ color: BB_V2.text.secondary }} />
              </button>
            </div>
          </div>

          <div className="ios-bottom-sheet__scroll px-5 pb-2 space-y-5">
            {similar.length > 0 && (
              <section>
                <p className="text-[13px] mb-2 flex items-center gap-1.5" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
                  <Search className="h-3.5 w-3.5" strokeWidth={ICON_STROKE} />
                  選相近品項
                </p>
                <ul className="space-y-2">
                  {similar.map(hit => (
                    <li key={hit.id}>
                      <button
                        type="button"
                        onClick={() => onPickVerified(hit)}
                        className="w-full text-left px-4 py-3 rounded-2xl active:opacity-90"
                        style={{ backgroundColor: BB_V2.bg.canvas }}
                      >
                        <p className="text-[15px]" style={{ color: BB_V2.text.primary, fontWeight: 500 }}>
                          {hit.name}
                        </p>
                        <p className="text-[13px] mt-0.5" style={{ color: BB_V2.text.secondary }}>
                          {hit.store} · {hit.calories} kcal · 蛋白質 {hit.protein_g}g
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="space-y-2">
              <button
                type="button"
                onClick={() => setManualOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left active:opacity-90"
                style={{ backgroundColor: BB_V2.bg.canvas }}
              >
                <PenLine className="h-4 w-4 shrink-0" strokeWidth={ICON_STROKE} style={{ color: BB_V2.accent.orange }} />
                <div>
                  <p className="text-[15px]" style={{ color: BB_V2.text.primary, fontWeight: 500 }}>
                    手動輸入營養
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: BB_V2.text.secondary }}>
                    自行填入熱量與巨量營養素
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setClarifyOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left active:opacity-90"
                style={{ backgroundColor: BB_V2.bg.canvas }}
              >
                <Sparkles className="h-4 w-4 shrink-0" strokeWidth={ICON_STROKE} style={{ color: BB_V2.accent.orange }} />
                <div>
                  <p className="text-[15px]" style={{ color: BB_V2.text.primary, fontWeight: 500 }}>
                    幫我判斷一下
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: BB_V2.text.secondary }}>
                    最多 3 題，僅比對可信資料庫
                  </p>
                </div>
              </button>
            </section>
          </div>

          <div className="ios-bottom-sheet__footer px-5 py-3 border-t" style={{ borderColor: 'rgba(142, 131, 120, 0.12)' }}>
            <button
              type="button"
              onClick={onClose}
              className="w-full h-12 rounded-[20px] text-[14px]"
              style={{ color: BB_V2.text.secondary, fontWeight: 500 }}
            >
              稍後再處理
            </button>
          </div>
        </div>
      </div>

      <ManualNutritionSheet
        open={manualOpen}
        foodName={log.name}
        onClose={() => setManualOpen(false)}
        onCancel={() => setManualOpen(false)}
        onSave={input => {
          onManualSave(log.id, input)
          setManualOpen(false)
          onClose()
        }}
      />

      <UnknownClarificationSheet
        open={clarifyOpen}
        foodName={log.name}
        onClose={() => setClarifyOpen(false)}
        onResolved={result => {
          onClarificationResolved(log.id, result)
          setClarifyOpen(false)
          onClose()
        }}
      />
    </>
  )
}
