'use client'

import { BB_V2 } from '@/lib/betterbit-v2'
import type { MealTrustTone } from '@/lib/nutrition/meal-trust-display'

const toneStyles: Record<MealTrustTone, { bg: string; color: string }> = {
  pending: { bg: 'rgba(232, 146, 74, 0.12)', color: BB_V2.accent.orange },
  official: { bg: 'rgba(118, 182, 154, 0.14)', color: BB_V2.macro.protein },
  manual: { bg: BB_V2.bg.pill, color: BB_V2.text.secondary },
  estimate: { bg: BB_V2.bg.surface, color: BB_V2.text.secondary },
  neutral: { bg: BB_V2.bg.pill, color: BB_V2.text.secondary },
}

interface Props {
  label: string
  tone?: MealTrustTone
  className?: string
}

export default function MealStatusBadge({ label, tone = 'neutral', className = '' }: Props) {
  const style = toneStyles[tone]
  return (
    <span
      className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full shrink-0 ${className}`}
      style={{ backgroundColor: style.bg, color: style.color, fontWeight: 600 }}
    >
      {label}
    </span>
  )
}
