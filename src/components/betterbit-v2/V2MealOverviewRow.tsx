'use client'

import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'

interface Props {
  icon: ReactNode
  title: string
  subtitle?: string
  kcal?: number
  onClick?: () => void
}

export default function V2MealOverviewRow({ icon, title, subtitle, kcal, onClick }: Props) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3.5 text-left touch-manipulation"
      style={{ borderBottom: `1px solid ${BB_V2.divider}` }}
    >
      <div
        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: BB_V2.bg.softGreen, color: BB_V2.accent.green }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
          {title}
        </p>
        <p className="text-[13px] truncate mt-0.5" style={{ color: BB_V2.text.secondary }}>
          {subtitle || '還沒記錄'}
        </p>
      </div>
      {kcal != null && kcal > 0 && (
        <span className="text-[14px] tabular-nums shrink-0" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
          {Math.round(kcal).toLocaleString()}
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={BB_V2.iconStroke} style={{ color: BB_V2.text.muted }} />
    </Tag>
  )
}
