'use client'

import type { ReactNode } from 'react'
import { BB_V2 } from '@/lib/betterbit-v2'

interface Props {
  title: string
  children: ReactNode
  className?: string
  staggerIndex?: number
}

export default function V2SettingsSection({ title, children, className = '', staggerIndex = 0 }: Props) {
  return (
    <section
      className={`v2-settings-stagger ${className}`.trim()}
      style={{ animationDelay: `${staggerIndex * 40}ms` }}
    >
      <h2
        className="text-[13px] mb-2.5 px-1"
        style={{ color: BB_V2.text.secondary, fontWeight: 600 }}
      >
        {title}
      </h2>
      <div className="v2-settings-card">{children}</div>
    </section>
  )
}
