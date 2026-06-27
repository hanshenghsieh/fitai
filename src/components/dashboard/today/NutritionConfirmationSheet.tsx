'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, PenLine, Search, FileText, Check } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { FoodLogEntry } from '@/lib/banks/types'
import type { MenuLookupHit } from '@/lib/food-menu-lookup'
import { findSimilarVerifiedItems, type ManualNutritionInput } from '@/lib/nutrition/unknown-food-flow'
import ManualNutritionSheet from '@/components/dashboard/today/ManualNutritionSheet'

const font = 'var(--font-noto-tc), system-ui, sans-serif'
const ICON_STROKE = 1.8

interface Props {
  open: boolean
  log: FoodLogEntry | null
  onClose: () => void
  onConfirmVerified: (hit: MenuLookupHit) => void
  onManualSave: (logId: string, input: ManualNutritionInput) => void
  onKeepTextRecord: (logId: string) => void
}

export default function NutritionConfirmationSheet({
  open,
  log,
  onClose,
  onConfirmVerified,
  onManualSave,
  onKeepTextRecord,
}: Props) {
  const [manualOpen, setManualOpen] = useState(false)
  const [pendingHit, setPendingHit] = useState<MenuLookupHit | null>(null)

  const similar = useMemo(
    () => (log ? findSimilarVerifiedItems(log.name, 10) : []),
    [log?.name, log]
  )

  useEffect(() => {
    if (!open) {
      setPendingHit(null)
      setManualOpen(false)
    }
  }, [open, log?.id])

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
                  確認這筆紀錄
                </h2>
                <p className="text-[17px] mt-3" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
                  {log.name}
                </p>
                <p className="text-[13px] leading-relaxed mt-2" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
                  目前沒有可信營養資料。
                  <br />
                  你可以選相近品項、手動輸入營養，或先保留文字紀錄。
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
                        熱量、蛋白質、脂肪、碳水
                      </p>
                    </div>
                  </button>

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
                        維持營養待確認，不計入今日統計
                      </p>
                    </div>
                  </button>
                </section>
              </>
            )}
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
    </>
  )
}
