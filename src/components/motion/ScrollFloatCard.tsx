'use client'

import type { ReactNode, CSSProperties } from 'react'
import { useScrollBreath } from './useScrollBreath'
import { useReveal } from './useReveal'

interface Props {
  children: ReactNode
  className?: string
  style?: CSSProperties
  depth?: 0 | 1 | 2 | 3
  staggerIndex?: number
  id?: string
}

export default function ScrollFloatCard({
  children,
  className = '',
  style,
  depth = 1,
  staggerIndex = 0,
  id,
}: Props) {
  const breath = useScrollBreath(depth)
  const reveal = useReveal(staggerIndex)

  return (
    <div
      id={id}
      ref={reveal.ref}
      className={`${reveal.className} ${className}`.trim()}
      style={{ ...style, ...reveal.style }}
    >
      <div ref={breath.ref} className="mi-scroll-float h-full" style={breath.style}>
        {children}
      </div>
    </div>
  )
}
