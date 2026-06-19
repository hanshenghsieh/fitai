'use client'

import { colors } from '@/lib/design-system'

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
      className={`rounded-xl border text-sm font-medium transition-colors ${className}`}
      style={{
        borderColor: active ? colors.accent.action : colors.border.subtle,
        backgroundColor: active ? colors.accent.actionSoft : colors.bg.elevated,
        color: active ? colors.text.primary : colors.text.secondary,
      }}
    >
      {children}
    </button>
  )
}

export function OnboardingCard({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ backgroundColor: colors.bg.elevated, border: `1px solid ${colors.border.subtle}` }}
    >
      <div>
        <h2 className="text-[17px] font-semibold" style={{ color: colors.text.primary }}>{title}</h2>
        {desc && <p className="text-[13px] mt-1" style={{ color: colors.text.secondary }}>{desc}</p>}
      </div>
      {children}
    </div>
  )
}
