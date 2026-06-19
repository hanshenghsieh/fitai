'use client'

import type { ReactNode, CSSProperties } from 'react'
import { useReveal } from './useReveal'

interface Props {
  children: ReactNode
  className?: string
  style?: CSSProperties
  depth?: 0 | 1 | 2 | 3
  staggerIndex?: number
  id?: string
}

/** Phase 5.5 — fade reveal only, no scroll float */
export default function ScrollFloatCard({
  children,
  className = '',
  style,
  staggerIndex = 0,
  id,
}: Props) {
  const reveal = useReveal(staggerIndex)

  return (
    <div
      id={id}
      ref={reveal.ref}
      className={`${reveal.className} ${className}`.trim()}
      style={{ ...style, ...reveal.style }}
    >
      {children}
    </div>
  )
}
