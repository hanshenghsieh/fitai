'use client'

import type { CSSProperties, ReactNode } from 'react'

interface Props {
  open: boolean
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export default function ExpandPanel({ open, children, className = '', style }: Props) {
  return (
    <div className="mi-expand-grid" data-open={open ? 'true' : 'false'}>
      <div className="mi-expand-grid__inner">
        <div
          className={`mi-expand-grid__content ${className}`.trim()}
          style={style}
          aria-hidden={!open}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
