'use client'

import type { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  title: string
  staggerIndex?: number
  children: ReactNode
}

export default function V2SettingsVisualCard({ icon, title, staggerIndex = 0, children }: Props) {
  return (
    <section
      className="v2-sv2-card"
      style={{ animationDelay: `${staggerIndex * 40}ms` }}
    >
      <div className="v2-sv2-card-header">
        <div className="v2-sv2-card-icon">{icon}</div>
        <h2 className="v2-sv2-card-title">{title}</h2>
      </div>
      <div className="v2-sv2-card-body">{children}</div>
    </section>
  )
}
