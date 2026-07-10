'use client'

import type { ReactNode } from 'react'
import { BB_V2 } from '@/lib/betterbit-v2'

interface Props {
  children: ReactNode
  action?: ReactNode
}

export default function V2SectionTitle({ children, action }: Props) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <h2 className="text-[17px]" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
        {children}
      </h2>
      {action}
    </div>
  )
}
