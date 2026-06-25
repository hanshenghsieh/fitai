'use client'

import type { CSSProperties, ReactNode } from 'react'
import { BB_V2 } from '@/lib/betterbit-v2'

interface BBCardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  padding?: number | string
  onClick?: () => void
}

/** Unified BetterBit card — white, 28px radius, soft shadow, 24px padding */
export default function BBCard({
  children,
  className = '',
  style,
  padding = 24,
  onClick,
}: BBCardProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full text-left ${className}`}
      style={{
        backgroundColor: BB_V2.bg.card,
        borderRadius: BB_V2.radius.card,
        boxShadow: BB_V2.shadow.card,
        padding,
        fontFamily: BB_V2.font,
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}
