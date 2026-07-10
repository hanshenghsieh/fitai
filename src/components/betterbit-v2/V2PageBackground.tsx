'use client'

import type { ReactNode } from 'react'
import { BB_V2 } from '@/lib/betterbit-v2'

export default function V2PageBackground({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`v2-page v2-page-bg ${className}`}
      style={{
        backgroundColor: BB_V2.bg.canvas,
        backgroundImage: BB_V2.bg.gradient,
        fontFamily: BB_V2.font,
      }}
    >
      {children}
    </div>
  )
}
