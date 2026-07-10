'use client'

import type { ReactNode } from 'react'
import { BB_V2 } from '@/lib/betterbit-v2'

export default function V2SettingsFormCard({
  title,
  children,
}: {
  title?: string
  children: ReactNode
}) {
  return (
    <section className="v2-settings-form-card">
      {title && (
        <h2
          className="px-4 pt-4 pb-2 text-[13px] uppercase tracking-wide"
          style={{ color: BB_V2.text.muted, fontWeight: 600 }}
        >
          {title}
        </h2>
      )}
      <div className="px-4 pb-4 space-y-4">{children}</div>
    </section>
  )
}
