'use client'

import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'

interface Props {
  icon: ReactNode
  title: string
  subtitle: string
  value?: string
  onClick?: () => void
  trailing?: ReactNode
  last?: boolean
}

export default function V2SettingsRow({
  icon,
  title,
  subtitle,
  value,
  onClick,
  trailing,
  last,
}: Props) {
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`v2-settings-row w-full text-left flex items-center gap-3 px-4 min-h-[76px] touch-manipulation ${onClick ? 'v2-settings-row--interactive' : ''}`}
      style={{
        borderBottom: last ? undefined : `1px solid ${BB_V2.divider}`,
      }}
    >
      <div
        className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center"
        style={{ backgroundColor: BB_V2.bg.softGreen, color: BB_V2.accent.green }}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0 py-3">
        <p className="text-[15px] leading-snug" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
          {title}
        </p>
        <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: BB_V2.text.secondary }}>
          {subtitle}
        </p>
      </div>

      {value && (
        <span className="text-[13px] shrink-0 mr-0.5" style={{ color: BB_V2.text.secondary }}>
          {value}
        </span>
      )}

      {trailing}

      {onClick && !trailing && (
        <ChevronRight className="h-4 w-4 shrink-0 v2-settings-chevron" style={{ color: BB_V2.text.muted }} />
      )}
    </Tag>
  )
}
