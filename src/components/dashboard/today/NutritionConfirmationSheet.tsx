'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, Search, FileText, Check } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { FoodLogEntry } from '@/lib/banks/types'
import type { MenuLookupHit } from '@/lib/food-menu-lookup'
import { findSimilarVerifiedItems, type ManualNutritionInput } from '@/lib/nutrition/unknown-food-flow'
import UnifiedPortionSheet from '@/components/dashboard/today/UnifiedPortionSheet'
import { hasPortionFlow, resolvePortionContextFromLog } from '@/lib/nutrition/p0-common-foods/portion-context'
import type { HomeCookedMealDraft } from '@/lib/nutrition/home-cooked'
import type { CommonFoodItem, FoodRecordDraft } from '@/lib/nutrition/p0-common-foods/types'
import AppOverlay from '@/components/ui/AppOverlay'

const font = 'var(--font-noto-tc), system-ui, sans-serif'
const ICON_STROKE = 1.8

interface Props {
  open: boolean
  log: FoodLogEntry | null
  onClose: () => void
  onConfirmVerified: (hit: MenuLookupHit) => void
  onManualSave: (logId: string, input: ManualNutritionInput) => void
  onHomeCookedSave: (logId: string, draft: HomeCookedMealDraft) => void
  onFoodRecordSave: (logId: string, item: CommonFoodItem, draft: FoodRecordDraft) => void
  onKeepTextRecord: (logId: string) => void
}

export default function NutritionConfirmationSheet({
  open,
  log,
  onClose,
  onConfirmVerified,
  onManualSave,
  onHomeCookedSave,
  onFoodRecordSave,
  onKeepTextRecord,
}: Props) {
  const [portionOpen, setPortionOpen] = useState(false)
  const [pendingHit, setPendingHit] = useState<MenuLookupHit | null>(null)

  const portionCtx = useMemo(() => (log ? resolvePortionContextFromLog(log) : null), [log])
  const canUsePortionFlow = portionCtx != null && portionCtx.kind !== 'unresolved'
  const isP0 = portionCtx?.kind === 'p0'

  const similar = useMemo(() => {
    if (!log || isP0) return []
    return findSimilarVerifiedItems(log.display_label ?? log.name, 10)
  }, [log, isP0])

  useEffect(() => {
    if (!open) {
      setPendingHit(null)
      setPortionOpen(false)
      return
    }
    if (canUsePortionFlow) {
      setPortionOpen(true)
    }
  }, [open, log?.id, canUsePortionFlow])

  if (!log) return null

  const mealLabel = log.display_label ?? log.name

  return (
    <>
      <AppOverlay open={open && !portionOpen} onClose={onClose} variant="sheet">
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
                  確認這筆紀錄
                </h2>
                <p className="text-[17px] mt-3" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
                  {mealLabel}
                </p>
                <p className="text-[13px] leading-relaxed mt-2" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
                  {isP0
                    ? '我們在通用食材庫找到這項，填份量就能估算。'
                    : canUsePortionFlow
                      ? 'Betterbit 已先幫你估一版，不確定的話直接儲存即可。'
                      : '目前沒有可信營養資料。你可以建立估算餐點，或選相近品項。'}
                </p>
              </div>
              <button type="button" onClick={onClose} className="p-1.5 -mr-1 shrink-0" aria-label="關閉">
                <X className="h-5 w-5" strokeWidth={ICON_STROKE} style={{ color: BB_V2.text.secondary }} />
              </button>
            </div>
          </div>

          <div className="ios-bottom-sheet__scroll px-5 pb-2 space-y-5">
            {pendingHit ? (
              <section className="space-y-3">
                <p className="text-[15px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
                  確定更新為這筆可信資料？
                </p>
                <div className="px-4 py-3 rounded-2xl" style={{ backgroundColor: BB_V2.bg.canvas }}>
                  <p className="text-[15px]" style={{ color: BB_V2.text.primary, fontWeight: 500 }}>
                    {pendingHit.name}
                  </p>
                  <p className="text-[13px] mt-0.5" style={{ color: BB_V2.text.secondary }}>
                    {pendingHit.store} · {pendingHit.calories} kcal · 蛋白質 {pendingHit.protein_g}g
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingHit(null)}
                    className="flex-1 h-12 rounded-[20px] text-[14px]"
                    style={{ color: BB_V2.text.secondary, fontWeight: 500, backgroundColor: BB_V2.bg.canvas }}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onConfirmVerified(pendingHit)
                      setPendingHit(null)
                      onClose()
                    }}
                    className="flex-1 h-12 rounded-[20px] text-[14px] flex items-center justify-center gap-1.5"
                    style={{ backgroundColor: BB_V2.accent.orange, color: '#FFFFFF', fontWeight: 500 }}
                  >
                    <Check className="h-4 w-4" strokeWidth={ICON_STROKE} />
                    確認更新
                  </button>
                </div>
              </section>
            ) : (
              <>
                {canUsePortionFlow && (
                  <button
                    type="button"
                    onClick={() => setPortionOpen(true)}
                    className="w-full px-4 py-3.5 rounded-2xl text-left active:opacity-90"
                    style={{ backgroundColor: BB_V2.bg.canvas, border: `1.5px solid ${BB_V2.accent.orange}` }}
                  >
                    <p className="text-[15px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
                      {isP0 ? '填份量算營養' : '快速修正份量'}
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ color: BB_V2.text.secondary }}>
                      份量、用油量、烹調方式、醬汁
                    </p>
                  </button>
                )}

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
                            onClick={() => setPendingHit(hit)}
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

                <button
                  type="button"
                  onClick={() => {
                    onKeepTextRecord(log.id)
                    onClose()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left active:opacity-90"
                  style={{ backgroundColor: BB_V2.bg.canvas }}
                >
                  <FileText className="h-4 w-4 shrink-0" strokeWidth={ICON_STROKE} style={{ color: BB_V2.text.secondary }} />
                  <div>
                    <p className="text-[15px]" style={{ color: BB_V2.text.primary, fontWeight: 500 }}>
                      先保留文字紀錄
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ color: BB_V2.text.secondary }}>
                      維持待確認，不計入今日統計
                    </p>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      </AppOverlay>

      <UnifiedPortionSheet
        open={portionOpen}
        mealLabel={mealLabel}
        log={log}
        title={isP0 ? '填份量算營養' : '修正餐點'}
        subtitle={isP0 ? undefined : 'Betterbit 已先幫你估一版，不確定的話直接儲存即可。'}
        saveLabel="儲存並計入今日"
        onClose={() => setPortionOpen(false)}
        onFoodRecordSave={(item, draft) => {
          onFoodRecordSave(log.id, item, draft)
          setPortionOpen(false)
          onClose()
        }}
        onHomeCookedSave={draft => {
          onHomeCookedSave(log.id, draft)
          setPortionOpen(false)
          onClose()
        }}
        onManualSave={input => {
          onManualSave(log.id, input)
          setPortionOpen(false)
          onClose()
        }}
      />
    </>
  )
}
