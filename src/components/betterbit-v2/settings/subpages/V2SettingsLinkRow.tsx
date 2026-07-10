'use client'

import { ChevronRight } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'

interface Props {
  title: string
  subtitle?: string
  onClick?: () => void
  href?: string
  danger?: boolean
  last?: boolean
}

export default function V2SettingsLinkRow({ title, subtitle, onClick, href, danger, last }: Props) {
  const Tag = href ? 'a' : 'button'
  return (
    <Tag
      {...(href ? { href } : { type: 'button' as const, onClick })}
      className="v2-settings-row w-full text-left flex items-center gap-3 min-h-[60px] touch-manipulation v2-settings-row--interactive"
      style={{
        borderBottom: last ? undefined : `1px solid ${BB_V2.divider}`,
      }}
    >
      <div className="flex-1 min-w-0 py-2">
        <p
          className="text-[15px]"
          style={{ color: danger ? '#e05252' : BB_V2.text.primary, fontWeight: 600 }}
        >
          {title}
        </p>
        {subtitle && (
          <p className="text-[12px] mt-0.5" style={{ color: BB_V2.text.secondary }}>
            {subtitle}
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0" style={{ color: BB_V2.text.muted }} />
    </Tag>
  )
}
