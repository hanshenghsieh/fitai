'use client'

import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

export default function V2PageEnter({ children, className = '' }: Props) {
  return <div className={`v2-page-enter ${className}`.trim()}>{children}</div>
}
