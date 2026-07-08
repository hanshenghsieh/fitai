'use client'

import { BB_V2 } from '@/lib/betterbit-v2'

interface Props {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}

export function OnboardingChip({ active, onClick, children, className = '' }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[13px] font-medium transition-colors active:opacity-90 ${className}`}
      style={{
        borderRadius: BB_V2.radius.input,
        border: `1.5px solid ${active ? BB_V2.accent.orange : BB_V2.divider}`,
        backgroundColor: active ? 'rgba(216, 154, 82, 0.12)' : BB_V2.bg.card,
        color: active ? BB_V2.text.primary : BB_V2.text.secondary,
        fontWeight: active ? 600 : 500,
      }}
    >
      {children}
    </button>
  )
}

export function OnboardingCard({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div
      className="px-4 py-4 space-y-3.5"
      style={{
        backgroundColor: BB_V2.bg.card,
        borderRadius: BB_V2.radius.card,
        boxShadow: BB_V2.shadow.card,
      }}
    >
      <div>
        <h2 className="text-[16px] font-semibold leading-snug" style={{ color: BB_V2.text.primary }}>{title}</h2>
        {desc && <p className="text-[12px] mt-1 leading-relaxed" style={{ color: BB_V2.text.secondary }}>{desc}</p>}
      </div>
      {children}
    </div>
  )
}
