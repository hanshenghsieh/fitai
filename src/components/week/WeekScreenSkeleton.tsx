'use client'

import { BB_V2 } from '@/lib/betterbit-v2'

export default function WeekScreenSkeleton() {
  return (
    <div className="px-5 pt-4 pb-8 space-y-5 animate-pulse" style={{ fontFamily: BB_V2.font }}>
      <div className="h-10 w-24 rounded-xl" style={{ backgroundColor: BB_V2.bg.pill }} />
      <div className="h-5 w-56 rounded-lg" style={{ backgroundColor: BB_V2.bg.pill }} />
      <div className="h-44 rounded-[28px]" style={{ backgroundColor: BB_V2.bg.card }} />
      <div className="h-32 rounded-[28px]" style={{ backgroundColor: BB_V2.bg.card }} />
      <div className="h-28 rounded-[28px]" style={{ backgroundColor: BB_V2.bg.card }} />
      <div className="h-36 rounded-[28px]" style={{ backgroundColor: BB_V2.bg.card }} />
    </div>
  )
}
