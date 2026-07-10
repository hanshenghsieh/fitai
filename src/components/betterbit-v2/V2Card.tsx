'use client'

import type { ReactNode, CSSProperties } from 'react'
import { BB_V2 } from '@/lib/betterbit-v2'

interface Props {
  children: ReactNode
  className?: string
  padding?: string
  style?: CSSProperties
  onClick?: () => void
}

export default function V2Card({ children, className = '', padding = '20px', style, onClick }: Props) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`v2-card text-left w-full ${className}`}
      style={{
        background: BB_V2.bg.card,
        borderRadius: BB_V2.radius.card,
        boxShadow: BB_V2.shadow.card,
        border: `1px solid ${BB_V2.border}`,
        padding,
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}
