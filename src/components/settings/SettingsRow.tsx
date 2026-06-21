'use client'

import { ChevronRight } from 'lucide-react'
import { colors } from '@/lib/design-system'

interface Props {
  label: string
  value?: string
  detail?: string
  onClick?: () => void
  trailing?: React.ReactNode
  last?: boolean
}

export default function SettingsRow({ label, value, detail, onClick, trailing, last }: Props) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 flex items-center gap-3 ${!last ? 'border-b' : ''}`}
      style={{ borderColor: colors.border.subtle }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[15px]" style={{ color: colors.text.primary }}>
          {label}
        </p>
        {detail && (
          <p className="text-[13px] mt-0.5 leading-relaxed" style={{ color: colors.text.tertiary }}>
            {detail}
          </p>
        )}
      </div>
      {value && (
        <span className="text-[14px] shrink-0 tabular-nums" style={{ color: colors.text.secondary }}>
          {value}
        </span>
      )}
      {trailing}
      {onClick && !trailing && (
        <ChevronRight className="h-4 w-4 shrink-0" style={{ color: colors.text.tertiary }} />
      )}
    </Tag>
  )
}
