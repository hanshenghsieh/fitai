'use client'

import { Landmark } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { CalorieBankRow } from '@/lib/banks/calorie-bank-types'
import { isRecoveryActive } from '@/lib/engines/calorie-bank-engine'
import { getRecoverySpreadHint } from '@/lib/engines/recovery-copy'

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

interface Props {
  bank: CalorieBankRow | null | undefined
}

export default function CalorieBankBanner({ bank }: Props) {
  if (!bank) return null
  const copy = getCalorieBankBannerCopy(bank)
  if (!copy) return null

  return (
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
        <p className="text-[13px]" style={{ color: BB_V2.accent.orange, fontWeight: 600 }}>
          {copy.title}
        </p>
        <p className="text-[14px] leading-snug" style={{ color: BB_V2.text.primary, fontWeight: 500 }}>
          {copy.body}
        </p>
        <p className="text-[12px] leading-relaxed" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
          {copy.subtext}
        </p>
      </div>
    </div>
  )
}
