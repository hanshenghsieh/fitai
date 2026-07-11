'use client'

import type { ReactNode } from 'react'
import V2PageBackground from './V2PageBackground'
import V2Header from './V2Header'

/** Shell wrapper for week / progress analytics pages */
export default function WeeklyProgressV2View({
  children,
  title = 'Betterbit',
}: {
  children: ReactNode
  title?: string
}) {
  return (
    <V2PageBackground>
      <V2Header title={title} />
      <div className="max-w-[640px] mx-auto pb-6" style={{ paddingLeft: 18, paddingRight: 18 }}>
        {children}
      </div>
    </V2PageBackground>
  )
}
