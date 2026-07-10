'use client'

import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import V2Card from './V2Card'

interface Props {
  icon: ReactNode
  title: string
  subtitle: string
  onClick?: () => void
}

export default function V2FeatureRow({ icon, title, subtitle, onClick }: Props) {
  return (
    <V2Card padding="14px 16px" onClick={onClick} className="!rounded-[20px] !shadow-none">
      <div className="flex items-center gap-3">
        <div
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: BB_V2.bg.softGreen, color: BB_V2.accent.green }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[15px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
            {title}
          </p>
          <p className="text-[12px] mt-0.5 leading-snug" style={{ color: BB_V2.text.secondary }}>
            {subtitle}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0" style={{ color: BB_V2.text.muted }} />
      </div>
    </V2Card>
  )
}
