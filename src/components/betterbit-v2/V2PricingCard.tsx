'use client'

import { Check } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'

interface Props {
  title: string
  price: string
  subtext?: string
  subtextLines?: string[]
  savingsHighlight?: string
  badge?: string
  selected?: boolean
  onSelect?: () => void
}

export default function V2PricingCard({
  title,
  price,
  subtext,
  subtextLines,
  savingsHighlight,
  badge,
  selected,
  onSelect,
}: Props) {
  const lines = subtextLines ?? (subtext ? [subtext] : [])

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex-1 min-w-0 p-4 text-left rounded-[24px] touch-manipulation v2-pricing-card ${selected ? 'v2-pricing-card--selected' : ''}`}
      style={{
        background: BB_V2.bg.card,
        border: `2px solid ${selected ? BB_V2.accent.green : BB_V2.border}`,
        boxShadow: selected ? BB_V2.shadow.soft : 'none',
      }}
    >
      {badge && (
        <span
          className="absolute -top-2 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ backgroundColor: BB_V2.accent.green, color: '#fff' }}
        >
          {badge}
        </span>
      )}
      {selected && (
        <Check
          className="absolute top-3 right-3 h-5 w-5 v2-pricing-check"
          strokeWidth={2.5}
          style={{ color: BB_V2.accent.green }}
        />
      )}
      <p className="text-[14px]" style={{ color: BB_V2.text.secondary }}>
        {title}
      </p>
      <p className="text-[22px] mt-1 tabular-nums leading-tight" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
        {price}
      </p>
      {lines.map((line, i) => (
        <p
          key={line}
          className="text-[12px] mt-1 leading-snug"
          style={{
            color: savingsHighlight && i === lines.length - 1 ? BB_V2.accent.green : BB_V2.text.secondary,
            fontWeight: savingsHighlight && i === lines.length - 1 ? 600 : 400,
          }}
        >
          {line}
        </p>
      ))}
    </button>
  )
}
