'use client'

import type { ReactNode } from 'react'
import { BB_V2 } from '@/lib/betterbit-v2'

interface Props {
  icon?: ReactNode
  title?: string
  children: ReactNode
}

export default function V2CoachNote({ icon, title, children }: Props) {
  return (
    <div className="v2-coach-note px-4 py-3.5 flex gap-3 items-start">
      {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
      <div className="min-w-0 flex-1">
        {title && (
          <p className="text-[14px] mb-1" style={{ color: BB_V2.text.deepGreen, fontWeight: 600 }}>
            {title}
          </p>
        )}
        <p className="text-[13px] leading-relaxed" style={{ color: BB_V2.text.secondary }}>
          {children}
        </p>
      </div>
    </div>
  )
}
