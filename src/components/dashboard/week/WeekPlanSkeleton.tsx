'use client'

import { BB_V2 } from '@/lib/betterbit-v2'

export default function WeekPlanSkeleton() {
  return (
    <div className="px-5 pt-12 pb-8 space-y-5 animate-pulse" style={{ fontFamily: BB_V2.font }}>
      <div className="h-8 w-20 rounded-lg" style={{ backgroundColor: BB_V2.bg.pill }} />
      <div className="h-4 w-64 rounded-lg" style={{ backgroundColor: BB_V2.bg.pill }} />
      <div className="h-24 rounded-[24px]" style={{ backgroundColor: BB_V2.bg.card }} />
      <div className="h-24 rounded-[24px]" style={{ backgroundColor: BB_V2.bg.card }} />
      <div className="h-24 rounded-[24px]" style={{ backgroundColor: BB_V2.bg.card }} />
    </div>
  )
}
