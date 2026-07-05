'use client'

import { useState } from 'react'
import { HelpCircle, Landmark, X } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { CalorieBankRow } from '@/lib/banks/calorie-bank-types'
import { isRecoveryActive } from '@/lib/engines/calorie-bank-engine'
import { buildCalorieBankExplainer } from '@/lib/engines/calorie-bank-explainer'
import { getRecoverySpreadHint } from '@/lib/engines/recovery-copy'
import AppOverlay from '@/components/ui/AppOverlay'

export function getCalorieBankBannerCopy(
  bank: CalorieBankRow
): { title: string; body: string; subtext: string } | null {
  const normal = bank.daily_target_kcal
  const adjusted = bank.internal_target_kcal
  if (!Number.isFinite(normal) || !Number.isFinite(adjusted) || normal <= 0) return null

  const diff = adjusted - normal
  const recovery = isRecoveryActive(bank)
  if (diff === 0 && !recovery) return null

  const title = '已啟用熱量銀行'

  if (diff > 0) {
    return {
      title,
      body: `今天目標已微調為 ${adjusted.toLocaleString()} kcal（原 ${normal.toLocaleString()}）`,
      subtext: `昨天少吃了 ${Math.abs(diff).toLocaleString()} kcal，BetterBit 幫你把熱量分散回補`,
    }
  }

  if (diff < 0) {
    const hint = getRecoverySpreadHint(bank.spread_days_remaining)
    return {
      title,
      body: `今天目標為 ${adjusted.toLocaleString()} kcal（原 ${normal.toLocaleString()}）`,
      subtext: hint || '不用重來，BetterBit 幫你把熱量分散平衡',
    }
  }

  const hint = getRecoverySpreadHint(bank.spread_days_remaining)
  if (!hint) return null
  return {
    title,
    body: `今日目標 ${normal.toLocaleString()} kcal`,
    subtext: hint,
  }
}

function CalorieBankExplainSheet({
  bank,
  open,
  onClose,
}: {
  bank: CalorieBankRow
  open: boolean
  onClose: () => void
}) {
  const detail = buildCalorieBankExplainer(bank)

  return (
    <AppOverlay open={open} onClose={onClose} variant="sheet">
      <div
        className="ios-bottom-sheet max-w-[640px] mx-auto w-full"
        style={{
          fontFamily: BB_V2.font,
          backgroundColor: BB_V2.bg.card,
          borderRadius: `${BB_V2.radius.sheet}px ${BB_V2.radius.sheet}px 0 0`,
          boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[18px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
              熱量銀行
            </p>
            <p className="text-[13px]" style={{ color: BB_V2.text.secondary }}>
              自動平衡，不用重來
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="p-2 -mr-1 rounded-full"
            style={{ color: BB_V2.text.secondary }}
          >
            <X className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />
          </button>
        </div>

        <div className="px-5 pb-8 space-y-5">
          <p className="text-[14px] leading-relaxed" style={{ color: BB_V2.text.secondary }}>
            {detail.intro}
          </p>

          <div
            className="p-4 rounded-[16px] space-y-2"
            style={{ backgroundColor: BB_V2.bg.surface, border: `1px solid ${BB_V2.divider}` }}
          >
            <p className="text-[13px]" style={{ color: BB_V2.accent.orange, fontWeight: 600 }}>
              {detail.reasonTitle}
            </p>
            <p className="text-[14px] leading-relaxed" style={{ color: BB_V2.text.primary, fontWeight: 500 }}>
              {detail.reasonBody}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[13px]" style={{ color: BB_V2.text.secondary, fontWeight: 600 }}>
              目前狀態
            </p>
            <div
              className="rounded-[16px] overflow-hidden"
              style={{ border: `1px solid ${BB_V2.divider}` }}
            >
              {detail.statusLines.map((line, i) => (
                <div
                  key={line.label}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                  style={{
                    backgroundColor: BB_V2.bg.surface,
                    borderTop: i > 0 ? `1px solid ${BB_V2.divider}` : undefined,
                  }}
                >
                  <span className="text-[14px]" style={{ color: BB_V2.text.secondary }}>
                    {line.label}
                  </span>
                  <span className="text-[14px] tabular-nums" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
                    {line.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 rounded-full text-[15px]"
            style={{ backgroundColor: BB_V2.accent.orange, color: '#FFFFFF', fontWeight: 600 }}
          >
            了解了
          </button>
        </div>
      </div>
    </AppOverlay>
  )
}

interface Props {
  bank: CalorieBankRow | null | undefined
}

export default function CalorieBankBanner({ bank }: Props) {
  const [explainOpen, setExplainOpen] = useState(false)

  if (!bank) return null
  const copy = getCalorieBankBannerCopy(bank)
  if (!copy) return null

  return (
    <>
      <div
        className="flex gap-3 p-4 rounded-[20px]"
        style={{
          backgroundColor: BB_V2.bg.surface,
          border: `1px solid ${BB_V2.divider}`,
        }}
      >
        <span
          className="flex items-center justify-center shrink-0 mt-0.5"
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: BB_V2.bg.pill,
            color: BB_V2.accent.orange,
          }}
        >
          <Landmark className="h-4 w-4" strokeWidth={BB_V2.iconStroke} />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px]" style={{ color: BB_V2.accent.orange, fontWeight: 600 }}>
              {copy.title}
            </p>
            <button
              type="button"
              onClick={() => setExplainOpen(true)}
              aria-label="了解熱量銀行"
              className="p-1 -mr-1 rounded-full shrink-0"
              style={{ color: BB_V2.text.secondary }}
            >
              <HelpCircle className="h-4 w-4" strokeWidth={BB_V2.iconStroke} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setExplainOpen(true)}
            className="w-full text-left space-y-1"
          >
            <p className="text-[14px] leading-snug" style={{ color: BB_V2.text.primary, fontWeight: 500 }}>
              {copy.body}
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
              {copy.subtext}
              <span className="ml-1" style={{ color: BB_V2.accent.orange }}>
                了解更多
              </span>
            </p>
          </button>
        </div>
      </div>

      <CalorieBankExplainSheet bank={bank} open={explainOpen} onClose={() => setExplainOpen(false)} />
    </>
  )
}
