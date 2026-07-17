'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, Heart, Landmark } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { CalorieBankRow } from '@/lib/banks/calorie-bank-types'
import {
  DEFAULT_CALORIE_FLOOR_FEMALE,
  type DailyExcessDriver,
} from '@/lib/engines/calorie-bank-engine'
import {
  defaultSpreadDays,
  getDetailCtaLabel,
  getDetailHeroCopy,
  getTodayExcessKcal,
  previewSpreadDays,
  SPREAD_DAY_OPTIONS,
  type CalorieBankMiniState,
  type SpreadDayOption,
} from '@/lib/calorie-bank-v2-ui'
import AppOverlay from '@/components/ui/AppOverlay'
import V2Header from './V2Header'
import V2Card from './V2Card'
import V2PrimaryButton from './V2PrimaryButton'

interface Props {
  bank: CalorieBankRow
  excessDriver?: DailyExcessDriver | null
  miniState: CalorieBankMiniState
  calorieFloor?: number
  open: boolean
  onClose: () => void
  onSavePlan?: (spreadDays: SpreadDayOption) => Promise<boolean>
}

export default function CalorieBankDetailView({
  bank,
  miniState,
  calorieFloor = DEFAULT_CALORIE_FLOOR_FEMALE,
  open,
  onClose,
  onSavePlan,
}: Props) {
  const suggested = defaultSpreadDays(bank)
  const [spreadDays, setSpreadDays] = useState<SpreadDayOption>(suggested)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setSpreadDays(defaultSpreadDays(bank))
      setSaveError(null)
    }
  }, [open, bank])

  const todayExcess = getTodayExcessKcal(bank)
  const heroCopy = getDetailHeroCopy(bank, miniState)
  const dayRows = useMemo(
    () => previewSpreadDays(bank, spreadDays, calorieFloor),
    [bank, spreadDays, calorieFloor]
  )

  return (
    <AppOverlay open={open} onClose={onClose} variant="fullscreen" ariaLabel="Calorie Bank">
      <div
        className="v2-calorie-bank-detail app-fullscreen-safe-shell h-full overflow-y-auto"
        style={{
          backgroundColor: BB_V2.bg.canvas,
          backgroundImage: BB_V2.bg.gradient,
          fontFamily: BB_V2.font,
        }}
      >
        <V2Header
          title="Betterbit"
          variant="back"
          onBack={onClose}
          hideRight
        />

        <div
          className="max-w-[640px] mx-auto pb-[max(28px,var(--app-safe-bottom,0px))] space-y-5"
          style={{ paddingLeft: BB_V2.pagePadding, paddingRight: BB_V2.pagePadding }}
        >
          <div className="text-center pt-2 pb-1">
            <div className="relative inline-flex items-center justify-center mb-4">
              <div
                className="w-[72px] h-[72px] rounded-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(145deg, ${BB_V2.accent.green} 0%, #3d8f42 100%)`,
                  boxShadow: '0 8px 24px rgba(47, 143, 53, 0.22)',
                }}
              >
                <Landmark className="h-8 w-8 text-white" strokeWidth={BB_V2.iconStroke} />
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white"
                style={{ backgroundColor: BB_V2.accent.green }}
              >
                <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
              </div>
            </div>

            <h2 className="text-[24px]" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
              Calorie Bank
            </h2>
            <p className="text-[14px] mt-3 leading-relaxed px-2" style={{ color: BB_V2.text.secondary }}>
              {heroCopy}
            </p>
          </div>

          <V2Card padding="18px 16px">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[13px]" style={{ color: BB_V2.text.secondary }}>
                  今天已超標
                </p>
                <p className="text-[28px] tabular-nums mt-1" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
                  {Math.round(todayExcess).toLocaleString()}{' '}
                  <span className="text-[14px] font-normal" style={{ color: BB_V2.text.secondary }}>
                    kcal
                  </span>
                </p>
              </div>

              <ArrowRight className="h-5 w-5 shrink-0" style={{ color: BB_V2.accent.green }} />

              <div className="flex-1 min-w-0 text-right">
                <p className="text-[13px]" style={{ color: BB_V2.text.secondary }}>
                  將分攤到未來
                </p>
                <p className="text-[28px] tabular-nums mt-1" style={{ color: BB_V2.accent.green, fontWeight: 700 }}>
                  {spreadDays}{' '}
                  <span className="text-[14px] font-normal" style={{ color: BB_V2.text.secondary }}>
                    天
                  </span>
                </p>
              </div>
            </div>
          </V2Card>

          <div>
            <div className="flex items-baseline justify-between gap-2 mb-2 px-1">
              <p className="text-[15px]" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
                選擇分攤天數
              </p>
            </div>
            <p className="text-[12px] mb-3 px-1" style={{ color: BB_V2.text.secondary }}>
              建議 3~5 天，讓影響最小、效果最佳
            </p>
            <div className="flex gap-2">
              {SPREAD_DAY_OPTIONS.map(days => {
                const active = spreadDays === days
                return (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setSpreadDays(days)}
                    className={`v2-spread-pill flex-1 relative py-3 rounded-2xl text-[15px] touch-manipulation ${active ? 'v2-spread-pill--active' : ''}`}
                    style={{
                      backgroundColor: active ? BB_V2.bg.softGreen : BB_V2.bg.card,
                      border: `1.5px solid ${active ? BB_V2.accent.green : BB_V2.border}`,
                      color: active ? BB_V2.text.deepGreen : BB_V2.text.secondary,
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {active && (
                      <Check
                        className="absolute top-2 right-2 h-3.5 w-3.5 v2-spread-check"
                        strokeWidth={2.5}
                        style={{ color: BB_V2.accent.green }}
                      />
                    )}
                    {days} 天
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-3 px-1">
              <p className="text-[15px]" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
                分攤後的每日預算變化
              </p>
              <span className="text-[12px]" style={{ color: BB_V2.text.muted }}>
                單位：kcal
              </span>
            </div>

            <V2Card padding="0 16px">
              {dayRows.map((row, index) => (
                <div
                  key={row.dateLabel}
                  className="py-4 flex items-center gap-3 v2-spread-row"
                  style={{
                    borderBottom: index < dayRows.length - 1 ? `1px solid ${BB_V2.divider}` : undefined,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
                      {row.dateLabel}
                    </p>
                    <p className="text-[12px] mt-1" style={{ color: BB_V2.text.secondary }}>
                      原預算 {Math.round(row.originalKcal).toLocaleString()}
                    </p>
                    <p
                      className="text-[12px] mt-0.5 tabular-nums v2-spread-adjust"
                      style={{
                        color: row.adjustKcal < 0 ? '#E07A52' : BB_V2.accent.green,
                        fontWeight: 600,
                      }}
                    >
                      調整後 {row.adjustKcal > 0 ? '+' : ''}
                      {Math.round(row.adjustKcal).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-[22px] tabular-nums shrink-0" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
                    {Math.round(row.targetKcal).toLocaleString()}
                  </p>
                </div>
              ))}
            </V2Card>
          </div>

          <div
            className="flex items-start gap-3 p-4 rounded-[22px]"
            style={{ backgroundColor: BB_V2.bg.softGreen, border: `1px solid ${BB_V2.accent.greenSoftBorder}` }}
          >
            <div
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#fff', color: BB_V2.accent.green }}
            >
              <Heart className="h-4 w-4" fill="currentColor" strokeWidth={0} />
            </div>
            <p className="text-[13px] leading-relaxed" style={{ color: BB_V2.text.secondary }}>
              你已經做得很好了！
              <br />
              一次的放縱，不會影響你的努力。
              <br />
              我們會一直陪你穩定前進 💚
            </p>
          </div>

          {saveError ? (
            <p className="text-[13px] text-center" role="alert" style={{ color: '#B45309' }}>
              {saveError}
            </p>
          ) : null}
          <V2PrimaryButton
            disabled={saving}
            onClick={async () => {
              if (!onSavePlan) {
                onClose()
                return
              }
              setSaving(true)
              setSaveError(null)
              const saved = await onSavePlan(spreadDays).catch(() => false)
              setSaving(false)
              if (saved) onClose()
              else setSaveError('分攤設定暫時無法儲存，請再試一次。')
            }}
          >
            {saving ? '儲存中…' : getDetailCtaLabel(bank)}
          </V2PrimaryButton>
        </div>
      </div>
    </AppOverlay>
  )
}
